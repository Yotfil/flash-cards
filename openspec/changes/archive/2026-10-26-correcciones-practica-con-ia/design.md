# Design

## Context

La motivación está en `proposal.md` (Why). Este change acompaña la entrega de la 1.1.0: va en la rama de
`practica-con-ia` después de traerse `dev` con las correcciones del 1.0.0 (merge `31c8ca6`). La escena, la evidencia y
la sonda de cada hallazgo están en `docs/revision-1.0.0/README.md`, sección 15. Estado de partida, leído en el código:

- **Lectura (IA-01).** El esquema de la frontera valida cada entrada del mapa `items`, esté o no en `itemOrder`, y la
  lectura de la lista es todo o nada. Calificar escribe por rutas punteadas (`items.<id>.lastGrade` y
  `.lastPracticedDayId`); editar, con `updateDoc` por rutas. Sobre un ítem ya borrado, cualquiera de las dos crea una
  entrada incompleta fuera de `itemOrder` y ninguna falla. Borrar quita la entrada y su id de `itemOrder` a la vez.
- **Rechazos (IA-02).** La sesión de práctica reencola cualquier rechazo de una nota (`requeueRejected`). El
  adaptador deja pasar el error de Firestore tal cual: los servicios no lo pueden distinguir sin conocer Firestore.
- **Conjunto del día (IA-03).** `prepareTodayPractice` fija el conjunto del día al preparar: cambia la lista local y
  lo escribe sin esperar. `practicedToday`, el aviso de Hoy, "Copiar prompt de hoy" y el prompt dependen de ese conjunto.
- **Prompt del cierre (IA-04).** `promptFor(packageId)` usa el día de estudio de ahora. La sesión guarda el día de la
  práctica en su estado, pero no lo expone.

## Goals / Non-Goals

**Goals:**

- Cada arreglo con su prueba de regresión, sacada de su sonda (ver "Plan de pruebas").
- La forma de los documentos no cambia: los paquetes ya guardados se leen igual y los restos sueltos que existan dejan
  de estorbar.
- Las capas se respetan: Firestore solo en el adaptador; los servicios ven errores del dominio.

**Non-Goals:**

- Borrar los restos sueltos del almacén (leer no escribe).
- Tratar `permission-denied` ni los rechazos del repaso (ver la proposal, "Fuera de alcance").

## Decisions

### 1. IA-01: solo los ítems listados son el paquete (capa: repositorio)

El esquema de la frontera lee `items` como un mapa sin validar y, en una transformación, valida con el esquema del ítem
solo las entradas cuyos ids están en `itemOrder`:

- **Resto suelto.** Una entrada que no figura en `itemOrder` se aparta en la salida, en `strayItemIds`.
- **Entrada listada inválida.** Sigue haciendo inválido el documento, con la ruta `items.<id>.<campo>`: eso sí es
  corrupción, no un resto.
- **Id listado sin entrada.** Se tolera, como hoy: `orderedItems` y `pendingItemIds` ya lo saltan.

El adaptador recibe el `Logger` por el constructor. Al listar, avisa con `warn` ("dato inesperado tolerado") de cada
paquete con restos, con su ruta y cuántos son, y el modelo de dominio se arma sin ellos. El esquema reducido que lee la
capacidad dentro de la transacción de agregar sale del objeto base, porque una transformación ya no admite `pick`.

**Editar un ítem pasa a una transacción.** La transacción lee el paquete:

- si el documento no existe, lanza `PracticePackageGoneError`;
- si el id no está en `itemOrder`, lanza `PracticeItemGoneError`;
- si no, actualiza las mismas rutas que hoy.

Editar ya exige red, así que la transacción no quita nada sin conexión. El formulario muestra su error genérico, igual
que al editar una tarjeta borrada.

- **Calificar sigue sin transacción.** Tiene que funcionar sin red y no esperar al servidor. Su resto, si llega a
  escribirse, queda ignorado al leer.
