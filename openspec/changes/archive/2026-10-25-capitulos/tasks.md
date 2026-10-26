# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `libros`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Componentes en su carpeta con cuatro archivos; cero literales; textos en `features/biblioteca/biblioteca.copy.ts`. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 0. Precondición

- [x] 0.1 Verificar en el código que el `opsx:update` de `libros` por T2 está aplicado: `ConfirmDialogComponent` deshabilita su confirmación sin red y existe `src/app/shared/text/connection.copy.ts` con `NEEDS_CONNECTION_MESSAGE`. Si falta o los nombres difieren, detenerse y corregir este design con `/opsx:update` antes de seguir.

## 1. Dominio y utilidades puras

- [x] 1.1 Crear `src/app/domain/models/chapter.model.ts` (`Chapter`) y `src/app/domain/ports/chapter.repository.ts` (`listByBook`, `create`, `rename`, `countCards`, `deleteWithCards`), con el fake `src/app/testing/fake-chapter-repository.ts` (mapa en memoria, `setCardCount`, contadores de llamadas, fallo por método); verificar `npm run typecheck` y `npm run lint`.
- [x] 1.2 Añadir en rojo a `src/app/features/biblioteca/biblioteca.copy.spec.ts` los casos de `chapterDeletionDetail` (42 → "Se borrarán 42 tarjetas. Tu historial de repasos se conserva. No se puede deshacer."; 1 → "Se borrará 1 tarjeta. …"; 0 → "No se puede deshacer."; `null` → "También se borrarán sus tarjetas. …") y de `chapterDisplayName` (`""` → "Capítulo sin nombre") y verificar que fallan; implementarlos con `pluralize` y verificar que pasan.
- [x] 1.3 Escribir en rojo `src/app/features/biblioteca/chapter-form.schema.spec.ts` ("   " falla con "El nombre es obligatorio."; 121 caracteres falla; "  Phrasal verbs  " da "Phrasal verbs") y verificar que falla; implementar `chapterFormSchema` sobre `bookFormSchema.shape.name` y verificar que pasa.
- [x] 1.4 Escribir en rojo `src/app/services/chapters/chapter-detail-state.spec.ts` (cada combinación da su `kind`: error de libros primero, libro sin resolver, libro `null`, error de capítulos con `failed: 'chapters'`, capítulo sin resolver, capítulo `null` con el libro, `ready`) y verificar que falla; implementar `resolveChapterDetail` y verificar que pasa.

## 2. Cerebro: servicio de capítulos (unitarias con fakes)

- [x] 2.1 Escribir en rojo `src/app/services/chapters/chapters.service.spec.ts`, bloque "recurso": `openBook('b1')` lee con el uid de la sesión y, repetido, vuelve a leer; `ensureLoaded('b1')` después no lee; otro libro sí lee; con el repositorio que lanza, `status() === 'error'`; con sesión `signedOut`, error "No hay una sesión activa." sin llamar al repositorio; `chapterById` da `undefined`, `null` y el capítulo. Verificar que falla; implementar `ChaptersService` con `resource()` y verificar que pasa.
- [x] 2.2 Añadir en rojo el bloque "mutaciones": `create` con lista vacía da `order` 0 con el `bookId` abierto y, con 0 y 3, da 4, recortado, al final y sin releer; `create` con sesión `signedOut` lanza sin llamar al repositorio; `rename` conserva `order` y refleja el nombre; `remove` llama a `deleteWithCards`, quita el capítulo solo tras el éxito, deja el `cardCount` del libro en −42 en `BooksService` y devuelve 42; el repositorio que lanza relanza y el recurso no cambia; tras quitar el de `order` 1 de 0, 1 y 2, `create` da 3. Verificar que falla; implementar y verificar que pasa.
- [x] 2.3 Añadir en rojo el bloque "conteos": `countCards` delega al repositorio; `cardCountFor` con `FakeConnectivity` sin red no llama y queda sin valor, con red llama, y al pasar de sin red a con red pide. Verificar que falla; implementar y verificar que pasa.

## 3. Adaptador de Firestore (integración con emulador)

- [x] 3.1 Escribir en rojo `tests/firestore/chapter.repository.integration.spec.ts`, bloque "CRUD": `listByBook` filtra por `bookId` y ordena 3, 0, 1 → 0, 1, 3; `create` devuelve el modelo con fechas; `rename` cambia solo `name` y `updatedAt`; un documento sin `order` da `InvalidDocumentError` con la ruta; uno con `name: ""` se lee. Verificar que falla; implementar `schemas/chapter.schema.ts` y `chapter.repository.firestore.ts` (sin conteo ni cascada aún) y verificar que pasa.
- [x] 3.2 Añadir en rojo el bloque "conteo y cascada": `countCards` da 42 y 1; con un libro de `cardCount` 100, un capítulo A con 42 tarjetas, un capítulo B con 58 y un `reviewLog` de una tarjeta de A, `deleteWithCards(A)` devuelve 42, borra A y sus tarjetas, conserva B, deja `cardCount` en 58 y conserva el `reviewLog`; un capítulo vacío devuelve 0 sin tocar `cardCount`; con 900 tarjetas no queda ninguna y `cardCount` baja exactamente 900. Verificar que falla; implementar con un `BatchWriter` por grupo de `MAX_BATCH_SIZE - 2` (descuento en cada grupo, capítulo en el último) y verificar que pasa; enlazar `ChapterRepository` en `provide-core.ts`.

## 4. Diálogo de capítulo

