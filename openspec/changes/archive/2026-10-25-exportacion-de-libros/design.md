# Design

## Context

Ver `proposal.md` (Why) y la spec base `openspec/specs/exportacion-de-libros/spec.md` (es el contrato completo; no hay delta). Estado esperado de `dev` cuando este change se ejecute (12.º, tras `importacion`):

- De `importacion`: `BookPackage`, `PackageChapter` (`domain/models/book-package.ts`); `services/import/import-grammar.ts` (`CHAPTER_PREFIX`, `PIPE`, `EXAMPLE_SEPARATOR = ' :: '`, `LINE_BREAK`); `parseImportText(text, defaultChapterName)`; esquemas de formulario ya en `services/`.
- De `tarjetas`: `Card`, `CardContentDraft`, `sortCardsForDisplay`, `CardRepository` con `FakeCardRepository`.
- De `libros` y `capitulos`: `BooksService.findById`, `ChaptersService.openBook`/`chapters` (recurso con los capítulos del libro por `order`), `LibroDetailPageComponent` con cabecera (enlace, nombre, materia, totales, botón de ajustes), `biblioteca.copy.ts`, `pluralize`.
- De `navegacion-y-shell`: `DialogService.open` → `AppDialogRef`, `DIALOG_DATA`, `ConnectivityPort.online`, `FakeConnectivity`, `IconComponent`, `Skeleton`, `ErrorState`.
- De plataforma: `parseDocuments`, `Logger`.
- Verificado: `getDocsFromServer` está en `firebase@12.15.0`; `navigator.canShare`/`share` y `navigator.clipboard.writeText` están en `lib.dom.d.ts`. Web Share con archivos funciona en Safari iOS y Chrome Android; en Firefox y Chrome de escritorio `canShare({ files })` devuelve `false` y toca descargar. Cancelar la hoja lanza `AbortError`.
- No hay código viejo: la capacidad no existe en la 0.1.1.

## Goals / Non-Goals

**Goals:**
- Serializador puro y pequeño, espejo del parser, con la prueba de ida y vuelta como guardián de la gramática.
- Entrega del archivo detrás de un puerto, para que el diálogo se pruebe sin navegador real y el futuro compartir reutilice el patrón.
- Cero lecturas de más: el libro y los capítulos ya están cargados en el detalle; solo se leen las tarjetas, una vez, del servidor.

**Non-Goals:**
- Serializar a otros formatos, exportar varios libros, compartir dentro de la app.

## Decisions

### 1. Serializador y armado del paquete (`services/export/`; capa servicios)

- `serialize-book-package.ts`: `serializeBookPackage(pkg: BookPackage): string`. Por capítulo: `${CHAPTER_PREFIX} ${flatten(name)}`, luego una línea por tarjeta: cloze → `flatten(front)`; básica → `flatten(front) + ' ' + PIPE + ' ' + flatten(back)`; si `example` recortado no está vacío, `+ EXAMPLE_SEPARATOR + flatten(example)`. Capítulos separados por una línea en blanco; el texto termina en `\n` (vacío si no hay capítulos). `flatten(text)` = reemplazar `LINE_BREAK` por espacio, colapsar espacios múltiples que nazcan de ahí NO (solo recortar extremos): la spec pide "sustituir por un espacio" y recortar, nada más. Usa las constantes de `import-grammar.ts`, nunca literales propios: así el ida y vuelta es exacto por construcción.
- `build-book-package.ts`: `buildBookPackage(book: Book, chapters: Chapter[], cards: Card[]): BookPackage`: capítulos en el orden recibido (ya vienen por `order`), tarjetas de cada capítulo filtradas por `chapterId` y ordenadas con `sortCardsForDisplay`; cada tarjeta → `{ cardType, front, back, example? }`. Las suspendidas entran como las demás. `subject` se copia al paquete (el paquete lo tiene) aunque el texto no lo escriba.
- `sanitize-file-name.ts`: `sanitizeFileName(name)` quita `\/:*?"<>|` y caracteres de control, colapsa espacios y recorta; si queda vacío → "Libro". `exportFileName(book) = sanitizeFileName(book.name) + '.txt'`.

