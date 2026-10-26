# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/capitulos/spec.md`. Estado esperado de `dev` cuando este change se ejecute (tras `libros` y su `opsx:update` por el transversal 6):

- De `libros`: `Book`, `BookRepository` con `incrementCardCount`; `BooksService.books` (recurso), `ensureLoaded()`, `findById(bookId)` (`undefined` cargando, `null` si no existe), `changeCardCount(bookId, delta)`, `totalsFor(bookId)`; `bookFormSchema`; `pluralize`; `ConfirmDialogComponent` en `shared` con `{ title; message; detail?; confirmLabel; pendingLabel; errorMessage; action }`, que devuelve `true` solo si la acción terminó con éxito; `LibroDetailPageComponent` con la región `<section aria-label="Capítulos">` provisional; `biblioteca.copy.ts` con el texto "Libro no encontrado".
- Del `opsx:update` de `libros` por T2 (aplicado el 2026-10-23): `ConfirmDialogComponent` deshabilita su confirmación sin red y muestra `NEEDS_CONNECTION_MESSAGE` ("Necesitas conexión para guardar cambios."), de `shared/text/connection.copy.ts` (nace en `ajustes-de-usuario`).
- De `navegacion-y-shell`: `DialogService.open(component, { label, size, data })` → `AppDialogRef` con `close` y `setPending`; `EmptyState`, `ErrorState`, `Skeleton`, `IconComponent` (con `back`); `ConnectivityPort.online` y `FakeConnectivity`; `PendingPageComponent`; contrato de pantalla con `resource()`.
- De `plataforma-datos-y-offline`: `parseDocuments`, `firestoreTimestamp`, `InvalidDocumentError`, `BatchWriter`, `MAX_BATCH_SIZE = 450`, `tests/support/firestore-test-environment.ts`.
- De `autenticacion-y-acceso`: `SessionService.user()`, `requireSessionUid` ("No hay una sesión activa.") y sus fakes.
- Código viejo de referencia en `backup/old-version` (`services/chapters.service.ts`, `infrastructure/firestore/chapter.repository.firestore.ts`, `schemas/chapter.schema.ts`, `features/biblioteca/{chapter-form-dialog,capitulo-detail,libro-detail}`). Se reescribe con TDD. Ese código acepta nombres de capítulo vacíos (hallazgo 2), así que puede haber datos con `name: ""`.
- Prototipo aprobado `docs/design/cadence-prototipo-extendido.html`: filas de capítulo con posición, nombre, "N tarjetas" y "Añadir un capítulo" al final.

## Goals / Non-Goals

**Goals:**
- Que `tarjetas` solo tenga que sustituir la región "Tarjetas" del detalle de capítulo, sabiendo que ese detalle ya resolvió libro y capítulo.
- Cascada de capítulo que nunca deje el contador del libro desfasado, ni siquiera tras un fallo a mitad.
- Primer consumidor del gate de T2 en un formulario propio (el diálogo de capítulo).

**Non-Goals:**
- Botones "Estudiar este capítulo" (`cola-diaria`) y "Practicar" (`practica-quiz`), y el "N para hoy" de cada fila.
- Un campo `cardCount` en el capítulo.
- Reordenar capítulos.

## Decisions

### 1. Modelo y puerto (`domain/models/chapter.model.ts`, `domain/ports/chapter.repository.ts`; capa dominio)

`Chapter { id; bookId; name; order; createdAt; updatedAt }`, compatible con los documentos de la 0.1.1. `ChapterRepository` (clase abstracta):

- `listByBook(uid, bookId): Promise<Chapter[]>`, ordenados por `order`.
- `create(uid, { bookId, name, order }): Promise<Chapter>`.
- `rename(uid, chapterId, name): Promise<void>`.
- `countCards(uid, chapterId): Promise<number>`.
- `deleteWithCards(uid, bookId, chapterId): Promise<number>`: devuelve cuántas tarjetas borró.

No hay `delete` simple ni `update` genérico: el único cambio posible es el nombre, y borrar siempre lleva sus tarjetas.

Fake `testing/fake-chapter-repository.ts`: mapa en memoria, `setCardCount(chapterId, n)`, contadores de llamadas y un interruptor de fallo por método.

*Por qué los conteos y la cascada de tarjetas van en el repositorio de capítulos:* es el mismo criterio de `libros`. No leen el contenido de las tarjetas ni dependen de su esquema (que llega con `tarjetas`): son preguntas sobre el capítulo.

