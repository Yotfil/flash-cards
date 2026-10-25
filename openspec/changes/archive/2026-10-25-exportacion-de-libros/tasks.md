# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `importacion`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Componentes en su carpeta con cuatro archivos; cero literales; textos en `features/biblioteca/biblioteca.copy.ts`. La spec base `openspec/specs/exportacion-de-libros/spec.md` es el contrato (sin delta). Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Cerebro puro: serializar y armar el paquete

- [x] 1.1 Escribir en rojo `src/app/services/export/serialize-book-package.spec.ts`: el paquete de la spec ("Movement"/"Grammar") → texto exacto línea a línea con ` :: ` y la cloze, línea en blanco entre capítulos y `\n` final; `# Pendiente` sin líneas; sin capítulos → `''`; `rendirse\ndarse por vencido` → espacio; `a | b` + `c` → `a | b | c`; ejemplo de solo espacios se omite; verificar que falla; implementar `serializeBookPackage` con las constantes de `import-grammar.ts` y verificar que pasa.
- [x] 1.2 Escribir en rojo `src/app/services/export/export-import-roundtrip.spec.ts`: paquetes con básicas, cloze, con y sin ejemplo, capítulos vacíos y nombres con acentos → `parseImportText(serializeBookPackage(pkg), 'x')` devuelve los mismos capítulos y tarjetas y 0 errores; el caso `a | b` en el anverso documenta el límite (`front a`, `back b | c`); verificar que falla; dejar en verde ajustando solo el serializador si hace falta.
- [x] 1.3 Escribir en rojo `src/app/services/export/build-book-package.spec.ts`: 3 tarjetas con una suspendida → 3 drafts; mismo contenido con distinta programación → drafts idénticos; `banana`/`Apple`/`apple` → orden del listado; tarjetas de otro capítulo excluidas; capítulos en el orden recibido; `subject` copiado; verificar que falla; implementar `buildBookPackage` con `sortCardsForDisplay` y verificar que pasa.
- [x] 1.4 Escribir en rojo `src/app/services/export/sanitize-file-name.spec.ts` (`Verbos: básicos / avanzados` → `Verbos básicos avanzados.txt`, solo símbolos → `Libro.txt`, acentos conservados, espacios colapsados) y verificar que falla; implementar `sanitizeFileName` y `exportFileName` y verificar que pasa.

## 2. Puertos, fakes e infraestructura

- [x] 2.1 Añadir `listByBookFromServer(uid, bookId)` a `src/app/domain/ports/card.repository.ts` y al `FakeCardRepository` (devuelve lo sembrado o lanza); crear `src/app/domain/ports/file-delivery.port.ts` (`FileDeliveryPort`, `TextFile`) y `src/app/testing/fake-file-delivery.ts` (`canShare` configurable, registro de llamadas, resultado o fallo programable); verificar `npm run typecheck` y `npm run lint`.
- [x] 2.2 Añadir en rojo a `tests/firestore/card.repository.integration.spec.ts` el bloque "lectura completa": 40 tarjetas del libro A y 5 del libro B → `listByBookFromServer(A)` devuelve 40; documento corrupto → `InvalidDocumentError`; verificar que falla; implementar con `getDocsFromServer` y verificar que pasa.
- [x] 2.3 Escribir en rojo `src/app/infrastructure/browser/browser-file-delivery.adapter.spec.ts` (jsdom): sin `navigator.share` → `canShareFiles() false`; con `navigator` sustituido en la prueba, `canShare` consultado con un `File` de texto; `share` devuelve `'shared'` y pasa `{ files: [File 'x.txt'], title }`, `AbortError` → `'cancelled'`, otro error se propaga; `download` crea un `<a download="x.txt">`, hace clic y revoca la URL; `copyText` delega en `clipboard.writeText` y lanza si no existe; verificar que falla; implementar `BrowserFileDeliveryAdapter`, registrarlo en `provide-core.ts` y verificar que pasa.

## 3. Servicio (unitarias con fakes)