*Por qué un módulo `export` y no dentro de `import`:* son dos capacidades con specs distintas; comparten solo las constantes de gramática, que viven en `import` porque nacieron allí (segundo consumidor real: no se mueven).

### 2. Lectura completa del libro (`domain/ports/card.repository.ts`, `infrastructure/firestore/card.repository.firestore.ts`)

`CardRepository.listByBookFromServer(uid, bookId): Promise<Card[]>`: contrato "devuelve TODAS las tarjetas del libro tal como están en el servidor; sin red, falla". Adaptador: `getDocsFromServer(query(cards, where('bookId', '==', bookId)))` + `parseDocuments`. *Por qué del servidor:* la caché persistente puede tener parte del libro y `getDocs` la devolvería sin avisar; un archivo incompleto que parece completo es el peor resultado posible. *Por qué no reutilizar `listReadyByBook`:* filtra por vencimiento. El fake devuelve lo sembrado o lanza.

### 3. Puerto de entrega de archivos (`domain/ports/file-delivery.port.ts`; adaptador en `infrastructure/browser/browser-file-delivery.adapter.ts`)

```ts
abstract class FileDeliveryPort {
  abstract canShareFiles(): boolean;
  abstract share(file: TextFile): Promise<'shared' | 'cancelled'>;
  abstract download(file: TextFile): Promise<void>;
  abstract copyText(text: string): Promise<void>;
}
interface TextFile { name: string; content: string }
```

Adaptador: `canShareFiles` = `typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })` con un `File` de prueba de texto plano; `share` crea `new File([content], name, { type: 'text/plain;charset=utf-8' })` y llama a `navigator.share({ files, title: name })`; `AbortError` → `'cancelled'`, cualquier otro error se propaga. `download` crea un `Blob`, `URL.createObjectURL`, un `<a download>` efímero, `click()` y `revokeObjectURL`. `copyText` → `navigator.clipboard.writeText`; si no existe `clipboard`, lanza. Registrado en `provide-core.ts`. `FakeFileDelivery` en `testing/` con `canShare` configurable, registro de llamadas y resultado/fallo programable. *Por qué un puerto:* el diálogo se prueba sin `navigator` real (ADR 0002: sin mocks de librería; se finge el puerto), y el futuro compartir entre usuarios no lo necesita pero un "exportar lote de práctica" sí podría.

### 4. Servicio (`services/export/export.service.ts`; capa servicios)

`ExportService` (inyectable): `loadPackage(bookId): Promise<ExportPreview>` → `requireSessionUid`, `books.findById` (si `null`, lanza), `chapters.ensureLoaded(bookId)`/lectura de capítulos, `cards.listByBookFromServer`, `buildBookPackage`; devuelve `{ package; text: serializeBookPackage(package); fileName; chapterCount; cardCount }`. `deliver(preview, mode: 'share' | 'download' | 'copy')` delega en el puerto y devuelve `'done' | 'cancelled'`. Registra en `Logger` los fallos de lectura y entrega antes de relanzar.

### 5. Diálogo y botón (`features/biblioteca/export-book-dialog/`, `libro-detail-page`; capa UI)

- `ExportBookDialogComponent` recibe `{ bookId; bookName }` por `DIALOG_DATA`. Al abrir, `preview = resource({ loader: () => exportService.loadPackage(bookId) })`. Estados: `loading` → esqueleto de una línea y acciones deshabilitadas; `error` → `ErrorState` compacto "No pudimos cargar las tarjetas del libro." con "Reintentar" (`preview.reload()`) y sin acciones; `ready` → resumen `exportSummary(chapterCount, cardCount)` (plural real) y acciones.
- Acción principal: `fileDelivery.canShareFiles()` (evaluado una vez al abrir) ? "Compartir" : "Descargar .txt". Al tocar: `busy`, `setPending(true)`, `deliver(...)`; `'done'` → `close(true)`; `'cancelled'` → `busy = false`, sin mensaje; error → `errorMessage = EXPORT_ERROR` en `role="alert"`, acciones de vuelta.
- Secundaria "Copiar texto": `deliver(preview, 'copy')`; éxito → `copied = true` durante 2 s (`role="status"` "Copiado"), diálogo abierto; fallo → "No se pudo copiar. Usa Compartir o Descargar." en el alert.
- Cancelar cierra con `false` en cualquier estado salvo `busy`.
- Botón en la cabecera: `IconComponent name="share"` (icono nuevo en el set) con `aria-label = exportButtonLabel(book.name)`; `[disabled]="!online()"` y, deshabilitado, muestra `EXPORT_NEEDS_CONNECTION` como texto asociado (`aria-describedby`). Abre el diálogo. El resultado `true` no requiere nada más.
- Textos en `biblioteca.copy.ts`: `exportButtonLabel`, `exportDialogTitle`, `exportSummary`, `EXPORT_ERROR`, `EXPORT_READ_ERROR`, `EXPORT_COPY_ERROR`, `EXPORT_NEEDS_CONNECTION = 'Necesitas conexión para exportar.'`, `COPIED`.