- *Alternativa descartada:* guardar las notas en un mapa aparte (`grades`). También evita el resto, pero cambia la forma
  del documento y obliga a migrar o a leer las dos formas.
- *Alternativa descartada:* registrar desde el servicio. El servicio no ve los restos, porque el adaptador ya los quitó;
  habría que filtrarlos hasta el dominio solo para contarlos.
- **Dos errores nuevos del dominio**, junto a `PackageFullError` en el puerto: `PracticePackageGoneError` y
  `PracticeItemGoneError`. El primero lo pide IA-02. El segundo es el caso distinto de editar: el paquete existe, el
  ítem no.

### 2. IA-02: "el paquete ya no existe" cierra la práctica (capas: repositorio, servicio, UI)

- **Adaptador.** Al calificar, traduce el rechazo de Firestore con código `not-found` (solo puede significar que el
  documento ya no existe) a `PracticePackageGoneError`. Los demás rechazos pasan tal cual.
- **Estado puro.** Gana el estado `gone` y la función `closeBecausePackageIsGone`: con la práctica activa pasa a `gone`;
  con la práctica ya terminada no cambia nada (la nota se cuenta como hoy, en el cierre).
- **Servicio de sesión.** Registra el rechazo como hoy. Con `PracticePackageGoneError` cierra la práctica; con
  cualquier otro rechazo, la reencola como hoy.
- **Pantalla de práctica.** Con `gone`, muestra el estado vacío compartido con "Este paquete ya no existe", un mensaje
  breve y el enlace "← Biblioteca". Los textos van en el copy de la feature. Ya no hay atajos de teclado: solo
  funcionan con la práctica activa.
- *Alternativa descartada:* no reencolar ningún ítem más de una vez. Corta el bucle para cualquier rechazo, pero cambia
  el comportamiento compartido con el repaso; queda para el tema transversal de después del release.

### 3. IA-03: la primera nota fija el conjunto (capa: servicio)

- **Preparar.** `prepareTodayPractice` solo calcula y entrega: no cambia la lista local ni escribe.
- **Fijar.** El método nuevo `PracticePackagesService.fixTodaySetOnFirstGrade(packageId, dayId, itemIds)` fija el
  conjunto, en la lista local y en el almacén sin esperar, como hoy en `prepareTodayPractice`. Si el paquete ya se
  practicó ese día o no está cargado, no hace nada.
- **La sesión.** Guarda en su estado los ids preparados, en el orden del paquete (`itemIds`), y llama a ese método en
  cada nota, antes de aplicar la nota a la lista. Como el método es idempotente, solo escribe la primera.
- **El conjunto son los ítems preparados**, no un recálculo en el momento de la nota: es exactamente lo que se practicó.
- *Alternativa descartada:* que la sesión lleve la cuenta de "ya fijé". Duplica una regla que la lista ya sabe
  responder (`hasPracticedToday`).

### 4. IA-04: el prompt del cierre usa el día de la sesión (capas: servicio, UI)

- **El prompt.** `promptFor(packageId, dayId?)`: sin día, el de ahora (el detalle del paquete, "Copiar prompt de hoy");
  con día, ese.
- **La sesión** expone `dayId`, y la pantalla de práctica arma el prompt del cierre con él.

### Superficies (ADR 0003)

La pantalla de práctica es de pantalla completa y sólida, como el repaso: el estado "ya no existe" no lleva acrílico.
El estado vacío compartido ya es sólido.

## Risks / Trade-offs

- **Restos que se acumulan en el documento.** Pueden quedar entradas sueltas que nunca se limpian. → Son pocas (hace
  falta otro dispositivo con la lista vieja), pesan bytes y el registro las deja ver. Si algún día molestan, limpiarlas
  es una escritura aparte.
- **`not-found` por otra causa.** `updateDoc` solo responde `not-found` cuando el documento no existe, y calificar no
  hace otra cosa. → Se acepta.