- [x] 4.1 Escribir en rojo `src/app/features/biblioteca/chapter-form-dialog/chapter-form-dialog.component.spec.ts`:
  - Modo crear: "Nuevo capítulo" / "Crear capítulo".
  - Nombre de solo espacios: botón deshabilitado y "El nombre es obligatorio." tras tocar.
  - Cancelar y Escape cierran sin resultado y sin llamar al servicio.
  - Modo renombrar: precargado y con "Guardar".
  - Mientras guarda: "Guardando…", botones deshabilitados, Escape bloqueado y un solo `create` con dos envíos.
  - Si el servicio lanza: sigue abierto con el nombre y "No se pudo guardar el capítulo. Inténtalo de nuevo." en `role="alert"`; el reintento con éxito cierra con el capítulo.
  - Con `FakeConnectivity` sin red: el botón principal se deshabilita con `NEEDS_CONNECTION_MESSAGE`; `setOnline(true)` lo habilita con el nombre intacto.

  Verificar que falla; crear el componente con Signal Forms y verificar que pasa.

## 5. Pantallas

- [x] 5.1 Escribir en rojo `src/app/features/biblioteca/chapter-row/chapter-row.component.spec.ts`:
  - Posición y nombre; "Capítulo sin nombre" con nombre vacío.
  - "42 tarjetas" y "1 tarjeta".
  - Sin red: sin línea de conteo y sin llamada. Con el conteo que falla: sin línea y sin `role="alert"`.
  - El enlace apunta a `/biblioteca/b1/c1` y los botones de icono quedan fuera del enlace.
  - `aria-label` "Renombrar Básicos" y "Borrar Básicos"; cada botón emite su salida.

  Verificar que falla; crear `ChapterRowComponent` (`glass-soft`, `press`) y verificar que pasa.
- [x] 5.2 Escribir en rojo `src/app/features/biblioteca/chapter-list/chapter-list.component.spec.ts` con `FakeChapterRepository`:
  - Al iniciar llama a `openBook`.
  - Esqueleto `aria-busy` sin "Añadir un capítulo".
  - Error "No pudimos cargar los capítulos" con `Reintentar` que relanza, sin el vacío; también con un documento corrupto.
  - Vacío con "Este libro aún no tiene capítulos", la frase y "Crear capítulo".
  - Posiciones 1, 2 y 3 para `order` 0, 3 y 7.
  - "Añadir un capítulo" al final abre el diálogo y el capítulo devuelto aparece último.
  - Borrar con conteo 42: la confirmación recibe "Se borrará «Básicos»." y el detalle de 42. Si `countCards` lanza, el texto sin número. Sin red, sin pedir el conteo.
  - Confirmación en `false`: la fila sigue y no hay cascada. En `true`: la fila sale y emite `contentsChanged`. Si la acción rechaza, la fila sigue.

  Verificar que falla; crear `ChapterListComponent` y verificar que pasa.
- [x] 5.3 Ampliar en rojo `src/app/features/biblioteca/libro-detail-page/libro-detail-page.component.spec.ts`: la región "Capítulos" pinta la lista en vez de la página provisional; con "Libro no encontrado" no hay lista; `contentsChanged` vuelve a pedir los totales. Verificar que falla; sustituir la región en `LibroDetailPageComponent` y verificar que pasa.
- [x] 5.4 Escribir en rojo `src/app/features/biblioteca/capitulo-detail-page/capitulo-detail-page.component.spec.ts` con `RouterTestingHarness`:
  - Con libros y capítulos ya cargados: sin lecturas nuevas, cabecera con el nombre del capítulo y enlace a `/biblioteca/b1` con `aria-label="Volver a Phrasal Verbs"`.
  - Entrada directa: esqueleto, `ensureLoaded` de ambos y luego la cabecera.
  - Error con `Reintentar` que recarga el recurso fallido.
  - "Libro no encontrado" con enlace a la Biblioteca, y "Capítulo no encontrado" con "Volver a {libro}".
  - La región "Tarjetas" provisional solo aparece en `ready`.

  Verificar que falla; crear `CapituloDetailPageComponent` y verificar que pasa.
- [x] 5.5 Sustituir en `app.routes.ts` la página provisional de `/biblioteca/:bookId/:chapterId`; ampliar `app.routes.spec.ts` y verificar que pasa.

## 6. Verificación manual y documentación

- [x] 6.1 (Manual) Con emuladores, recorrer y anotar el resultado en el mensaje del commit:
  - Crear dos capítulos y renombrar uno.
  - Sembrar tarjetas desde la UI del emulador y borrar el capítulo: desaparecen él y sus tarjetas, un `reviewLog` sembrado sigue, y bajan el `cardCount` y los totales de la cabecera.
  - Con DevTools en "Offline": los diálogos se deshabilitan con la nota y las filas van sin conteo.
  - Abrir la URL del capítulo borrado: "Capítulo no encontrado" sin región de tarjetas.
  - Comprobar las dos capas de acrílico y que con reducir transparencia todo es sólido.
- [x] 6.2 Actualizar `README.md` (cascada de capítulo con descuento por lote; detalle de capítulo con `resolveChapterDetail`) y anotar en `MEMORY.md` el cierre del change con el tamaño del bundle.

## 7. Cierre

- [x] 7.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build`, y verificar que todos terminan en verde. Luego `/opsx:archive capitulos` y un único commit de cierre `feat(capitulos): …` con el código, las pruebas y el archive; push de respaldo de la rama sin abrir PR.
