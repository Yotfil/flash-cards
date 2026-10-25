# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/importacion/spec.md`. Estado esperado de `dev` cuando este change se ejecute (11.º, tras `sesion-de-repaso`):

- De `tarjetas`: `Card`, `CardContentDraft = { cardType; front; back; example? }`, `initialCardScheduling(now)`; `CardRepository.createMany` y `FakeCardRepository`; `CardsService.createMany`, `openChapter`, `cards`; `writeInCountedBatches({ firestore, bookRef, operations, delta, trailing? })` en `infrastructure/firestore/counted-batch.ts`; `normalizeCardText`, `findDuplicateCardIds`, `hasCloze`; `CardListComponent.importRequested` (botón del vacío y de la cabecera, hoy sin destino); `cardFormSchema` en `features/biblioteca/card-form.schema.ts`.
- De `libros`: `BooksService.addLocal`, `ensureLoaded`, `books`; `BookRepository`; `bookFormSchema` en `features/biblioteca/book-form.schema.ts` (`name` 1-120, `subject` opcional → `general`); `ConfirmDialogComponent` `{ title; message; detail?; confirmLabel; pendingLabel; errorMessage; action }` que bloquea sin red; `pluralize` en `shared/text/pluralize.ts`; "Importar libro" de la Biblioteca navega a `/importar`.
- De `capitulos`: `Chapter`, forma del documento; `chapterFormSchema` en `features/biblioteca/chapter-form.schema.ts` (reutiliza `bookFormSchema.shape.name`); `CapituloDetailPageComponent` con `<app-card-list>`.
- De `ajustes-de-usuario`: `SessionService.user().settings.defaultNewCardsPerDay`; `NEEDS_CONNECTION_MESSAGE`.
- De `navegacion-y-shell`: `DialogService.open` → `AppDialogRef` (`close`, `setPending`), `DIALOG_DATA`; `ConnectivityPort.online`, `FakeConnectivity`; `/importar` apunta a la página provisional; `IconComponent`, `EmptyState`.
- De `plataforma-datos-y-offline`: `BatchWriter` (`set`/`update`/`delete`/`commit` → `{ batches; written }`), `BatchCommitError.committed`, `MAX_BATCH_SIZE = 450`, `Logger`.
- Capas (ESLint): `domain` no importa Zod ni nada; `services` importa `domain` y Zod, pero NO `shared` ni `features`; `features` importa `services` y `shared`. Consecuencia: los esquemas de formulario que hoy viven en `features/biblioteca` no son alcanzables desde el parser (`services`), y `pluralize` (`shared`) tampoco.
- Código viejo de referencia en `backup/old-version` (`services/import/flashcard-parser.ts`, `import.service.ts`, `infrastructure/firestore/import.repository.firestore.ts`, `features/biblioteca/{importar-libro,card-import-dialog}`): se reescribe con TDD. Allí el cloze tenía prioridad sobre el separador, no había ` :: `, el reemplazo eran dos lotes y la validación era a mano.

## Goals / Non-Goals

**Goals:**
- Un solo parser puro, con la gramática completa (` :: ` → cloze → `|`/tab) y la validez de los formularios, que produce el paquete de libro para las dos entradas (libro y capítulo) y para `exportacion-de-libros`.
- Escritura honesta: el libro nunca aparece a medias; el reemplazo típico es atómico; todo fallo se ve donde el usuario está mirando.
- Previsualización como componente compartido entre la página y el diálogo (segundo caso real).

**Non-Goals:**
- Serializar el paquete a texto (lo hace `exportacion-de-libros` con las constantes de gramática de aquí).
- Omitir repetidas, editar el nombre del capítulo por defecto, otros formatos.

## Decisions

### 0. Mover los tres esquemas de formulario a `services` (refactor previo; capa servicios)

`bookFormSchema` → `services/books/book-form.schema.ts`, `chapterFormSchema` → `services/chapters/chapter-form.schema.ts`, `cardFormSchema` (y su helper `text()`) → `services/cards/card-form.schema.ts`, con sus specs al lado. Los diálogos de `features/biblioteca` cambian el import; comportamiento y pruebas intactos. *Por qué:* CLAUDE.md pide que "el mismo esquema valide los formularios" y la frontera; el parser es código de servicios y ESLint le prohíbe `features`. Es el mismo movimiento que `tarjetas` hizo con `deleteWithCards`. *Alternativa descartada:* duplicar los límites (1-120, 1-2000) en el parser: dos verdades que divergen. Los designs de `libros`, `capitulos` y `tarjetas` quedan con la ruta vieja; este design es la fuente de la ruta nueva (se anota en `MEMORY.md` al ejecutar).

