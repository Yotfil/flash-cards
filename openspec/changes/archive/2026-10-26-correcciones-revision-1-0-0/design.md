# Design

## Context

Ver `proposal.md` (Why). Este change acompaña a la rama `fix/revision-1.0.0`, que implementa el plan de correcciones
de la revisión adversarial en el orden que aceptó el usuario. Aquí se diseñan solo los pasos que llevan delta de spec:
el 1 (ajustes), el 2 (acceso con Google), el 5 (huérfanas: borrar, Hoy, crear y exportar) y el 10 (orden de las
nuevas). Los demás pasos se arreglan contra la spec vigente y no aparecen en este documento.

Estado de partida, leído en el código:

- El perfil se guarda entero (`setDoc` sin `merge`) a partir del modelo que la frontera recorta: lo que el esquema de
  esta versión no conoce se pierde al guardar cualquier ajuste. La sesión fusiona el cambio sobre la copia del usuario
  que tenía **antes** del guardado.
- Al entrar con Google, la sesión borra del proveedor cualquier identidad que no esté en la lista; el adaptador
  ignora si la cuenta es nueva, dato que Firebase entrega en el resultado de la ventana emergente.
- El armado de la cola (puro) deja pasar sin tope las vencidas de un libro que no está en la lista (`!book → true`) y
  ya excluye las nuevas de ese libro.
- Borrar un capítulo o un libro lee lo que va a borrar con la lectura normal, que sin red (o con la red caída sin
  aviso) responde con la caché, que puede ser parcial.
- Crear tarjetas en lote (`createMany`, reemplazar un capítulo, importar un libro) pone a todas la misma fecha de
  creación; la cola desempata las nuevas solo por esa fecha y, con empate, manda el orden en que llegan del almacén.
- El paquete de exportación filtra las tarjetas por los capítulos que existen: las que perdieron su capítulo no salen.

## Goals / Non-Goals

**Goals:**

- Cada arreglo con su prueba de regresión, sacada de la sonda de la revisión (ver "Plan de pruebas").
- Ningún cambio de forma en los datos: sin campos nuevos, sin migraciones, compatibles con la 0.1.1 y la 1.1.0.

**Non-Goals:**

- Recolocar o borrar las huérfanas que ya existan.
- Recuperar el orden del archivo de lo importado antes de la rama.

## Decisions

### 1. Ajustes: escritura parcial en el puerto del perfil (paso 1)

El puerto del perfil gana una escritura parcial de ajustes: recibe el `uid` y los ajustes cambiados, y el adaptador
escribe solo esas rutas (`settings.<campo>`) con `updateDoc`. Crear el perfil sigue escribiendo el documento entero
(es el único camino de creación). La sesión, al terminar el guardado, aplica el cambio sobre el usuario **vigente**
(si sigue siendo el mismo), no sobre la copia de antes.

- *Alternativa descartada:* `setDoc` con `merge: true` del perfil entero. Conserva lo desconocido, pero sigue
  reescribiendo los ajustes conocidos con la copia vieja, así que dos ajustes seguidos se pisan (AJ-01b).
- *Alternativa descartada:* una transacción que relea el perfil. Exige red (los ajustes hoy se guardan sin ella en la
  caché) y no aporta nada frente a escribir solo lo que cambió.
- Capas: puerto (dominio) + adaptador (infraestructura) + servicio de sesión. El fake en memoria gana la misma
  operación, con su registro de escrituras y su fallo simulado.

### 2. Google: solo se borra la identidad recién creada (paso 2)

Entrar con Google devuelve, además de abrir la ventana, si el proveedor acaba de crear la cuenta (en Firebase,
`getAdditionalUserInfo(resultado).isNewUser`; si no lo sabe, "no es nueva"). La sesión guarda la promesa de esa
ventana y, cuando el observador avisa una identidad fuera de la lista que llegó por esa ventana, espera la respuesta:
solo si es nueva la borra. Tras esa espera vuelve a comprobar que la identidad sigue siendo la vigente (la generación
del observador) antes de borrar: borrar la cuenta equivocada sería irreparable.

- *Por qué esperar la promesa:* el observador puede avisar antes de que la ventana resuelva; el dato llega por la
  ventana, no por la identidad.
- *Alternativa descartada:* comparar las fechas de creación y del último acceso de la identidad. Es una heurística; el
  resultado de la ventana lo dice sin adivinar.
- Si la ventana falla después de que el observador avisara, la identidad se conserva (ante la duda, no se borra).

### 3. Huérfanas (paso 5)