### 2. `FirestoreChapterRepository` (`infrastructure/firestore/chapter.repository.firestore.ts`, `schemas/chapter.schema.ts`; capa infraestructura)

- **Esquema:** `bookId: z.string().min(1)`, `name: z.string()` (acepta el `""` heredado), `order: z.number()`, `createdAt` y `updatedAt: firestoreTimestamp`. La lista se valida con `parseDocuments`, así que es todo o nada.
- **`listByBook`:** `where('bookId', '==', bookId)` y orden en memoria por `order`, como en la 0.1.1. Los capítulos por libro son pocos, y ordenar en memoria evita un índice compuesto `bookId + order`.
- **`create`:** `setDoc` sobre `doc(colección)`; devuelve el modelo con fechas. **`rename`:** `updateDoc` de `name` y `updatedAt`.
- **`countCards`:** `getCountFromServer(query(cards, where('chapterId', '==', chapterId)))`. Usa el índice automático de un campo.
- **`deleteWithCards`:**
  1. Lee las referencias con `getDocs(query(cards, where('chapterId', '==', chapterId)))`.
  2. Las parte en grupos de hasta `MAX_BATCH_SIZE - 2`, dejando sitio para el descuento y para el capítulo.
  3. Por cada grupo crea un `BatchWriter` nuevo con: `delete` de cada tarjeta; si el grupo no está vacío, `update` del libro con `cardCount: increment(-grupo.length)` (mismos campos que escribe `BookRepository.incrementCardCount`); y, solo en el último grupo, `delete` del capítulo. Luego `commit()`.
  4. Devuelve el total. Un capítulo sin tarjetas es un único lote con solo el `delete` del capítulo.

  Un `BatchCommitError` sube tal cual: los grupos ya confirmados llevaron su descuento, el capítulo sigue existiendo (va en el último) y reintentar borra lo que quede. `reviewLogs` y `dailyStats` no se tocan.

*Por qué un `BatchWriter` por grupo y no uno para todo:* `BatchWriter` decide sus cortes de lote él solo. Para que cada lote lleve exactamente su descuento, cada `commit()` tiene que ser un solo lote. *Alternativas descartadas:* un único descuento al final, porque si falla a mitad el contador queda alto y reintentar solo descuenta lo que quede; y recontar con `getCountFromServer` + `set`, porque pierde incrementos concurrentes y exige servidor.

*Por qué este repositorio escribe en el documento del libro:* el descuento tiene que ir en el mismo lote atómico que los borrados. `libros` ya sigue ese criterio al revés: su cascada borra capítulos y tarjetas.

### 3. `ChaptersService` (`services/chapters/chapters.service.ts`; capa servicios)

- **Recurso de capítulos:** `bookId = signal<string | undefined>(undefined)` y `chapters = resource({ params: () => bookId(), loader: ({ params }) => repo.listByBook(requireSessionUid(session.user()), params) })`. Sin libro abierto, el recurso queda `idle`.
- **`openBook(bookId)`** (detalle del libro): si es el mismo libro llama a `reload()`; si no, fija el id. Así la lista se relee en cada apertura, como pide la spec.
- **`ensureLoaded(bookId)`** (detalle de capítulo): solo fija el id si cambió, y reutiliza lo ya cargado.
- **`chapterById(chapterId: Signal<string>)`:** `computed` que da `undefined` sin valor, `null` si no existe y el capítulo si existe.
- **Mutaciones locales** con `chapters.update(...)`:
  - `create(name)`: recorta el nombre; `order` = máximo + 1 sobre el valor actual (0 si está vacío); añade al final.
  - `rename(chapterId, name)`: recorta y refleja el nombre conservando `order`.
  - `remove(chapterId)`: llama a `deleteWithCards`; tras el éxito quita el capítulo, llama a `books.changeCardCount(bookId, -borradas)` y devuelve `borradas`.

  El servicio recorta aunque el formulario ya lo haga: la regla vive en el cerebro, no solo en la UI.
- **`countCards(chapterId): Promise<number>`** para la confirmación.
- **`cardCountFor(chapterId: Signal<string>)`:** `resource` con `params: () => connectivity.online() ? chapterId() : undefined`. Sin red no pide nada; al volver la red, pide. Se crea en el contexto de inyección de quien lo llama (la fila), con el mismo patrón que `BooksService.totalsFor`.
- **Errores:** el servicio relanza y las pantallas eligen el texto de `biblioteca.copy.ts`. Sin sesión, `requireSessionUid` lanza antes de tocar el repositorio.

