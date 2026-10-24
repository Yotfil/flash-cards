# Design

## Context

Ver `proposal.md` (Why). Estado esperado de `dev` cuando este change se ejecute (tras `ajustes-de-usuario`):

- `SessionService.user()`, `requireSessionUid`, `user().settings.defaultNewCardsPerDay`; `DialogService.open(component, { label, size, data })` → `AppDialogRef` con `close`, `setPending`; política "un diálogo solo se cierra con éxito"; `EmptyState`, `ErrorState`, `Skeleton`, `IconComponent`; contrato `resource()`; `boundedInteger`; `parseDocument`, `firestoreTimestamp`, `BatchWriter`, tokens `FIRESTORE`; `tests/support/firestore-test-environment.ts`; `PendingPageComponent` en `/biblioteca`, `/biblioteca/:bookId` e `/importar`; `ConnectivityPort.online` y `FakeConnectivity` (`navegacion-y-shell`).
- Índices declarados: `cards(bookId, scheduling.due)`, `cards(bookId, scheduling.state)`, `reviewLogs(bookId, reviewedAt)`. El segundo lo usa por primera vez el conteo de totales.
- Código viejo de referencia en `backup/old-version` (`services/books.service.ts`, `features/biblioteca/{biblioteca,libro-detail,book-form-dialog,book-settings-dialog,confirm-dialog}`, `infrastructure/firestore/book.repository.firestore.ts`): se reescribe con TDD; hallazgos 1 a 8 decididos.
- Prototipo aprobado `docs/design/cadence-prototipo-extendido.html`: lista de libros en tarjetas de acrílico, detalle con "dominadas / en aprendizaje / nuevas".

## Goals / Non-Goals

**Goals:**
- Primer consumidor real del patrón `resource()` con los cuatro estados, que `capitulos`, `tarjetas` y `progreso` copiarán.
- Primer `ConfirmDialog` reutilizable y primera cascada por lotes.
- Que `capitulos` solo tenga que añadir su lista bajo la cabecera del detalle y su cascada de tarjetas.

**Non-Goals:**
- Capítulos, tarjetas, estudiar, importar: sus changes.
- Reordenar libros.

## Decisions

### 1. Modelo y puerto (`domain/models/book.model.ts`, `domain/ports/book.repository.ts`)

`Book`, `BookDraft` y `StudyDirection` como en el código viejo (compatibles con los datos). `BookRepository`: `listByUser(uid)`, `create(uid, draft & { order })`, `update(uid, bookId, changes)`, `incrementCardCount(uid, bookId, delta)` (atómico, `increment`), `countContents(uid, bookId): Promise<{ chapters: number; cards: number }>` (agregaciones), `deleteWithContents(uid, bookId): Promise<void>` (cascada), `countCardsByState(uid, bookId): Promise<{ newCards: number; learning: number; review: number }>` (agregaciones con `where bookId == && scheduling.state in …`). Sin `delete` simple: ya no hay caso de uso.

*Por qué los conteos de tarjetas en el repositorio de libros y no en el de tarjetas:* no leen documentos de tarjeta ni dependen de su esquema; son preguntas sobre el libro. `tarjetas` tendrá su propio repositorio para el contenido.

### 2. Cascada en `FirestoreBookRepository.deleteWithContents` con `BatchWriter`

Lee solo referencias: `getDocs(query(cards, where('bookId', '==', bookId)))` y lo mismo en `chapters`; añade `delete` de cada tarjeta, luego de cada capítulo y por último del libro, y `commit()`. Un `BatchCommitError` sube tal cual: el libro sigue existiendo (va en el último lote) con menos contenido, y reintentar borra lo que quede. `reviewLogs` y `dailyStats` no se tocan (las reglas tampoco permitirían borrar logs).

### 3. `BooksService` en `services/books/books.service.ts` (capa servicios)

- `books = resource({ loader: () => repo.listByUser(requireSessionUid(session.user())) })`; `reload()` al abrir la Biblioteca; `ensureLoaded()` solo carga si el recurso está `idle`/sin valor (para la navegación directa al detalle).
- Mutaciones locales sobre el recurso con `books.update(...)`: `create` (orden = máximo + 1, append), `update`, `remove`, `changeCardCount`, `addLocal` (para la importación).
- `countContents(bookId)` y `totalsFor(bookId: Signal<string | undefined>)` → `resource` con `params: () => connectivity.online() ? bookId() : undefined`, para la cabecera del detalle: sin red no pide (los conteos siempre van al servidor, transversal 6) y al volver la red pide.
- `findById(bookId)` computed sobre el valor del recurso: `undefined` mientras carga, `null` si no existe.
- Mensajes de error no viven aquí: el servicio relanza y la pantalla elige el texto de `biblioteca.copy.ts`.