### 1. Paquete de libro (`domain/models/book-package.ts`; capa dominio)

```ts
interface BookPackage { name: string; subject: string; chapters: PackageChapter[] }
interface PackageChapter { name: string; cards: CardContentDraft[] }
```

Contenido puro: sin ids, fechas ni programación. Es lo que el parser produce, lo que el escritor consume y lo que `exportacion-de-libros` construirá desde un libro guardado. *Por qué en dominio:* es un concepto del producto ("el contenido de un libro, separable del progreso"), no un detalle del parser; un módulo futuro de compartir publicaría paquetes (principio 4).

### 2. Parser puro (`services/import/`; capa servicios)

- `import-grammar.ts`: constantes `CHAPTER_PREFIX = '#'`, `PIPE = '|'`, `TAB = '\t'`, `EXAMPLE_SEPARATOR = ' :: '`, `LINE_BREAK = /\r\n|\r|\n/`. Exportadas para que la exportación escriba exactamente lo que el parser lee.
- `split-card-line.ts`: `splitExample(line) → { body; example? }` (primer ` :: ` con espacio a cada lado; se evalúa sobre la línea ya recortada, por eso `a | b :: ` da ejemplo vacío → `undefined`); `splitBasicCard(body) → { front; back } | null` (primer `|`, si no primer tab).
- `import-reasons.ts`: los motivos como constantes y funciones puras (`REASON_NO_SEPARATOR`, `REASON_EMPTY_SIDE`, `REASON_EMPTY_CHAPTER_NAME`, `REASON_CLOZE_WITH_SEPARATOR`, `tooLongReason('anverso' | 'reverso' | 'ejemplo' | 'nombre del capítulo', 2000 | 120)`). Viven en servicios porque los produce el parser; no llevan plurales (`pluralize` es de `shared`).
- `parse-import-text.ts`: `parseImportText(text, defaultChapterName): ImportParseResult = { package: Omit<BookPackage, 'name' | 'subject'>; errors: ImportLineError[]; validCardCount; chapterCount }`. Algoritmo por línea: recortar → vacía (ignorar) → `#` (nombre por `chapterFormSchema`; vacío o >120 reporta y no abre) → tarjeta: `splitExample` → `hasCloze(body)` → si cloze y `body` tiene `|` o tab → reportar; si cloze → `{ cardType: 'cloze', front: body, back: '', example }` → si no, `splitBasicCard` (null → sin separador; lado vacío → reportar) → validar con `cardFormSchema` del tipo; el primer `issue` de Zod se traduce a motivo por `path` (`front`/`back`/`example`) con `tooLongReason`. El capítulo por defecto se crea perezoso, como en la 0.1.1. El nombre y la materia del libro no son del parser: los pone el servicio.
- `count-repeated-lines.ts`: `countRepeatedLines(drafts, existingCards) → number`: agrupa `normalizeCardText(front) + '\u0000' + normalizeCardText(back)` de las líneas válidas y de las existentes y cuenta las LÍNEAS cuyo grupo tiene más de un miembro. Misma normalización que `findDuplicateCardIds`, otra pregunta (cuántas líneas entrarán repetidas), por eso es una función aparte y no una adaptación de aquella.

*Por qué Zod después de partir y no antes:* el esquema valida UNA tarjeta; el texto crudo se parte con reglas de texto porque la regla de oro (§5.4) es que ninguna línea aborte las demás.

### 3. Puertos y repositorios (`domain/ports/import.repository.ts`, `domain/ports/card.repository.ts`, `infrastructure/firestore/`; capas dominio e infraestructura)

