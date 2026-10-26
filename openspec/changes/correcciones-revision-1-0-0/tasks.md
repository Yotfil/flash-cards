# Tasks

> Rama `fix/revision-1.0.0` (desde `dev`), en el orden del plan de la revisión. Cada tarea de código va precedida por
> su prueba en rojo (skill `tdd`), sacada de la sonda que indica el "Plan de pruebas" del design. Antes de cada commit,
> la puerta completa: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` y la
> integración con la plantilla del emulador en el 8085 (nunca contra el 8080). Un commit `fix(<spec-id>): …` por paso
> del plan; este change se archiva al final con su propio commit `docs(openspec): …`.

## 1. Paso 1 · Ajustes: guardar solo lo que cambia (AJ-01, AJ-01b)

- [x] 1.1 Escribir en rojo, en `tests/firestore/user.repository.integration.spec.ts`, "guardar un ajuste no borra los ajustes que esta versión no conoce" (perfil sembrado con `promptTemplate` y `practicePackageCapacity`; guardar el tema; los dos siguen) y "guardar un ajuste solo cambia ese ajuste"; verificar que fallan (el puerto aún no tiene la escritura parcial).
- [x] 1.2 Añadir al puerto del perfil la escritura parcial de ajustes, implementarla en el adaptador con rutas `settings.<campo>` y en el fake (registro de escrituras y fallo simulado); verificar que pasan las pruebas de 1.1.
- [x] 1.3 Escribir en rojo, en `src/app/services/session/session.service.spec.ts`, "dos ajustes cambiados seguidos se guardan los dos" (sonda AJ-01b) y adaptar las pruebas de `updateSettings` a la escritura parcial; verificar que fallan.
- [x] 1.4 Hacer que `SessionService.updateSettings` use la escritura parcial y fusione sobre el usuario vigente al terminar; verificar que pasa la suite de la sesión y la puerta completa; commit `fix(ajustes-de-usuario): …`.

## 2. Paso 2 · Google: solo se borra la identidad recién creada (A-01)

- [x] 2.1 Escribir en rojo, en `src/app/services/session/session.service.spec.ts`, "una cuenta de Google que ya existía y salió de la lista queda sin acceso sin borrarse" (sonda A-01) y "si otra identidad avisa mientras se espera la ventana, no se borra"; verificar que fallan.
- [x] 2.2 Hacer que entrar con Google diga si la cuenta es nueva (puerto, adaptador con `getAdditionalUserInfo`, fake con la respuesta configurable) y que la sesión solo borre la nueva, comprobando la generación tras la espera; verificar que pasan las pruebas de 2.1 y las existentes de Google.
- [x] 2.3 Puerta completa en verde y commit `fix(autenticacion-y-acceso): …` del paso.

## 3. Paso 5 · Tarjetas huérfanas (C-01, CD-04, IM-05, EX-03)

- [x] 3.1 Escribir en rojo, en `tests/firestore/chapter.repository.integration.spec.ts` y `tests/firestore/book.repository.integration.spec.ts`, que borrar sin red falla sin borrar nada y que, con red, borra también las tarjetas que la caché no tenía (sonda de `capitulos`); verificar que fallan.
- [x] 3.2 Leer lo que se va a borrar con la lectura del servidor en el borrado del capítulo y del libro; verificar que pasan las pruebas de 3.1.
- [x] 3.3 Escribir en rojo, en `src/app/services/queue/build-daily-queue.spec.ts`, "las tarjetas de un libro que no está en la lista no entran" (dos vencidas y una nueva, sin fila en el desglose) y, en `daily-queue.service.spec.ts`, el aviso en el registro con el número; verificar que fallan.
- [x] 3.4 Excluir del armado las vencidas de un libro ausente y registrar en la lectura de la cola cuántas candidatas quedaron fuera; verificar que pasan las pruebas de 3.3.
- [x] 3.5 Escribir en rojo, en `tests/firestore/card.repository.integration.spec.ts`, "crear tarjetas en un capítulo que ya no existe falla sin crear nada ni sumar al libro" (sonda 3 de `importacion`) y, en `tests/firestore/counted-batch.integration.spec.ts`, que la operación "en cada lote" va en todos los lotes sin pasar de 450 escrituras; verificar que fallan.
- [x] 3.6 Añadir al escritor con contador la operación en cada lote y usarla al crear y reemplazar tarjetas en un capítulo existente (el `update` del capítulo); verificar que pasan las pruebas de 3.5 y las existentes de tarjetas e importación.
- [x] 3.7 Escribir en rojo, en `src/app/services/export/build-book-package.spec.ts`, "las tarjetas sin capítulo salen al final en «Sin capítulo»" (sonda EX-03) y "sin huérfanas no aparece"; verificar que fallan; implementarlo y verificar que pasan.
- [x] 3.8 Puerta completa en verde y commit `fix(capitulos): …` del paso.

## 4. Paso 10 · Orden de las nuevas (CD-02)

- [x] 4.1 Escribir en rojo, en `tests/firestore/card.repository.integration.spec.ts`, "las nuevas creadas juntas salen en el orden en que se crearon" (sonda CD-02) y, en `tests/firestore/import.repository.integration.spec.ts`, que las tarjetas de un libro importado tienen fechas de creación crecientes en el orden de capítulos y tarjetas; verificar que fallan.
- [x] 4.2 Escalonar la fecha de creación por posición en el repositorio de tarjetas y en la importación de un libro; verificar que pasan las pruebas de 4.1.
- [x] 4.3 Escribir en rojo, en `src/app/services/queue/ready-cards.spec.ts`, el desempate de las nuevas con la misma fecha (capítulo, anverso, reverso; mismo orden con la entrada barajada); verificar que falla; implementarlo y verificar que pasa.
- [x] 4.4 Puerta completa en verde y commit `fix(cola-diaria): …` del paso.

## 5. Paso 12 · Condicionales aprobados por el usuario (EX-02, F-01, P-03)

- [x] 5.1 Añadir los deltas de EX-02 (`exportacion-de-libros`) y F-01 (`navegacion-y-shell`) antes de implementarlos.
- [ ] 5.2 Escribir en rojo, en `export-book-dialog.component.spec.ts`, "con compartir, «Descargar .txt» también, como secundaria, descarga y cierra", "sin compartir, una sola «Descargar .txt»" y el nuevo mensaje de copiar; implementarlo y verificar que pasan; puerta completa y commit `fix(exportacion-de-libros): …`.
- [ ] 5.3 Escribir en rojo, en `global-error-handler.spec.ts`, que el manejador avisa además de registrar; en el componente del aviso, que pinta el texto con `role="alert"`, uno solo aunque haya varios fallos, y que "Cerrar aviso" lo quita; en `app.spec.ts`, que la raíz lo aloja; y que un fallo ya explicado por un diálogo no lo muestra. Implementarlo y verificar que pasan; puerta completa y commit `fix(navegacion-y-shell): …`.
- [ ] 5.4 Enseñar al usuario el borrador del icono Cadence (SVG) y, con su visto bueno, generar el favicon, los 8 PNG de la PWA y el `apple-touch-icon`; verificar con `tests/static/manifest.spec.ts` (tamaños) y un vistazo a los PNG; puerta completa y commit `fix(plataforma-datos-y-offline): …`.

## 6. Cierre del change

- [ ] 6.1 `openspec validate correcciones-revision-1-0-0` en verde; `/opsx:archive` (las specs base de `ajustes-de-usuario`, `autenticacion-y-acceso`, `cola-diaria`, `exportacion-de-libros` y `navegacion-y-shell` quedan con el delta) y commit `docs(openspec): …`.