### 4. Estado del detalle de capítulo como función pura (`services/chapters/chapter-detail-state.ts`; capa servicios)

`resolveChapterDetail({ booksStatus, book, chaptersStatus, chapter })` devuelve uno de estos estados:

- `{ kind: 'loading' }`
- `{ kind: 'error'; failed: 'books' | 'chapters' }`
- `{ kind: 'bookMissing' }`
- `{ kind: 'chapterMissing'; book }`
- `{ kind: 'ready'; book; chapter }`

La precedencia es: error de libros → libro sin resolver (`loading`) → libro `null` → error de capítulos → capítulo sin resolver → capítulo `null` → `ready`.

*Por qué una función pura y no lógica en la plantilla:* ahí vivía el hallazgo 9. Son cinco estados que salen de dos recursos, y como función se prueban sin TestBed. No es una abstracción: tiene un solo consumidor.

### 5. Diálogo de capítulo (`features/biblioteca/chapter-form-dialog`, `features/biblioteca/chapter-form.schema.ts`; capa UI)

- `chapterFormSchema = z.object({ name: bookFormSchema.shape.name })`: el mismo campo que el libro (recortado, "El nombre es obligatorio.", máximo 120), sin duplicar la regla. El input lleva `maxlength="120"`.
- Recibe por `DIALOG_DATA` `{ mode: 'create' } | { mode: 'rename'; chapter: Chapter }` y devuelve el `Chapter` creado o renombrado. Títulos y botones: "Nuevo capítulo" / "Crear capítulo"; "Renombrar capítulo" / "Guardar". Etiqueta "Nombre" y placeholder "Ej. Unidad 1", materia-agnóstico.
- Signal Forms. El botón principal se deshabilita si el nombre es inválido, si está guardando o si `!connectivity.online()`. Sin red muestra `NEEDS_CONNECTION_MESSAGE` dentro del diálogo, y al volver la red se habilita sin tocar el campo.
- Mientras guarda llama a `setPending(true)`. Si falla, muestra dentro "No se pudo guardar el capítulo. Inténtalo de nuevo." con `role="alert"`. Solo se cierra con `close(chapter)` tras el éxito; Cancelar y Escape cierran sin resultado.

### 6. Confirmación de borrado (`ConfirmDialogComponent` de `shared`, sin cambios aquí)

- Al pulsar Borrar en una fila, la lista pide `countCards(chapterId)` solo si hay red. Un fallo da `null`, y sin red también es `null`, sin pedir nada. Mientras cuenta, ese botón queda deshabilitado para no abrir dos confirmaciones.
- Luego abre `ConfirmDialogComponent` con:
  - `title` "¿Borrar este capítulo?" y `message` "Se borrará «{nombre}»."
  - `detail` = `chapterDeletionDetail(count)`
  - `confirmLabel` "Borrar", `pendingLabel` "Borrando…"
  - `errorMessage` "No se pudo borrar el capítulo. Inténtalo de nuevo."
  - `action: () => chapters.remove(id)`
- Con `true`, la lista emite `contentsChanged` y el detalle del libro hace `reload()` de sus totales.
- `chapterDeletionDetail(count: number | null)` es una función pura en `biblioteca.copy.ts` que concuerda verbo y sustantivo con `pluralize`:
  - 0 → "No se puede deshacer."
  - 1 → "Se borrará 1 tarjeta. Tu historial de repasos se conserva. No se puede deshacer."
  - n → "Se borrarán n tarjetas. …"
  - `null` → "También se borrarán sus tarjetas. …"
- `chapterDisplayName(chapter)` vive en el mismo archivo: "Capítulo sin nombre" si el nombre está vacío.

### 7. Pantallas (capa UI, `features/biblioteca/`)

- **`ChapterListComponent`** (`chapter-list`): recibe `bookId` y al iniciar llama a `chapters.openBook(bookId)`. Es una `<section aria-labelledby>` con un `h2` "Capítulos" y se pinta según `status()`:
  - Cargando: `Skeleton` de 3 filas, variante `card`.
  - Error: `ErrorState` "No pudimos cargar los capítulos" con `retry` → `reload()`.
  - Vacío: `EmptyState` de onboarding con "Crear capítulo".
  - Con capítulos: `<ol>` de `ChapterRowComponent` y, al final, el botón suave "Añadir un capítulo".

  Abre el diálogo de capítulo y la confirmación, y emite `contentsChanged`. `LibroDetailPageComponent` lo pone en lugar de la página provisional y, ante `contentsChanged`, hace `totals.reload()`. Solo se pinta en la rama "libro encontrado", así que con el libro inexistente no aparece.