- **`ImportRepository.importBook(uid, input: ImportBookInput): Promise<string>`** con `ImportBookInput = { book: BookDraft & { order; cardCount }; chapters: { name; order; cards: NewCardInput[] }[] }`. El adaptador Firestore reserva `doc()` del libro, acumula en un `BatchWriter` los `set` de capítulos y tarjetas y, al final, el `set` del libro con `cardCount` ya calculado; `commit()` parte en lotes de 450 en ese orden, así el libro va en el último. Si `commit` lanza `BatchCommitError`, el adaptador intenta `new BatchWriter().delete(...committed).commit()` y lanza `ImportBookError { committedCount; rolledBack: boolean; cause }`. NO usa `writeInCountedBatches`: su `update(bookRef, increment)` falla sobre un libro que aún no existe. *Alternativa descartada:* crear primero el libro con `cardCount 0` e ir sumando: el libro aparecería a medias en la Biblioteca, justo lo que la spec prohíbe.
- **`writeInCountedBatches` con delta por operación:** la firma pasa a `{ firestore, bookRef, operations: CountedOperation[], trailing? }` con `CountedOperation = { apply: (writer: BatchWriter) => void; delta: -1 | 0 | 1 }`; cada grupo de 448 suma sus deltas en un único `increment`. `createMany` (+1), `deleteManyWithCount` (−1) y `deleteWithCards` (−1) se adaptan sin cambiar comportamiento (sus pruebas de integración siguen en verde). Tercer caso real que pide la generalización: el reemplazo mezcla −1 y +1 en el mismo lote.
- **`CardRepository.replaceInChapter(uid, bookId, chapterId, cardIdsToDelete, inputs): Promise<Card[]>`**: una sola llamada a `writeInCountedBatches` con los `delete` (−1) seguidos de los `set` (+1). Con ≤ 448 operaciones es un lote: atómico. Devuelve las tarjetas creadas para el recurso. `FakeCardRepository` lo implementa en memoria con fallo configurable.
- Fakes: `testing/fake-import-repository.ts` (`importBook` resuelve con un id o lanza `ImportBookError` según se configure; guarda el último `input`).

### 4. Servicio de importación (`services/import/import.service.ts`; capa servicios)

`ImportService` (inyectable):
- `importBook(name, subject, parse: ImportParseResult): Promise<ImportBookSummary>`: `requireSessionUid`, `books.ensureLoaded()`, `name.trim() || 'Libro importado'`, `subject.trim() || 'general'`, `order = books.nextOrder()` (se extrae de `BooksService.create` como método público: segundo caso real), `newCardsPerDay` del perfil, `maxReviewsPerDay = 200`, `cardCount = validCardCount`; arma `ImportBookInput` con `noteId = crypto.randomUUID()`, `direction forward`, `scheduling = initialCardScheduling(now)`, `suspended false`, `example` solo si existe; llama al puerto; `books.addLocal(book)`; devuelve `{ bookId, chapterCount, cardCount }`. Si el puerto lanza, registra en `Logger` (`committedCount`, `rolledBack`) y relanza: la página elige el texto.
- `importIntoChapter(bookId, chapterId, drafts, mode: 'append' | 'replace'): Promise<void>`: `append` → `cards.createMany(bookId, chapterId, drafts)`; `replace` → `cards.replaceAll(bookId, chapterId, drafts)` (nuevo en `CardsService`: toma los ids del recurso cargado, llama a `replaceInChapter`, sustituye el valor del recurso por las creadas y `books.changeCardCount(bookId, created − deleted)`). Con `drafts` vacío no llama a nada.
- `previewForBook(text, bookName)` y `previewForChapter(text, chapterName, existingCards)`: funciones puras envueltas (`parseImportText` + `countRepeatedLines`); devuelven `ImportPreview = { parse; repeatedCount }`. Son puras para que los componentes solo pinten.

### 5. Previsualización compartida (`features/importacion/import-preview/`; capa UI)

`ImportPreviewComponent` recibe `preview: ImportPreview` y `showChapters: boolean`; pinta la línea de conteos con plural real (`importCopy` sobre `pluralize`): "2 capítulos · 4 tarjetas · 1 repetida" (repetidas solo si > 0, con la frase "Se importarán igual. Las verás marcadas como repetidas." debajo), y si hay errores, "N líneas se omitirán:" con `<ul>` de "Línea N: motivo" precedidas de `IconComponent name="alert"`, en color de texto secundario (nunca el rojo de calificación). Región `aria-live="polite"` para los conteos. Superficie **sólida** (`surface-solid`), es la pantalla clave de la guía §9.3. Segundo caso real: la página y el diálogo pintan exactamente lo mismo.

### 6. Página "Importar un libro" (`features/importacion/importar-libro-page/`; capa UI)

