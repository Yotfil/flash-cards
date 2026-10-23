# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `ajustes-de-usuario`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Componentes en su carpeta con cuatro archivos; cero literales; textos en `features/biblioteca/biblioteca.copy.ts`. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Dominio y utilidades puras

- [ ] 1.1 Crear `src/app/domain/models/book.model.ts` (`Book`, `BookDraft`, `StudyDirection`) y `src/app/domain/ports/book.repository.ts` (`listByUser`, `create`, `update`, `incrementCardCount`, `countContents`, `deleteWithContents`, `countCardsByState`) con el fake `src/app/testing/fake-book-repository.ts` (mapa en memoria, contadores de llamadas, puede lanzar); verificar `npm run typecheck` y `npm run lint`.
- [ ] 1.2 Escribir en rojo `src/app/shared/text/pluralize.spec.ts` (0 → "0 tarjetas", 1 → "1 tarjeta", 12 → "12 tarjetas") y verificar que falla; implementar y verificar que pasa.
- [ ] 1.3 Escribir en rojo `src/app/features/biblioteca/book-form.schema.spec.ts` (nombre de solo espacios falla con "El nombre es obligatorio."; 121 caracteres falla; materia vacía válida; dirección fuera de `forward`/`both` falla) y `book-settings-form.schema.spec.ts` (`boundedInteger` 0-999 y 0-9999 con sus textos) y verificar que fallan; implementar ambos esquemas y verificar que pasan.

## 2. Cerebro: servicio de libros (unitarias con fakes)

- [ ] 2.1 Escribir en rojo `src/app/services/books/books.service.spec.ts`, bloque "recurso": `reload()` lee del repositorio con el uid de la sesión; repo que lanza → `status() === 'error'`; sesión `signedOut` → error "No hay una sesión activa." sin llamar al repositorio; `ensureLoaded()` carga una vez y no vuelve a cargar; `findById` devuelve `undefined` cargando, `null` si no existe y el libro si existe; verificar que falla; implementar `BooksService` con `resource()` y verificar que pasa.
- [ ] 2.2 Añadir en rojo el bloque "mutaciones": `create` siembra `newCardsPerDay` 7 desde la sesión y 200, `order` 0 con lista vacía y 6 con órdenes 0 y 5, `subject` `general` con espacios, y añade al final sin recargar; `update` conserva topes y refleja el nombre; `remove` llama a `deleteWithContents` y quita del recurso solo tras el éxito; `changeCardCount(+3)` refleja 13; `addLocal` añade solo si está resuelto; verificar que falla; implementar y verificar que pasa.
- [ ] 2.3 Añadir en rojo el bloque "totales": `totalsFor(bookId)` es un recurso que llama a `countCardsByState` y cambia al cambiar el id; `countContents` delega al repositorio; verificar que falla; implementar y verificar que pasa.

## 3. Adaptador de Firestore (integración con emulador)

- [ ] 3.1 Escribir en rojo `tests/firestore/book.repository.integration.spec.ts`, bloque "CRUD": `create` + `listByUser` ordena por `order`; `update` cambia solo lo pedido; documento sin `name` → `InvalidDocumentError` con la ruta; `incrementCardCount(+3)` y `(-2)` sobre 10 → 13 y 11; verificar que falla; implementar `schemas/book.schema.ts` y `book.repository.firestore.ts` (sin `deleteWithContents` ni conteos aún) y verificar que pasa.
- [ ] 3.2 Añadir en rojo el bloque "contenidos y cascada": con 3 capítulos y 40 tarjetas sembrados con ese `bookId` (y otros de otro libro), `countContents` devuelve 3 y 40; `deleteWithContents` elimina libro, capítulos y tarjetas de ese libro, conserva los del otro libro y un `reviewLog` sembrado; con 900 tarjetas termina sin error; verificar que falla; implementar con `BatchWriter` (tarjetas, capítulos, libro al final) y verificar que pasa.
- [ ] 3.3 Añadir en rojo el bloque "totales por estado": tarjetas sembradas con `scheduling.state` 0 ×20, 1 ×3, 3 ×1 y 2 ×12 → `countCardsByState` devuelve 20 / 4 / 12 (agregaciones; afirmar que no se leen documentos no es posible en el emulador: se afirma el resultado); verificar que falla; implementar con `getCountFromServer` y verificar que pasa; enlazar `BookRepository` en `provide-core.ts`.

## 4. Diálogos