- **`ChapterRowComponent`** (`chapter-row`):
  - Entradas `chapter`, `position`, `bookId` y salidas `renameRequested` y `deleteRequested`.
  - `cardCount = chapters.cardCountFor(chapterId)`.
  - `<li>` con `glass-soft` y `press`. Dentro, un `<a routerLink="/biblioteca/{bookId}/{chapterId}">` con la posición, `chapterDisplayName` y la línea "N tarjetas" (`pluralize`), que solo aparece con el conteo resuelto. Sin conteo no hay línea ni aviso.
  - Al lado del enlace, no dentro, van dos botones de icono con `aria-label` "Renombrar {nombre}" y "Borrar {nombre}". No hay chevron.
- **`CapituloDetailPageComponent`** (`capitulo-detail-page`): lee los parámetros de ruta como `LibroDetailPageComponent`. Llama a `books.ensureLoaded()` y `chapters.ensureLoaded(bookId)`, y calcula `state = computed(() => resolveChapterDetail(...))`. Pinta según `state().kind`:
  - `loading`: `Skeleton`.
  - `error`: `ErrorState`, cuyo `retry` recarga el recurso que falló.
  - `bookMissing`: `EmptyState` "Libro no encontrado" (copy de `libros`) con enlace a la Biblioteca.
  - `chapterMissing`: `EmptyState` "Capítulo no encontrado", mensaje "Vuelve al libro para ver sus capítulos." y enlace "Volver a {libro}".
  - `ready`:
    - Cabecera sólida: enlace con el icono `back` y el nombre del libro, en una línea con `truncate` y `aria-label` "Volver a {libro}"; y un `h1` con el nombre del capítulo.
    - Una zona de acciones vacía, que llenan `cola-diaria` y `practica-quiz`.
    - `<section aria-label="Tarjetas">` con la página provisional, que `tarjetas` sustituye.
- Textos en `biblioteca.copy.ts`, sin literales de color ni de fuente.

### 8. Rutas

`/biblioteca/:bookId/:chapterId` pasa de la página provisional a `CapituloDetailPageComponent` (`loadComponent`). Se amplía `app.routes.spec.ts`.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Filas de capítulo | `glass-soft` + `press` (escala; el desenfoque no anima) | 2 |
| Indicador sin conexión | `glass-soft`, estático | 2, al mismo nivel que las filas, nunca encima |
| Panel de los diálogos (crear/renombrar, confirmación) | `glass`; su fondo oscurecido tapa la lista | sustituye a la lista |
| Cabecera del detalle de capítulo, enlace de vuelta, estados vacío y error, esqueleto | sólidos o sin fondo | 0 |