- Ruta `/importar` → `ImportarLibroPageComponent` (sustituye a la provisional en `app.routes.ts`).
- Signal Forms con `importBookFormSchema = z.object({ name: bookFormSchema.shape.name.or(z.literal('')), subject: bookFormSchema.shape.subject })` en `services/import/import-book-form.schema.ts`: el nombre puede quedar vacío (→ "Libro importado") pero no superar 120; la materia como en "Nuevo libro". `text = signal('')`; `preview = computed(() => importService.previewForBook(text(), name() || 'Libro importado'))`: en vivo, sin debounce (el parser es lineal; 10 000 líneas tardan milisegundos).
- "Cargar archivo": `<input type="file" accept=".txt,.md,text/plain">` oculto tras un botón; `file.text()` reemplaza el texto; `input.value = ''` tras leer para poder recargar el mismo archivo; si el nombre no fue tocado (`nameTouched` signal), propone el nombre sin `.txt`/`.md`.
- Botón "Importar N": deshabilitado si `validCardCount === 0`, formulario inválido, `importing()` o `!online()`; sin red muestra `NEEDS_CONNECTION_MESSAGE` al lado. Al confirmar: `importing = true`, `importService.importBook(...)`, `router.navigate(['/biblioteca', bookId])`; si lanza, `errorMessage = IMPORT_BOOK_ERROR` en `<p role="alert">` encima de los botones y todo se conserva. Reenvíos ignorados mientras `importing`.
- Textos en `features/importacion/importacion.copy.ts` (`importCopy`): títulos, pista de la convención (menciona `#`, `|` y ` :: `), etiquetas de modo, mensajes de error, `countsLine`, `omittedHeading(n)`, `importLabel(n)`.

### 7. Diálogo "Importar tarjetas" (`features/importacion/card-import-dialog/`; capa UI)

- Se abre con `DialogService.open(CardImportDialogComponent, { label: 'Importar tarjetas', size: 'lg', data: { bookId; chapterId; chapterName; chapterCards: Signal<Card[]> } })` desde `CapituloDetailPageComponent` al recibir `importRequested`; devuelve `true` si importó.
- `preview = computed(() => importService.previewForChapter(text(), chapterName, chapterCards()))`; `mode = signal<'append' | 'replace'>('append')` con `<fieldset>` y la pregunta de la spec.
- Confirmar en `append` → `importing`, `importIntoChapter(..., 'append')`, `close(true)`; fallo → `role="alert"` dentro, texto intacto. En `replace` con capítulo con tarjetas → abre `ConfirmDialogComponent` con `title "¿Reemplazar todas las tarjetas?"`, `message = replaceWarning(n)` (singular/plural de la spec), `confirmLabel "Reemplazar todo"`, `pendingLabel "Reemplazando…"`, `errorMessage = IMPORT_CARDS_ERROR`, `action = () => importIntoChapter(..., 'replace')`; si devuelve `true`, el diálogo de importación se cierra con `true`; si se cancela, sigue abierto con el texto. En `replace` con capítulo vacío → directo, sin confirmación.
- Mientras importa: `setPending(true)` (bloquea Escape), botones deshabilitados, "Importando…". Sin red: botón principal deshabilitado con `NEEDS_CONNECTION_MESSAGE`.
- El detalle del capítulo, tras `true`, refresca `cardCountFor` (misma salida `contentsChanged` que ya usa `tarjetas`).

### 8. Documentación

`docs/especificacion-anki-mejorada.md` §5 recibe una nota al inicio: "Sustituido por la spec de OpenSpec `importacion` (pegar texto, cloze, ` :: `, materia). Se conserva como historia." `README.md` menciona la convención con las tres columnas.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Página de importar: campos, área de texto, previsualización | sólidos (`surface-solid`); la previsualización es la pantalla clave y se lee | 0 |
| Panel del diálogo "Importar tarjetas" y de la confirmación | `glass` (overlay del CDK, fondo oscurecido); dentro, previsualización y campos sólidos | 1 (sustituye a la lista) |
| Lista de omitidas | texto secundario + icono; sin escala rojo→verde | 0 |