### 4. Diálogos por servicio (`features/biblioteca/book-form-dialog`, `book-settings-dialog`; `shared/confirm-dialog`)

- `BookFormDialogComponent` recibe `{ mode: 'create' | 'edit'; book?: Book }` por `DIALOG_DATA` y devuelve el `Book` creado o actualizado. Signal Forms con `bookFormSchema` de Zod: `name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120)`, `subject: z.string().trim()` (opcional; vacío → `general` en el servicio), `studyDirection: z.enum(['forward', 'both'])`. Botón deshabilitado si inválido, `saving` o `!connectivity.online()` (sin red muestra `NEEDS_CONNECTION_MESSAGE` dentro; al volver la red se habilita sin tocar los campos); `setPending(true)` mientras guarda; error dentro del diálogo con `role="alert"`; `close(book)` solo con éxito.
- `BookSettingsDialogComponent` recibe `{ book }`: `newCardsPerDay: boundedInteger(0, 999, 'Escribe un número entero entre 0 y 999.')`, `maxReviewsPerDay: boundedInteger(0, 9999, 'Escribe un número entero entre 0 y 9999.')`, pista "0 = sin tope"; persiste solo esos dos campos. Mismo bloqueo sin red que el formulario del libro.
- `ConfirmDialogComponent` (shared) recibe `{ title; message; detail?; confirmLabel; pendingLabel; errorMessage; action: () => Promise<void> }` y devuelve `true` si la acción terminó con éxito. Ejecuta `action` él mismo: así la política "solo se cierra con éxito" vive en un solo lugar y el error ("No se pudo borrar el libro. Inténtalo de nuevo.", pasado en `data.errorMessage`) se pinta dentro con reintento. Inyecta `ConnectivityPort`: sin red, el botón de confirmar queda deshabilitado con `NEEDS_CONNECTION_MESSAGE` dentro, Cancelar y Escape siguen cerrando, y al volver la red se habilita. Segundo caso real: `capitulos` y `tarjetas` lo reutilizan tal cual.

### 5. Pantallas (`features/biblioteca/biblioteca-page`, `libro-detail-page`, `book-card`)

- `BibliotecaPageComponent`: al iniciar, `books.reload()`; pinta según `status()`: `Skeleton` (3 tarjetas), `ErrorState` con `retry → reload()`, `EmptyState` con los dos botones (vacío como onboarding: "Aún no tienes libros" + "Crea el primero o importa uno que ya tengas."), o cabecera con acciones y lista de `BookCardComponent` (`glass-soft`, `press`, botones de icono "Ajustes de {nombre}" y "Borrar {nombre}" con `aria-label`). "Importar libro" navega a `/importar`. Al pulsar Borrar: con red pide `countContents` (si falla, `null`); sin red usa `null` sin pedir nada; luego abre la confirmación con `detail = bookDeletionDetail(counts)`.
- `LibroDetailPageComponent`: `ensureLoaded()`; `book = findById(route.bookId)`; estados: cargando → `Skeleton`; error → `ErrorState`; `null` → `EmptyState` "Libro no encontrado" con enlace a la Biblioteca; libro → cabecera (enlace "← Biblioteca", nombre, etiqueta de materia, totales desde `totalsFor`, botón de ajustes) y debajo una región `<section aria-label="Capítulos">` con la página provisional "Pronto" que `capitulos` sustituye. Los totales se pintan como tres cifras con rótulo y conteo redundante al color (nada de la escala de calificación: texto en acento y atenuados). Según el recurso de totales: cargando → esqueleto de una línea; resuelto → las tres cifras; sin valor (sin red) o error → se omiten, sin mensaje de error.
- Textos en `biblioteca.copy.ts`, con plural real (`pluralize(n, 'tarjeta', 'tarjetas')` en `shared/text/pluralize.ts`, segundo caso real: también lo usan los conteos de la confirmación). `bookDeletionDetail(counts: { chapters; cards } | null)` es pura: con conteos → "Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva."; `null` → "También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva.".

### 6. Rutas

`/biblioteca` → `BibliotecaPageComponent`; `/biblioteca/:bookId` → `LibroDetailPageComponent`; `/importar` y `/biblioteca/:bookId/:chapterId` siguen provisionales.

### 7. Sin conexión (transversal 6, T2; añadido el 2026-10-23 por `opsx:update`)