### 6. Correcciones de la fase B (2026-10-25, vía `/opsx:update`)

1. **El libro sale de `await books.ensureLoaded()`**, no de `books.findById`: `findById` devuelve `undefined` mientras la Biblioteca no cargó (entrada directa por la dirección). Los capítulos se leen con `ChapterRepository.listByBook` (ya ordenados por `order`), en paralelo con las tarjetas: `ChaptersService` es un recurso sin promesa que esperar.
2. **`ErrorState` gana la entrada `compact`** (relleno vertical corto) para el error de lectura dentro del diálogo; el de página sigue igual.
3. **Chrome de escritorio en macOS SÍ comparte archivos:** `canShare({ files })` es `true`, así que ofrece "Compartir" (hoja del sistema de macOS) y no "Descargar .txt", tal como pide la spec. La descarga de la verificación 5.1 se comprobó simulando un navegador sin compartir archivos (como Firefox de escritorio).
4. **Compartir en un móvil real** (hoja del sistema y cancelarla sin error) queda para el usuario en el branch deploy; en la verificación por CDP se simuló `navigator.share` (cancelar, fallo y éxito).
5. **Trampa de pruebas:** con la lectura retenida, `ApplicationRef.whenStable()` no resuelve (el recurso cuenta como tarea pendiente): esas pruebas solo pintan hasta liberar la lectura.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Panel del diálogo de exportación | `glass` (overlay del CDK, fondo oscurecido) | 1 (sustituye al detalle) |
| Resumen, esqueleto, error, botones dentro del diálogo | sólidos o sin fondo | 0 |
| Botón "Exportar" en la cabecera | botón de icono como el de ajustes, sin fondo propio | 0 |

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `serializeBookPackage`, `buildBookPackage`, `exportFileName` | Futuro compartir entre usuarios; `practica-con-ia` NO (su prompt lista términos, no un paquete) |
| Prueba de ida y vuelta `serializeBookPackage` ↔ `parseImportText` | Cualquier cambio futuro de la gramática |
| `CardRepository.listByBookFromServer` | `progreso` si necesita totales exactos; futuro "mover tarjetas de capítulo" |
| `FileDeliveryPort`, `BrowserFileDeliveryAdapter`, `FakeFileDelivery` | Cualquier capacidad que entregue un archivo o copie texto (`practica-con-ia` puede usar `copyText` para el prompt) |
| Icono `share` | Compartir a futuro |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Libro con dos capítulos; Capítulo único y capítulo vacío; Libro sin tarjetas | `serialize-book-package.spec`: texto exacto línea a línea para el paquete de la spec (incluido ` :: ` y la cloze), `# Pendiente` sin líneas debajo, paquete sin capítulos → `''`, con capítulos vacíos → solo encabezados; termina en `\n` | unitaria pura |
| Ida y vuelta | `export-import-roundtrip.spec`: paquetes generados (básicas, cloze, con y sin ejemplo, capítulos vacíos, nombres con acentos) → `parseImportText(serialize(pkg), 'x')` devuelve los mismos capítulos y tarjetas y 0 errores | unitaria pura |
| Suspendidas incluidas; Sin rastro del progreso | `build-book-package.spec`: 3 tarjetas con una suspendida → 3 drafts; dos tarjetas con distinto `scheduling` y mismo contenido → drafts idénticos; `subject` copiado | unitaria pura |
| Orden estable | `build-book-package.spec`: `banana`, `Apple`, `apple` → orden del listado; tarjetas de otro capítulo excluidas; capítulos en el orden recibido | unitaria pura |
| Salto de línea dentro de un campo; Pipe dentro del anverso | `serialize-book-package.spec`: `rendirse\ndarse por vencido` → `rendirse darse por vencido`; `a | b` + `c` → `a | b | c`; el ida y vuelta de esa línea da `front a`, `back b | c` (prueba explícita del límite aceptado) | unitaria pura |
| Nombre de archivo seguro | `sanitize-file-name.spec`: `Verbos: básicos / avanzados` → `Verbos básicos avanzados.txt`; solo símbolos → `Libro.txt`; acentos conservados | unitaria pura |
| Abrir el diálogo; Resumen en singular; Falla la lectura; Reintentar tras el fallo | `biblioteca.copy.spec`: `exportSummary(2, 40)`, `(1, 1)`; `export-book-dialog.component.spec` con fakes: título "Exportar «Phrasal Verbs»", esqueleto y acciones deshabilitadas mientras carga, resumen al resolver, repo que lanza → texto de error + Reintentar sin acciones, segundo intento resuelve → resumen | unitaria pura + componente |
| Compartir en un dispositivo que puede; Descargar donde no se puede compartir; El usuario cancela la hoja; Falla la entrega | `export-book-dialog.component.spec` con `FakeFileDelivery`: `canShare true` → solo "Compartir", `share` recibe `{ name: 'Phrasal Verbs.txt', content }` y `'shared'` cierra con `true`; `canShare false` → solo "Descargar .txt", `download` llamado y cierra; `'cancelled'` → abierto sin alerta; `share` que lanza → alerta con el texto y botones habilitados | componente |
| Copiar; Portapapeles no disponible | `export-book-dialog.component.spec`: `copyText` recibe el texto, "Copiado" en `role="status"`, diálogo abierto; `copyText` que lanza → "No se pudo copiar. Usa Compartir o Descargar." | componente |
| Sin conexión; Vuelve la conexión | `libro-detail-page.component.spec` con `FakeConnectivity`: botón "Exportar" con `aria-label` "Exportar «Phrasal Verbs»", deshabilitado con "Necesitas conexión para exportar."; `setOnline(true)` lo habilita; tocarlo abre el diálogo con `{ bookId, bookName }` | componente |
| La caché no basta | `card.repository.integration.spec`: `listByBookFromServer` devuelve las 40 sembradas y excluye las de otro libro; con el emulador detenido tras sembrar, rechaza (no devuelve caché) | integración |
| Adaptador de entrega | `browser-file-delivery.adapter.spec` (jsdom): sin `navigator.share` → `canShareFiles() === false`; `download` crea y hace clic en un `<a download>` con el nombre y revoca la URL; `copyText` delega en `clipboard.writeText` y lanza si no existe; `share` traduce `AbortError` a `'cancelled'` con un `navigator.share` sustituido en la prueba (es el propio navegador simulado, no una librería) | unitaria (DOM) |

## Risks / Trade-offs

- [`canShare({ files })` devuelve `true` pero `share` falla en algún navegador] → el error se muestra en el diálogo y el usuario puede volver a intentar; no se cae a descarga automáticamente para no sorprender con dos comportamientos.
- [Descarga bloqueada por el navegador (p. ej. iframe o política)] → `download` no puede detectar el bloqueo; el diálogo cierra igual. Riesgo aceptado; en móvil el camino es compartir.
- [Libro grande (miles de tarjetas) leído del servidor cada vez] → una lectura por exportación, acción poco frecuente; el texto se arma en memoria en milisegundos.
- [Un `|` en un anverso o una cloze con `|` no vuelven iguales] → límite documentado en la spec y probado explícitamente; la previsualización de importación lo muestra.
- [jsdom no implementa `navigator.share`] → el adaptador se prueba con el objeto `navigator` sustituido en la prueba y a mano en el branch deploy desde un móvil.

## Migration Plan

Duodécimo commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos, reglas ni índices nuevos. `skip_specs: true`: el archive no sincroniza nada porque la spec base ya es la definitiva. Rollback: revertir el commit.