- **Borrar lee del servidor.** El borrado del capítulo y el del libro leen lo que van a borrar con la lectura del
  servidor (la misma que ya usa la exportación). Sin red de verdad, fallan y el diálogo muestra su error de siempre;
  reintentar con red termina el trabajo. No cambia la spec: ya pide que el borrado no deje tarjetas.
- **Hoy deja fuera las de un libro inexistente.** El armado puro trata igual vencidas y nuevas: si el libro no está en
  la lista, no entran. El aviso en el registro no puede ir en una función pura ni en un `computed`: lo hace el servicio
  de la cola **al leer** (cuenta las candidatas cuyo libro no está en la lista y, si hay alguna, `logger.warn` con el
  número), una vez por lectura.
- **Crear en un capítulo comprueba que existe.** Cada lote que crea tarjetas en un capítulo que ya existe ("Nueva
  tarjeta", "Importar tarjetas", el reemplazo) lleva un `update` del capítulo (`updatedAt`): si el capítulo ya no
  existe, el lote entero falla (NOT_FOUND) y no queda ninguna tarjeta suelta. El escritor con contador gana una
  operación "en cada lote" y reduce el tamaño del grupo en uno para no pasar de 450 escrituras por lote (si no, el
  escritor partiría el lote y dejaría de ser atómico). Importar un libro nuevo no la necesita: crea sus capítulos en
  los mismos lotes. `updatedAt` ya está en el esquema del capítulo y su único uso es informativo.
- **Exportar no pierde las huérfanas.** El paquete añade, al final, un capítulo "Sin capítulo" con las tarjetas cuyo
  capítulo no está en la lista (en el orden del listado). El resumen sale del paquete, así que las cuenta solo.

### 4. Orden de las nuevas (paso 10)

- **Desde ahora:** al crear en lote, la tarjeta `i` lleva como fecha de creación `ahora + i` milisegundos, en el
  orden de la lista recibida (el del archivo). Vale para el repositorio de tarjetas (crear varias y reemplazar) y para
  la importación de un libro (un contador que recorre los capítulos en orden). Se escalona también `updatedAt`, para
  que una tarjeta recién creada tenga las dos fechas iguales, como antes.
- **Lo ya creado:** a igual fecha de creación, la cola desempata por capítulo (identificador), luego anverso
  normalizado, reverso normalizado e identificador. Es estable y pone juntas las de un mismo capítulo.
- *Alternativa descartada:* desempatar por el **orden** del capítulo dentro del libro (lo que proponía el plan). La
  tarjeta no guarda ese orden: habría que leer todos los capítulos de la cuenta en cada entrada a Hoy y a Progreso,
  una lectura más que el presupuesto de Progreso no contempla, solo para datos de versiones anteriores. Con el
  identificador del capítulo los grupos salen en un orden fijo pero arbitrario; se acepta porque lo importado desde
  esta rama ya sigue el orden del archivo.

### 5. Condicionales aprobados (paso 12)

- **EX-02:** el diálogo calcula sus acciones una vez (como ya hacía con "puede compartir"): principal "Compartir" o
  "Descargar .txt"; si la principal es compartir, "Descargar .txt" se suma a las secundarias, junto a "Copiar texto".
  Mismo servicio de entrega (`deliver(…, 'download')`), sin capas nuevas. El error de copiar pasa a "No se pudo copiar.
  Usa «Descargar .txt».", que siempre es cierto.
- **F-01:** un servicio mínimo de aviso (capa de servicios, solo una señal "visible" con `report` y `dismiss`) que el
  manejador global activa al registrar el error, y un componente que lo pinta, alojado en el componente raíz (no en el
  caparazón: así también se ve en Repaso y Práctica). Superficie sólida (no acrílico: puede quedar sobre la
  navegación o sobre algo que anima), `role="alert"`, botón "Cerrar aviso". No se duplica con los avisos de cada
  pantalla por construcción: lo que una pantalla captura no llega al manejador global.
  - *Alternativa descartada:* que el aviso se cierre solo a los segundos. Un aviso que desaparece solo puede no leerse
    (accesibilidad); como no se apila, quedarse hasta cerrarlo no molesta.
- **P-03:** un SVG con la paleta (acento azul eléctrico sobre el azul noche) del que salen el favicon y los PNG. Se
  enseña al usuario antes de sustituir los archivos.

## Risks / Trade-offs

- [Escritura parcial con un ajuste que no existe en el documento] → `updateDoc` crea la ruta: es justo lo que necesita
  un perfil de la 0.1.1 al que le falta un ajuste nuevo.
- [Borrar con la red caída sin aviso tarda en fallar] → la lectura del servidor espera a que el SDK dé la red por
  perdida; mientras tanto el diálogo sigue en "Borrando…". Mejor que borrar a medias. L-02 (después del 1.0.0) trata
  las esperas largas.
- [Una escritura más por lote al crear en un capítulo] → coste despreciable (un lote cada 447 tarjetas).
- [Fechas de creación en el futuro] → como mucho unos segundos en un libro de miles de tarjetas; nada compara esa
  fecha con el reloj.
- [El "Sin capítulo" choca con un capítulo que se llame igual] → al importar salen dos capítulos con ese nombre; no se
  pierde nada.

## Migration Plan

Sin migración de datos. Las reglas de seguridad no cambian. El despliegue es el del release 1.0.0.

## Plan de pruebas

| Escenario (spec) o sonda | Prueba | Capa |
| --- | --- | --- |
| Ajustes · "Un ajuste que esta versión no conoce sobrevive" (sonda AJ-01) | `tests/firestore/user.repository.integration.spec.ts`: perfil con `promptTemplate` y `practicePackageCapacity`; guardar el tema; los dos siguen | integración con emulador |
| Ajustes · "Cambiar un ajuste no toca los otros" | misma suite: guardar `defaultNewCardsPerDay` no toca el resto de ajustes ni del perfil; `session.service.spec.ts`: la sesión fusiona solo ese ajuste | integración + unitaria |
| Ajustes · "Dos ajustes seguidos se guardan los dos" (sonda AJ-01b) | `session.service.spec.ts`: tema y sugerencia seguidos; el perfil guardado y el de la sesión tienen los dos | unitaria pura (fakes) |
| Ajustes · "La sesión refleja el cambio al instante" | pruebas existentes de `session.service.spec.ts`, adaptadas a la escritura parcial | unitaria pura |
| Acceso · "Cuenta de Google que ya existía y salió de la lista" (sonda A-01) | `session.service.spec.ts`: cuenta con perfil, sale de la lista, vuelve con Google (no nueva) → sin acceso y 0 borrados | unitaria pura (fakes) |
| Acceso · "Google no autorizado" (cuenta nueva) | prueba existente de `session.service.spec.ts`, con la ventana diciendo "nueva" | unitaria pura (fakes) |
| Acceso · la identidad cambia mientras se espera la ventana | `session.service.spec.ts`: no se borra la identidad que avisó después | unitaria pura (fakes) |
| Cola · "Tarjetas de un libro que ya no existe" | `build-daily-queue.spec.ts` (vencidas y nueva fuera, sin fila); `daily-queue.service.spec.ts` (aviso con el número) | unitaria pura |
| Cola · "Las nuevas de un libro importado salen en el orden del archivo" (sonda CD-02) | `card.repository.integration.spec.ts`: 30 creadas juntas, las 20 primeras en orden; `import.repository.integration.spec.ts`: fechas crecientes en el orden de los capítulos y tarjetas | integración con emulador |
| Cola · "Nuevas creadas en el mismo instante por una versión anterior" | `ready-cards.spec.ts`: empate por capítulo, anverso y reverso, estable | unitaria pura |
| Exportación · "Tarjetas que perdieron su capítulo" (sonda EX-03) | `build-book-package.spec.ts`: capítulo final "Sin capítulo"; nada si no hay huérfanas | unitaria pura |
| C-01: borrar un capítulo sin red no deja tarjetas (sonda de `capitulos`) | `chapter.repository.integration.spec.ts`: sin red, el borrado falla y no borra nada; con red, borra todo | integración con emulador |
| C-01: lo mismo al borrar un libro | `book.repository.integration.spec.ts` | integración con emulador |
| Exportación · "Descargar también donde se puede compartir" (EX-02) | `export-book-dialog.component.spec.ts`: con compartir, "Descargar .txt" secundario descarga y cierra; sin compartir, una sola "Descargar .txt" | componente |
| Exportación · "Portapapeles no disponible" | `export-book-dialog.component.spec.ts`: el nuevo mensaje | componente |
| Caparazón · "Fallo no previsto", "Varios fallos seguidos", "Cerrar el aviso" (F-01) | `global-error-handler.spec.ts` (registra y avisa); componente del aviso (uno solo, se cierra); `app.spec.ts` (el aviso vive en la raíz) | unitaria + componente |
| Caparazón · "Un fallo que la pantalla ya explica" | prueba existente de un diálogo con fallo de guardado, comprobando que el aviso global no aparece | componente |
| IM-05: crear en un capítulo borrado (sonda 3 de `importacion`) | `card.repository.integration.spec.ts`: el lote falla y no crea tarjetas ni suma al libro; `counted-batch.integration.spec.ts`: la operación en cada lote no pasa de 450 | integración con emulador |