Con `prefers-reduced-transparency`, todo es sólido por tokens.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `Chapter`; `ChapterRepository` (`listByBook`, `create`, `rename`, `countCards`, `deleteWithCards`); `FakeChapterRepository` | `tarjetas` (a qué capítulo va la tarjeta), `importacion` (forma del documento de capítulo al crear en lote), `practica-quiz` |
| `ChaptersService.chapters`, `openBook`, `ensureLoaded`, `chapterById`, `cardCountFor` | `tarjetas` (selector de capítulo en el formulario), `cola-diaria` ("Estudiar este libro" con los capítulos cargados) |
| `resolveChapterDetail` y `CapituloDetailPageComponent` con zona de acciones vacía y región "Tarjetas" provisional, pintadas solo en `ready` | `tarjetas` (lista), `cola-diaria` ("Estudiar este capítulo"), `practica-quiz` ("Practicar") |
| `ChapterRowComponent` | `cola-diaria` le añade la entrada "N para hoy" / "al día" |
| `chapterDeletionDetail` con verbo concordado | `tarjetas` (borrado individual y masivo) |
| Borrado por grupos con descuento por lote en `deleteWithCards` | `tarjetas` (borrado masivo con contador): si lo repite, se extrae entonces, con su segundo caso real |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Orden por `order`; Solo los del libro abierto | `chapter.repository.integration.spec`: `listByBook` filtra por `bookId` y ordena 3, 0, 1 → 0, 1, 3 | integración |
| Sin sesión activa | `chapters.service.spec`: con sesión `signedOut`, el recurso queda en error "No hay una sesión activa." y `create` lanza sin llamar al repositorio | unitaria pura |
| (Lista que se relee en cada apertura) | `chapters.service.spec`: `openBook('b1')` dos veces → `listByBook` llamado dos veces; `ensureLoaded('b1')` después no vuelve a llamar | unitaria pura |
| Posición en la lista | `chapter-list.component.spec`: `order` 0, 3 y 7 → filas con "1", "2" y "3" | componente |
| Conteo por capítulo | `chapter.repository.integration.spec`: `countCards` con 42 y con 1 tarjeta sembradas; `chapter-row.component.spec`: "42 tarjetas" y "1 tarjeta" | integración + componente |
| Conteo no disponible | `chapter-row.component.spec`: con `FakeConnectivity` sin red, `countCards` no se llama y no hay línea de conteo; con el repositorio que lanza, tampoco hay línea ni `role="alert"`; al volver la red, pide y pinta | componente |
| Tocar la fila | `chapter-row.component.spec`: el enlace apunta a `/biblioteca/b1/c1` y los botones de icono están fuera del enlace | componente |
| Cargando; Falla la lectura; Libro sin capítulos; Libro con capítulos | `chapter-list.component.spec`: esqueleto `aria-busy` sin "Añadir un capítulo"; error con el texto y `Reintentar` relanza la lectura, sin el vacío; vacío con título, frase y "Crear capítulo"; con capítulos, "Añadir un capítulo" al final abre el diálogo y el capítulo devuelto aparece último con "0 tarjetas" | componente |
| Libro inexistente (lista) | `libro-detail-page.component.spec` ampliado: con "Libro no encontrado" no se pinta la lista de capítulos | componente |
| Capítulo corrupto; Nombre vacío heredado | `chapter.repository.integration.spec`: documento sin `order` → `InvalidDocumentError`; documento con `name: ""` se lee; `biblioteca.copy.spec`: `chapterDisplayName` → "Capítulo sin nombre"; `chapter-list.component.spec`: repositorio que lanza → estado de error | integración + unitaria pura + componente |
| Primer capítulo; Capítulo al final; Nombre con espacios alrededor | `chapters.service.spec`: `create` con lista vacía → `order` 0 y `bookId` del libro abierto; con 0 y 3 → 4, añadido al final sin releer; "  Phrasal verbs  " → "Phrasal verbs" | unitaria pura |
| Nombre vacío | `chapter-form.schema.spec`: "   " → "El nombre es obligatorio."; 121 caracteres falla; `chapter-form-dialog.component.spec`: botón deshabilitado y mensaje tras tocar el campo | unitaria pura + componente |
| Cancelar | `chapter-form-dialog.component.spec`: Cancelar y Escape cierran sin resultado y no llaman al servicio | componente |
| Renombrar conserva la posición; Cambio visible al instante (requisito base sin cambios) | `chapters.service.spec`: `rename` conserva `order` y refleja el nombre sin releer; `chapter.repository.integration.spec`: `rename` cambia solo `name` y `updatedAt`; `chapter-form-dialog.component.spec`: modo renombrar precargado y con "Guardar" | unitaria pura + integración + componente |
| Confirmar borrado | `chapter.repository.integration.spec`: libro con `cardCount` 100, capítulo A con 42 tarjetas, B con 58 y un `reviewLog` de una tarjeta de A → `deleteWithCards` devuelve 42, A y sus tarjetas desaparecen, B sigue intacto, `cardCount` = 58 y el `reviewLog` existe; `chapters.service.spec`: el capítulo sale del recurso solo tras el éxito y el libro refleja `cardCount` −42; `libro-detail-page.component.spec`: `contentsChanged` vuelve a pedir los totales | integración + unitaria pura + componente |
| Conteo en la confirmación; Capítulo con una tarjeta; Capítulo sin tarjetas; Conteo no disponible | `biblioteca.copy.spec`: `chapterDeletionDetail` con 42, 1, 0 y `null` da los textos exactos; `chapter-list.component.spec`: con conteo 42 el diálogo recibe "Se borrará «Básicos»." y el detalle de 42; si `countCards` lanza, se abre con el texto sin número; `chapter.repository.integration.spec`: capítulo vacío → devuelve 0 y `cardCount` no cambia | unitaria pura + componente + integración |
| Cancelar borrado | `chapter-list.component.spec`: la confirmación devuelve `false` → la fila sigue y `deleteWithCards` no se llama | componente |
| Huecos en el orden | `chapters.service.spec`: tras quitar el de `order` 1 de 0, 1 y 2, `create` asigna 3 | unitaria pura |
| Capítulo grande | `chapter.repository.integration.spec`: 900 tarjetas sembradas → no queda ninguna, el capítulo desaparece y `cardCount` baja exactamente 900 | integración |
| Falla el borrado | `chapters.service.spec`: el repositorio que lanza relanza y el recurso no cambia; `chapter-list.component.spec`: la acción rechaza y la fila sigue (que el diálogo se quede abierto lo prueba `confirm-dialog.component.spec` en `libros`) | unitaria pura + componente |
| Crear sin conexión; Renombrar sin conexión; Vuelve la conexión | `chapter-form-dialog.component.spec` con `FakeConnectivity`: sin red, el botón principal está deshabilitado con `NEEDS_CONNECTION_MESSAGE` y Cancelar cierra; `setOnline(true)` lo habilita con el nombre intacto y el diálogo abierto | componente |
| Borrar sin conexión | `chapter-list.component.spec`: sin red, `countCards` no se llama y el detalle es el texto sin número (el botón deshabilitado sin red lo prueba `confirm-dialog.component.spec` tras el update de `libros`) | componente |
| Entrar al capítulo; Volver al libro; Navegación directa; Enlace de vuelta nombrado | `capitulo-detail-page.component.spec` con `RouterTestingHarness`: con libros y capítulos ya cargados no hay lecturas nuevas y se ve el nombre; el enlace apunta a `/biblioteca/b1` con `aria-label="Volver a Phrasal Verbs"`; entrada directa → esqueleto, `ensureLoaded` de ambos y luego la cabecera | componente |
| Capítulo inexistente; Libro inexistente; Falla la lectura | `chapter-detail-state.spec`: cada combinación de estados da el `kind` esperado, con la precedencia del design; `capitulo-detail-page.component.spec`: cada estado pinta su texto y su enlace, `Reintentar` recarga el recurso que falló, y nunca aparece la región "Tarjetas" | unitaria pura + componente |
| Hay tarjetas listas; Nada que estudiar; Capítulo sin tarjetas; Doble toque; Falla la preparación | `cola-diaria` | diferido |
| Guardado en curso; Envío duplicado; Falla el guardado; Éxito limpia el error anterior | `chapter-form-dialog.component.spec`: botones deshabilitados, "Guardando…", Escape bloqueado, un solo `create` con dos envíos; el servicio que lanza deja el diálogo abierto con el nombre y el mensaje `role="alert"`; el reintento con éxito cierra con el capítulo | componente |
| Escape cierra; Botón de borrar nombrado; Botón de renombrar nombrado | `chapter-form-dialog.component.spec` (Escape sin acción en vuelo cierra); `chapter-row.component.spec`: `aria-label` "Borrar Básicos" y "Renombrar Básicos" | componente |