- [x] 3.1 Escribir en rojo `src/app/services/export/export.service.spec.ts`: `loadPackage(bookId)` usa el uid de la sesión, el libro de `BooksService`, los capítulos por `order` y `listByBookFromServer`, y devuelve `{ package, text, fileName 'Phrasal Verbs.txt', chapterCount 2, cardCount 40 }`; libro inexistente → lanza; repositorio que lanza → registra en `Logger` y relanza; `deliver(preview, 'share' | 'download' | 'copy')` llama al puerto con `{ name, content }` y traduce `'cancelled'`; fallo del puerto → `Logger` y relanza; verificar que falla; implementar `ExportService` y verificar que pasa.

## 4. UI: copy, diálogo y botón

- [x] 4.1 Añadir en rojo a `src/app/features/biblioteca/biblioteca.copy.spec.ts`: `exportSummary(2, 40)` → "2 capítulos · 40 tarjetas", `(1, 1)` → "1 capítulo · 1 tarjeta"; `exportButtonLabel('Phrasal Verbs')` → "Exportar «Phrasal Verbs»"; `exportDialogTitle`; constantes con los textos exactos de la spec; verificar que falla; implementar con `pluralize` y verificar que pasa.
- [x] 4.2 Escribir en rojo `src/app/features/biblioteca/export-book-dialog/export-book-dialog.component.spec.ts` con `FakeCardRepository`, `FakeFileDelivery`, `FakeLogger` y el `DialogService` real:
  - Título "Exportar «Phrasal Verbs»"; mientras carga, esqueleto `aria-busy` y acciones deshabilitadas; al resolver, "2 capítulos · 40 tarjetas".
  - Repo que lanza → "No pudimos cargar las tarjetas del libro." y "Reintentar" sin acciones de entrega; reintento que resuelve → resumen.
  - `canShare true` → solo "Compartir"; `share` recibe `{ name: 'Phrasal Verbs.txt', content }`; `'shared'` cierra con `true`; `'cancelled'` deja el diálogo abierto sin alerta; `share` que lanza → "No se pudo exportar el libro. Inténtalo de nuevo." en `role="alert"` y botones habilitados.
  - `canShare false` → solo "Descargar .txt"; `download` llamado y cierra con `true`.
  - "Copiar texto" → `copyText` con el texto completo, "Copiado" en `role="status"`, diálogo abierto; `copyText` que lanza → "No se pudo copiar. Usa Compartir o Descargar.".
  - Mientras entrega: `setPending`, botones deshabilitados, un solo envío con dos clics; Cancelar cierra con `false` en carga, error y listo.

  Verificar que falla; crear `ExportBookDialogComponent` y verificar que pasa.
- [x] 4.3 Añadir el icono `share` al set de `IconComponent` y en rojo a `src/app/features/biblioteca/libro-detail-page/libro-detail-page.component.spec.ts`: botón con `aria-label` "Exportar «Phrasal Verbs»" junto al de ajustes; con `FakeConnectivity` sin red, deshabilitado y con "Necesitas conexión para exportar." asociado; `setOnline(true)` lo habilita; tocarlo abre el diálogo con `{ bookId, bookName }`; verificar que falla; implementar en `LibroDetailPageComponent` y verificar que pasa.

## 5. Cierre

- [x] 5.1 Verificación manual con emuladores: exportar un libro con dos capítulos, una cloze, una tarjeta con ejemplo y una suspendida → en escritorio descarga `Nombre.txt` con el texto esperado; importarlo como libro nuevo → previsualización con los mismos conteos y 0 omitidas; "Copiar texto" → "Copiado"; sin red → botón deshabilitado con el mensaje; en el branch deploy desde un móvil, "Compartir" abre la hoja del sistema y cancelarla no muestra error; verificar que `npm run lint`, `format:check`, `typecheck`, `test`, `test:integration` y `build` están en verde.
- [x] 5.2 Añadir en `README.md` una línea sobre exportar (texto importable, compartir o descargar) y verificar leyéndola.