- [ ] 4.1 Escribir en rojo `src/app/shared/confirm-dialog/confirm-dialog.component.spec.ts` (título, mensaje y detalle; "Borrando…" y `setPending(true)` mientras corre `action`; `action` que falla → sigue abierto con `errorMessage` en `role="alert"` y permite reintentar; éxito → `closed` resuelve `true`; Cancelar → `false`) y verificar que falla; crear `ConfirmDialogComponent` y verificar que pasa.
- [ ] 4.2 Escribir en rojo `src/app/features/biblioteca/book-form-dialog/book-form-dialog.component.spec.ts` (modo crear con "general" como pista y `forward` por defecto; nombre de solo espacios deshabilita y muestra el error al tocar; materia vacía no bloquea; Escape y Cancelar cierran sin resultado; modo editar precarga y conserva topes al guardar; "Guardando…", botones deshabilitados, Escape bloqueado, segundo envío ignorado; servicio que lanza → abierto con "No se pudo guardar el libro. Inténtalo de nuevo." y los valores; reintento con éxito cierra con el libro) y verificar que falla; crear el componente con Signal Forms y verificar que pasa.
- [ ] 4.3 Escribir en rojo `src/app/features/biblioteca/book-settings-dialog/book-settings-dialog.component.spec.ts` (precarga 12 y 150; guardar persiste solo los dos topes; -1 y 2.5 deshabilitan y muestran el texto exacto; 0 válido y "0 = sin tope" visible; fallo → abierto con "No se pudieron guardar los ajustes. Inténtalo de nuevo.") y verificar que falla; crear el componente y verificar que pasa.

## 5. Pantallas

- [ ] 5.1 Escribir en rojo `src/app/features/biblioteca/book-card/book-card.component.spec.ts` (nombre, etiqueta de materia, "12 tarjetas" / "1 tarjeta" / "0 tarjetas", nuevas por día; botones con `aria-label` "Ajustes de Inglés" y "Borrar Inglés"; tocar emite abrir) y verificar que falla; crear `BookCardComponent` (`glass-soft`, `press`) y verificar que pasa.
- [ ] 5.2 Escribir en rojo `src/app/features/biblioteca/biblioteca-page/biblioteca-page.component.spec.ts` con `FakeBookRepository` y `RouterTestingHarness`: al abrir llama a `reload()`; esqueleto sin acciones; error con "No pudimos cargar tus libros" y Reintentar; vacío con "Aún no tienes libros" y los dos botones; con libros, cabecera "Importar libro" y "Nuevo libro" y tarjetas en orden; tocar navega al detalle; "Importar libro" navega a `/importar`; "Nuevo libro" abre el diálogo y el libro devuelto aparece al final; borrar abre la confirmación con "Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva." y el libro sale solo tras `true`; verificar que falla; crear `BibliotecaPageComponent` y verificar que pasa.
- [ ] 5.3 Escribir en rojo `src/app/features/biblioteca/libro-detail-page/libro-detail-page.component.spec.ts`: navegación directa llama a `ensureLoaded` y pinta la cabecera; repo que lanza → `ErrorState` con Reintentar; id inexistente → "Libro no encontrado" con enlace a la Biblioteca; totales 12 dominadas / 4 en aprendizaje / 20 nuevas; botón de ajustes abre el diálogo con el libro; región "Capítulos" con la página provisional; verificar que falla; crear `LibroDetailPageComponent` y verificar que pasa.
- [ ] 5.4 Sustituir en `app.routes.ts` las páginas provisionales de `/biblioteca` y `/biblioteca/:bookId`; ampliar `app.routes.spec.ts` y verificar que pasa.

## 6. Verificación manual y documentación

- [ ] 6.1 (Manual) Con emuladores: crear dos libros, editar uno, ajustar topes, borrar uno con tarjetas sembradas desde la UI del emulador y comprobar que capítulos y tarjetas desaparecen y un `reviewLog` sembrado no; detener Firestore y comprobar que el diálogo de borrado se queda abierto con el error; comprobar las dos capas de acrílico y que con reducir transparencia todo es sólido. Anotar el resultado en el mensaje del commit.
- [ ] 6.2 Actualizar `README.md` (patrón de pantalla con `resource()`, `ConfirmDialog` con `action`) y anotar en `MEMORY.md` el cierre del change con el tamaño del bundle.

## 7. Cierre

- [ ] 7.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` y verificar que todos terminan en verde; `/opsx:archive libros` y un único commit de cierre `feat(libros): …` con el código, las pruebas y el archive; push de respaldo de la rama sin abrir PR.