Fondo de gestión con el brillo vinotinto tenue. Con `prefers-reduced-transparency`, todo sólido por tokens.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `BookPackage`, `PackageChapter` (`domain/models/book-package.ts`) | `exportacion-de-libros` (lo construye desde un libro), futuro módulo de compartir |
| Constantes de gramática `import-grammar.ts` (`EXAMPLE_SEPARATOR`, `CHAPTER_PREFIX`, `PIPE`) y `parseImportText` | `exportacion-de-libros` (serializa con las mismas constantes; prueba de ida y vuelta) |
| `countRepeatedLines` | `exportacion-de-libros` no; queda para una futura casilla "No importar repetidas" |
| `ImportRepository`, `FakeImportRepository`, `ImportBookError` | `exportacion-de-libros` no escribe; futuro compartir (copiar un paquete al espacio de otro usuario) |
| `writeInCountedBatches` con delta por operación; `CardRepository.replaceInChapter`; `CardsService.replaceAll` | Cualquier operación mixta de altas y bajas |
| `BooksService.nextOrder()` | Futuro reordenar libros |
| Esquemas en `services/{books,chapters,cards}` | Todo formulario y toda frontera que valide esos tipos |
| `ImportPreviewComponent`, `importCopy` | Reutilizable si aparece una tercera entrada (p. ej. importar en un libro existente) |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Líneas en blanco y de solo espacios; Saltos de línea de Windows; Texto vacío; No hay comentarios | `parse-import-text.spec`: los cuatro textos exactos → conteos y motivos exactos | unitaria pura |
| Ejemplo completo de la convención; Encabezado sin nombre; Encabezado vacío de tarjetas; Encabezado demasiado largo | `parse-import-text.spec`: 2 capítulos/4 válidas/0 errores; errores en líneas 1 y 2; "B" sin tarjetas y `chapterCount 2`; 121 caracteres → motivo exacto y la tarjeta en el capítulo por defecto | unitaria pura |
| Texto sin ningún encabezado; Tarjetas antes del primer encabezado; El texto arranca con encabezado | `parse-import-text.spec`: nombre por defecto "Mi libro"/"Defecto"; sin capítulo por defecto si arranca con `#` | unitaria pura |
| Separador pipe; tabulador; Solo el primer separador cuenta; Recorte de espacios; Línea sin separador; Lado vacío; Anverso demasiado largo | `split-card-line.spec` (partición) y `parse-import-text.spec` (motivos y líneas; 2001 caracteres → "El anverso supera los 2000 caracteres.") | unitaria pura |
| Línea cloze; Marcador vacío no hace cloze; Cloze con separador se omite | `parse-import-text.spec`: `cardType cloze` y `back ''`; `{{}}` → sin separador; `I {{gave up}} \| rendirse` → motivo exacto en la línea 1 | unitaria pura |
| Tarjeta básica con ejemplo; Cloze con ejemplo; Dos puntos dobles pegados; Solo el primer separador de ejemplo; Ejemplo vacío; Ejemplo demasiado largo | `split-card-line.spec`: `splitExample` con los seis casos (`std::vector` sin ejemplo, `a \| b :: ` → `undefined`); `parse-import-text.spec`: 2001 caracteres → motivo | unitaria pura |
| El ejemplo se guarda | `import.service.spec`: `importIntoChapter` pasa `example` al `createMany`; `import.repository.integration.spec`: documento con `example` recortado | unitaria pura + integración |
| Mezcla de válidas e inválidas; Las líneas en blanco cuentan | `parse-import-text.spec`: 3 válidas/2 errores con líneas exactas; error en la línea 3 | unitaria pura |
| Previsualización con errores; Nada válido; Plural en singular; Sin repetidas no hay contador | `importacion.copy.spec`: `countsLine`, `omittedHeading(1/2)`, `importLabel(4)`; `import-preview.component.spec`: textos exactos, sin línea de repetidas con 0, icono en cada omitida | unitaria pura + componente |
| Nada se guarda antes de confirmar | `card-import-dialog.component.spec` y `importar-libro-page.component.spec`: cerrar/cancelar sin confirmar → fakes sin llamadas | componente |
| Repetida contra una existente; Repetida dentro del mismo texto; Repetidas al importar un libro | `count-repeated-lines.spec`: 1 contra existente, 2 dentro del texto, capitalización distinta cuenta; `import.service.spec`: `previewForBook` no recibe tarjetas existentes | unitaria pura |
| Nombre propuesto desde el archivo; El nombre editado se respeta | `importar-libro-page.component.spec`: `File` "Phrasal Verbs.txt" → nombre y texto; con nombre tocado, se respeta | componente |
| Libro armado con sus metadatos; Nombre vacío; Tarjetas importadas nacen nuevas; Materia escrita | `import.service.spec` con fakes: recortes, `general`, `Francés`, `order` siguiente, `newCardsPerDay` del perfil (7), `cardCount 3`, `order` de capítulos 0 y 1, `noteId` distintos, `scheduling === initialCardScheduling`, `addLocal` llamado | unitaria pura |
| Materia demasiado larga | `import-book-form.schema.spec`: materia > máximo falla con el mensaje de `bookFormSchema`; nombre `''` pasa | unitaria pura |
| Importación exitosa (libro); Falla la escritura; Doble clic en importar | `importar-libro-page.component.spec`: navega a `/biblioteca/{id}`; fake que lanza → `role="alert"` con el texto y nombre/materia/texto intactos; dos clics → un `importBook`, "Importando…" | componente |
| Falla a mitad en un libro grande | `import.repository.integration.spec`: 1000 tarjetas donde el segundo lote apunta a un árbol ajeno → `ImportBookError` con `rolledBack true`, no existe el libro, 0 tarjetas bajo ese `bookId`; caso feliz: libro, 3 capítulos con `order`, 1000 tarjetas, `cardCount 1000` | integración |
| Agregar emite directo | `card-import-dialog.component.spec`: `append` → `importIntoChapter(..., 'append')` sin `ConfirmDialog` | componente |
| Reemplazar pide confirmación; Reemplazo confirmado; Capítulo vacío no pide confirmación; Cancelar la confirmación; Aviso en singular; Reemplazo que falla no deja el capítulo vacío | `importacion.copy.spec`: `replaceWarning(1/5)`; `card-import-dialog.component.spec`: confirmación abierta sin escribir, `false` → nada y texto intacto, vacío → directo; `card.repository.integration.spec`: `replaceInChapter` de 2 por 3 → `cardCount` +1 en UN lote (`batches 1`) y solo las 3 nuevas; fallo (árbol ajeno en las altas) → las 2 siguen y el contador no cambió; `cards.service.spec`: `replaceAll` sustituye el recurso y llama a `changeCardCount(+1)` | unitaria pura + componente + integración |
| Falla a mitad al agregar | `counted-batch.integration.spec`: 900 operaciones con delta +1 donde el segundo grupo apunta a un árbol ajeno → `BatchCommitError`, 448 creadas y `cardCount` +448 exactos; `card-import-dialog.component.spec`: fake que lanza → `role="alert"` dentro y texto intacto | integración + componente |
| Delta por operación | `counted-batch.integration.spec`: 2 `delete` (−1) + 3 `set` (+1) → un lote y `cardCount` +1; `deleteWithCards` y `createMany` siguen en verde | integración |
| Importación exitosa (capítulo); Falla la importación | `card-import-dialog.component.spec`: `close(true)`; fake que lanza → abierto, alerta dentro, Cancelar disponible; `capitulo-detail-page.component.spec`: `importRequested` abre el diálogo y `true` refresca el conteo | componente |
| Previsualizar sin red; Vuelve la red; Entrar a importar sin red | `card-import-dialog.component.spec` e `importar-libro-page.component.spec` con `FakeConnectivity`: previsualización completa, botón deshabilitado con `NEEDS_CONNECTION_MESSAGE`, `setOnline(true)` habilita; `biblioteca-page.component.spec` ya cubre que "Importar libro" navega (no se condiciona a la red) | componente |
| Esquemas movidos | `book-form.schema.spec`, `chapter-form.schema.spec`, `card-form.schema.spec` pasan desde su nueva ruta; `npm run lint` sin violaciones de capas | unitaria pura |