- **El conjunto se fija con la primera nota, que puede llegar rechazada.** El conjunto queda fijado aunque esa nota
  vuelva a la cola. → Correcto: se practicó, y la nota se repite en la misma práctica.
- **Un cliente 1.1.0 viejo**, de antes de este arreglo, sigue fijando al preparar. → La 1.1.0 aún no está en
  producción: sale ya con el arreglo.

## Migration Plan

Sin migración. Al desplegar la 1.1.0: `firebase deploy --only firestore:rules` (regla de `practicePackages`, ya en la
rama). Volver atrás es revertir los commits.

## Plan de pruebas

| Escenario (delta) | Prueba | Capa | Sale de |
| --- | --- | --- | --- |
| Restos de un ítem borrado en otro dispositivo | Dos clientes: el computador borra «to give up», el móvil lo califica; `listByUser` da los 2 paquetes, el paquete sin ese ítem, y el registro tiene un `warn` con la ruta | Integración (emulador), repositorio de paquetes | Sonda IA-01 (1) |
| Documento malformado (sigue igual) | Un ítem listado sin `addedAt` hace inválido el documento con la ruta del campo; el documento corrupto existente sigue fallando | Integración, repositorio | Prueba nueva + existente |
| Editar un ítem que otro dispositivo borró | El móvil borra «to look up» y el computador lo edita: rechaza con `PracticeItemGoneError`, el documento no gana entrada y `listByUser` da los 2 paquetes; editar un paquete borrado rechaza con `PracticePackageGoneError`; editar un ítem existente sigue igual | Integración, repositorio | Sonda IA-01 (2) + existente |
| El paquete se borró en otro dispositivo (adaptador) | Calificar en un paquete borrado rechaza con `PracticePackageGoneError` | Integración, repositorio | Prueba nueva |
| El paquete se borró en otro dispositivo (estado) | `closeBecausePackageIsGone`: activa → `gone`; terminada → sin cambios | Unitaria pura (estado de la sesión) | Prueba nueva |
| El paquete se borró en otro dispositivo (sesión) | Con el fake rechazando con `PracticePackageGoneError`: estado `gone`, el ítem no vuelve, un solo registro; otro rechazo sigue reencolando | Unitaria (servicio de sesión) | Sonda IA-02 |
| El paquete se borró en otro dispositivo (pantalla) | En `gone`: "Este paquete ya no existe", el enlace a `/biblioteca`, sin cerebros ni barra | Componente (pantalla de práctica) | Prueba nueva |
| Abrir la práctica y salir sin calificar | Preparar entrega los 3 sin fijar (`todaySets` vacío): sigue sin practicar hoy y "Copiar prompt de hoy" deshabilitado; un ítem agregado después entra en la siguiente | Unitaria (servicio de paquetes) | Sonda IA-03 |
| Agregar después de practicar / conjunto estable | La primera nota fija el conjunto preparado (una sola escritura, con los ids en el orden del paquete); la segunda práctica del día usa el mismo conjunto | Unitaria (servicio de paquetes y servicio de sesión) | Pruebas existentes adaptadas |
| Práctica que cruza el inicio del día | Inicio a medianoche; preparar a las 23:58, calificar las 3 "Otra vez", reloj a las 00:02: el prompt del cierre lista los 3 difíciles | Componente (pantalla de práctica) + unitaria de `promptFor(id, dia)` | Sonda IA-04 |
| Día uno, día dos, Bien descansa, cambio de día | Sin cambios: las existentes siguen en verde | Unitaria | Existentes |

## Contratos que deja listos

- `PracticePackageGoneError` y `PracticeItemGoneError` en el puerto de paquetes, y el fake que los acepta en
  `rejectNext`.
- El adaptador de paquetes con `Logger` en el constructor (la raíz de composición y las pruebas de integración lo
  pasan).
- `PracticePackagesService.fixTodaySetOnFirstGrade`, `promptFor(packageId, dayId?)` y `PracticeAiSessionService.dayId`.