## Risks / Trade-offs

- [Un conteo por capítulo en cada apertura del libro] → alrededor de una lectura por capítulo, poco frente a la capa gratuita. Si un libro llega a tener decenas de capítulos y se nota, se añade un `cardCount` por capítulo con su relleno de datos: es un cambio aditivo.
- [`navigator.onLine` dice que hay red y no la hay] → el conteo falla y la fila se pinta sin número. El diálogo esperaría hasta que vuelva la red; es el riesgo ya aceptado en T2.
- [Cascada no atómica en capítulos grandes] → cada lote lleva su descuento, así que un fallo a mitad deja un capítulo con menos tarjetas y el contador correcto en el servidor. El `cardCount` local de `BooksService` no se toca hasta el éxito y se corrige en la siguiente lectura de la Biblioteca.
- [Otra pestaña crea una tarjeta en el capítulo durante la cascada] → esa tarjeta no está entre las referencias leídas y queda huérfana. Con un solo usuario es muy improbable; se acepta.
- [Depende del `opsx:update` de `libros` por T2] → sin él no se cumple "Borrar sin conexión". Ese update se aplica antes de ejecutar este change; si cambia nombres, se corrige aquí con `opsx:update`.
- [Huérfanas de la 0.1.1 en producción] → siguen entrando en la cola de su libro. Quedan fuera de alcance; un change de limpieza las resolvería.
- [El recurso conserva o vacía el valor al cambiar de libro] → las pantallas eligen el esqueleto por `status()`, nunca por el valor, así que no se ven capítulos del libro anterior.

## Migration Plan

Sexto commit de la rama única `feature/reescritura-cadence` en la fase B, tras `libros`. Sin datos nuevos, reglas ni índices: las consultas por `chapterId` usan el índice automático de un campo. Rollback: revertir el commit.