## Risks / Trade-offs

- [Un cloze cuyo texto lleva un `|` legítimo no se puede importar] → se omite con motivo claro; el usuario lo crea a mano (el formulario sí lo admite). Documentado en la spec.
- [` :: ` dentro de un texto natural] → requiere espacios a ambos lados, raro en prosa; la exportación lo escribe igual, así que el ida y vuelta es exacto.
- [La compensación también falla] → tarjetas y capítulos huérfanos bajo un `bookId` inexistente; invisibles (todas las lecturas van por libro) y registrados en `Logger` con el conteo. Limpieza manual si alguna vez pasa.
- [Mover los esquemas toca tres changes ya aprobados] → refactor mecánico al inicio, con sus specs en verde antes y después; se anota en `MEMORY.md`.
- [Cambiar la firma de `writeInCountedBatches`] → tres consumidores, todos con pruebas de integración; se adaptan en la misma tarea.
- [Previsualización en vivo sobre textos enormes] → el parser es lineal y sin regex costosas; si un archivo de decenas de miles de líneas se notara, se añade `debounce`, sin cambiar la spec.
- [`file.text()` y codificación] → se asume UTF-8 (§5.1); un archivo en otra codificación mostrará caracteres raros en la previsualización, que es justo donde el usuario puede verlo antes de guardar.

## Migration Plan

Undécimo commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos, reglas ni índices nuevos. `/importar` deja de ser provisional. Rollback: revertir el commit.