Sin red, la promesa de una escritura de Firestore no se resuelve hasta que vuelve la conexión, y los conteos siempre van al servidor. Por eso, sin red la gestión no se ofrece y estudiar sí. `shared/text/connection.copy.ts` exporta `NEEDS_CONNECTION_MESSAGE` = "Necesitas conexión para guardar cambios.". Lo usan los tres diálogos de este change, y luego `capitulos`, `ajustes-de-usuario`, `tarjetas` e `importacion`: ese es el segundo caso real que justifica compartirlo. El bloqueo vive en cada diálogo que guarda y no en `DialogService`, porque el servicio no sabe qué diálogos guardan. La señal es `ConnectivityPort.online`.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Tarjetas de libro en la lista | `glass-soft` | 2 |
| Panel de cualquier diálogo | `glass` (del servicio de diálogos); su fondo oscurecido cubre la lista | sustituye a la lista |
| Cabecera del detalle, totales, estados | sólidos o sin fondo | 0 |

Las tarjetas de libro tienen `press` (escala), no desenfoque animado: el acrílico no anima. Con `prefers-reduced-transparency`, sólidas por tokens.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `Book`, `BookDraft`, `StudyDirection`; `BookRepository` con `incrementCardCount`, `countContents`, `countCardsByState` | `capitulos`, `tarjetas`, `importacion`, `cola-diaria`, `progreso` |
| `BooksService.books` (resource), `findById`, `ensureLoaded`, `addLocal`, `changeCardCount`, `totalsFor` | `capitulos` (detalle), `importacion` (añadir sin recargar), `tarjetas` (contador) |
| `ConfirmDialogComponent` en `shared` con `action` y política de cierre | `capitulos`, `tarjetas` (borrado individual y masivo), `importacion` (reemplazar) |
| `ConfirmDialogComponent` bloquea su confirmación sin red; `NEEDS_CONNECTION_MESSAGE` en `shared/text/connection.copy.ts` | `capitulos` (su tarea 0.1 lo comprueba), `ajustes-de-usuario`, `tarjetas`, `importacion` |
| `bookFormSchema` como segundo formulario Signal Forms + Zod; `pluralize` | Formularios de capítulo y tarjeta; todo copy con conteos |
| Región "Capítulos" del detalle con página provisional | `capitulos` la sustituye por su lista |
| Patrón de pantalla con `resource()`: esqueleto / error / vacío / lista | Todas las pantallas que leen |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Orden por `order`; Libro sin contador guardado; Abrir el detalle | `book.repository.integration.spec`: `listByUser` ordena por `order`; `biblioteca-page.component.spec` con `FakeBookRepository`: tarjetas en orden, "0 tarjetas", "1 tarjeta", "12 tarjetas"; tocar navega a `/biblioteca/{id}` | integración + componente |
| Sin sesión activa | `books.service.spec`: con sesión `signedOut`, el recurso queda en error "No hay una sesión activa." y `create` lanza sin llamar al repositorio | unitaria pura |
| Cargando; Falla la lectura; Biblioteca vacía; Biblioteca con libros | `biblioteca-page.component.spec`: esqueleto `aria-busy` sin acciones; repo que lanza → "No pudimos cargar tus libros" y `Reintentar` relanza la lectura; vacío → título, frase y dos botones; con libros → cabecera y lista. Un fallo nunca pinta el vacío | componente |
| Libro corrupto en el almacén | `book.repository.integration.spec`: documento sin `name` → lanza `InvalidDocumentError`; `biblioteca-page.component.spec`: estado de error | integración + componente |
| Siembra de nuevas por día; Primer libro; Libro al final; Materia en blanco; Nombre vacío; Cancelar | `books.service.spec`: `create` usa `defaultNewCardsPerDay` 7 y 200, `order` 0 y 6, `subject` `general` con espacios; `book-form-dialog.component.spec`: nombre de solo espacios deshabilita y muestra "El nombre es obligatorio." al tocar; materia vacía no bloquea; Cancelar y Escape cierran sin resultado | unitaria pura + componente |
| Editar conserva los topes; Cambio visible al instante | `books.service.spec`: `update` no toca `newCardsPerDay` ni `maxReviewsPerDay` y refleja el nombre en el recurso sin recargar; `book-form-dialog.component.spec`: modo editar precarga | unitaria pura + componente |
| Precarga de valores; Guardar solo los topes; Valor negativo; Valor con decimales; Cero significa sin tope | `book-settings-dialog.component.spec`: precarga 12 y 150; guardar llama con `{ newCardsPerDay: 5, maxReviewsPerDay: 150 }`; -1 y 2.5 deshabilitan y muestran el texto exacto; 0 guarda y "0 = sin tope" visible | componente |
| Conteo no disponible | `biblioteca.copy.spec`: `bookDeletionDetail` con `{ chapters: 3, cards: 40 }` y con `null` da los textos exactos; `biblioteca-page.component.spec`: si `countContents` lanza, la confirmación se abre con el texto sin números | unitaria pura + componente |
| Crear sin conexión; Ajustes sin conexión; Borrar sin conexión; Vuelve la conexión; Totales no disponibles | Con `FakeConnectivity`: `confirm-dialog.component.spec`, sin red confirmar deshabilitado con `NEEDS_CONNECTION_MESSAGE`, Cancelar cierra con `false` y con `setOnline(true)` se habilita; `book-form-dialog.component.spec` y `book-settings-dialog.component.spec`, botón principal deshabilitado con el aviso y habilitado al volver la red con los valores intactos; `biblioteca-page.component.spec`, sin red borrar no llama a `countContents` y usa el texto sin números; `books.service.spec`, `totalsFor` sin red no llama y al volver la red pide; `libro-detail-page.component.spec`, sin red o con el conteo que lanza, la cabecera no muestra totales ni `role="alert"` | componente + unitaria pura |
| Confirmar borrado; Conteos en la confirmación; Cancelar borrado; Falla el borrado | `book.repository.integration.spec`: libro con 3 capítulos y 40 tarjetas sembrados → `countContents` devuelve 3 y 40; `deleteWithContents` deja las tres colecciones sin ese libro y conserva un `reviewLog` sembrado; con 900 tarjetas usa varios lotes; `confirm-dialog.component.spec` (shared): pinta título, mensaje y detalle; "Borrando…" y ocupado; acción que falla → sigue abierto con el error y permite reintentar; éxito → `closed` resuelve `true`; Cancelar → `false`; `biblioteca-page.component.spec`: el libro sale de la lista solo tras el éxito | integración + componente |
| Crear tarjetas suma; Borrar tarjetas resta | `book.repository.integration.spec`: `incrementCardCount(+3)` y `(-2)` sobre 10 → 13 y 11, atómico; `books.service.spec`: `changeCardCount` refleja en el recurso | integración + unitaria pura |
| Libro añadido por importación | `books.service.spec`: `addLocal` añade al final si el recurso está resuelto y no hace nada si no | unitaria pura |
| Navegación directa; Totales por estado; Falla la carga de la biblioteca; Libro borrado o ajeno; Ajustes desde el detalle | `book.repository.integration.spec`: `countCardsByState` con tarjetas sembradas en estados 0, 1, 2 y 3 → 20 / 4 / 12 sin leer documentos; `libro-detail-page.component.spec` con `RouterTestingHarness`: entra directo → `ensureLoaded` y cabecera; repo que lanza → `ErrorState`; id inexistente → "Libro no encontrado" con enlace; botón de ajustes abre el diálogo con el libro | integración + componente |
| Hay tarjetas listas; Nada que estudiar; Falla la preparación; Doble toque | `cola-diaria` | diferido |
| Guardado en curso; Envío duplicado; Falla el guardado; Éxito limpia el error anterior | `book-form-dialog.component.spec`: botones deshabilitados, "Guardando…", Escape bloqueado, segundo envío ignorado; repo que lanza → sigue abierto con el mensaje `role="alert"` y los valores; reintento con éxito cierra con el libro | componente |
| Escape cierra; Botón de ajustes nombrado | `book-form-dialog.component.spec` (Escape sin acción en vuelo cierra); `biblioteca-page.component.spec`: `aria-label="Ajustes de Inglés"` y `"Borrar Inglés"` | componente |
| Plural real en conteos | `pluralize.spec`: 0, 1 y 12 | unitaria pura |

## Risks / Trade-offs

- [Cascada no atómica en libros grandes] → el libro va en el último lote; un fallo deja un libro con menos contenido y reintentar termina. Mismo criterio que la importación.
- [`countCardsByState` con `in` sobre `scheduling.state` más igualdad en `bookId`] → el índice compuesto ya está declarado; el emulador no lo exige. Al desplegar, si Firestore pide otro índice, se añade a `firestore.indexes.json` y se anota.
- [Conteos de la confirmación desfasados si otra pestaña escribe] → se recalculan al abrir el diálogo; el borrado real borra lo que haya, no lo que se contó.
- [Recurso con mutaciones locales] → `books.update` mantiene `status` en `local`; las pantallas tratan `local` como `resolved`. Se documenta en el contrato del patrón.
- [`navigator.onLine` dice que hay red y no la hay, o la red cae a mitad de un guardado] → el diálogo espera en "Guardando…" y termina al volver la red; riesgo aceptado en el transversal 6.

## Migration Plan

Quinto commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos ni reglas. Rollback: revertir el merge.
