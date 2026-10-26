# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/cola-diaria/spec.md`. Estado esperado de `dev` cuando este change se ejecute (9.º, tras `programacion-espaciada`):

- De `tarjetas`: `Card` (`bookId`, `chapterId`, `createdAt`, `suspended`, `scheduling`), `CardScheduling`, `CardState`; `CardRepository` con `listByChapter`, `create`, `createMany`, `updateContent`, `setSuspended`, `deleteWithCount`, `deleteManyWithCount` y `FakeCardRepository`; `cardDocumentSchema`; `CardsService.cards` (recurso del capítulo abierto) y `openChapter`; `CardListComponent` dentro del detalle del capítulo.
- De `programacion-espaciada`: `Rating`, `SchedulingPort`, `FakeSchedulingPort` (aquí no se usan: la cola no calcula intervalos, solo lee vencimientos).
- De `libros`: `Book` (`newCardsPerDay`, `maxReviewsPerDay`, `order`), `BooksService.books` (recurso), `ensureLoaded()`, `findById`; `LibroDetailPageComponent` con cabecera, totales y región "Capítulos"; `biblioteca.copy.ts` y `pluralize` en `shared/text/pluralize.ts`; patrón de pantalla con `resource()`.
- De `capitulos`: `ChaptersService.chapters`, `openBook`, `ensureLoaded`; `ChapterListComponent`; `ChapterRowComponent` (posición, nombre, "N tarjetas"); `CapituloDetailPageComponent` con una zona de acciones vacía y `resolveChapterDetail`.
- De `ajustes-de-usuario` y `autenticacion-y-acceso`: `SessionService.user()` con `settings.timezone` y `settings.dayStartHour`; `requireSessionUid`; `supportedTimeZones`/`deviceTimeZone` (solo para pruebas aquí).
- De `navegacion-y-shell`: `app.routes.ts` con `/hoy` provisional y `/repaso` provisional fuera del caparazón; `EmptyState`, `ErrorState`, `Skeleton`, `IconComponent`; `ConnectivityPort` (aquí no se usa: ninguna lectura de este change va al servidor obligatoriamente); contrato de `resource()` (decisión 8 de su design); `Logger`.
- De `plataforma-datos-y-offline`: `parseDocument`, `parseDocuments`, `firestoreTimestamp`, `InvalidDocumentError`; `tests/support/firestore-test-environment.ts`; caché persistente multi-pestaña de Firestore activada en `provideFirebase`.
- `src/styles.scss` tiene los tokens de movimiento (`--duration-press` … `--duration-flip`, `--ease-out-soft`) y la regla global de reducir movimiento; no tiene aún la duración de la luz del borde (7 s según la guía).
- `firestore.indexes.json` declara `cards(bookId + scheduling.due)`; nunca se ha usado (hallazgo 3 de plataforma, conservado).
- Código viejo de referencia en `backup/old-version` (`services/review/{daily-queue,study-day,queue.service}.ts`, `features/hoy/`): el armado puro y el día de estudio son correctos y se reescriben con TDD; el servicio mezclaba el ajuste de sesión con el estado de la pantalla (hallazgo 5 de progreso) y la pantalla tenía un solo vacío.
- SDK de Firestore: con la caché persistente activa, una lectura con `getDocs`/`getDoc` sin red se resuelve desde la caché (`fromCache: true`) en lugar de fallar; solo las agregaciones (`getCountFromServer`) exigen red. Es lo que hace posible el requisito "Sin conexión, Hoy y estudiar siguen funcionando". Se verifica a mano (tarea 8.1), no se puede probar en Node.
- Prototipo aprobado `docs/design/cadence-prototipo-extendido.html`: cabecera "Hoy" + fecha + racha; bloque principal con luz orbital; filas "Por libro"; pliegue "Ajustar nuevas de hoy"; enlace suave "Crear o importar un libro".

## Goals / Non-Goals

**Goals:**
- Un solo cerebro puro para "qué está listo" y "qué entra hoy", probado con fechas fijas, que Hoy, los dos botones de estudiar y la fila de capítulo consumen sin duplicar reglas.
- Un servicio de cola cuyo estado de sesión (ajuste por libro) es independiente de las recargas y del día, para que `progreso` solo tenga que leer la cola base.
- Dejar a `sesion-de-repaso` una lista curada y ordenada en un punto de entrega, y el modelo y la lectura de indicadores diarios.

**Non-Goals:**
- Pantalla de repaso, escritura de indicadores, historial de repasos.
- Métricas por libro en Progreso.
- Un puerto de reloj: las funciones puras reciben `now`; los servicios usan `new Date()` y las pruebas lo fijan con `vi.setSystemTime` (misma política que los changes anteriores).

## Decisions

### 1. Día de estudio (`services/study-day/study-day.ts`; capa servicios, puro)

- `studyDayId(now, timezone, dayStartHour): string` ("YYYY-MM-DD"): desplaza el instante `dayStartHour` horas hacia atrás y lo formatea en la zona con `Intl.DateTimeFormat('en-CA')`.
- `endOfStudyDay(now, timezone, dayStartHour): Date`: próximo instante en que la hora local alcanza `dayStartHour` (`formatToParts` con `hourCycle: 'h23'`).
- `previousStudyDayId(dayId): string`: resta un día a la cadena como fecha UTC (sin zonas: la cadena ya es local). Lo usa la racha.
- `formatLocalDate(now, timezone): string`: `Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone })` → "viernes, 24 de octubre" con la primera letra en mayúscula. Es la fecha civil del usuario, no el día de estudio (decisión del explore: a la 01:30 del miércoles no se dice "martes").

*Alternativa descartada:* calcular con `Date` locales del navegador: la zona del perfil puede diferir de la del dispositivo (ajustes-de-usuario lo contempla).

### 2. Indicadores diarios, lado de lectura (`domain/models/daily-stats.model.ts`, `domain/ports/daily-stats.repository.ts`, `infrastructure/firestore/schemas/daily-stats.schema.ts`, `infrastructure/firestore/daily-stats.repository.firestore.ts`, `testing/fake-daily-stats-repository.ts`)

- Modelo `DailyStats { id; date; newCardsIntroduced: Record<bookId, number>; reviewsCompleted; reviewsCompletedByBook: Record<bookId, number>; ratingCounts: { again; hard; good; easy } }` y `RatingCounts`, como en la 0.1.1 (compatibilidad de datos, ADR 0002).
- Puerto `DailyStatsRepository` con dos lecturas: `getByDay(uid, dayId): Promise<DailyStats | null>` y `listRecent(uid, limit): Promise<DailyStats[]>` (por `date` descendente). La escritura la añade `sesion-de-repaso`, pero no como un método `recordReview` de este puerto: los incrementos del día viven en el lote atómico de la calificación (`dailyStatsIncrements`, exportado desde `daily-stats.repository.firestore.ts`), así nadie escribe indicadores fuera del todo o nada. *(Redacción ajustada el 2026-10-25 vía `/opsx:update`, tarea 6.2 de `sesion-de-repaso`; sin cambio de comportamiento.)*
- Esquema Zod con contadores dispersos: `newCardsIntroduced` y `reviewsCompletedByBook` `.default({})`, `reviewsCompleted` `.default(0)`, `ratingCounts` con cada clave `.default(0)`; documentos viejos sin `reviewsCompletedByBook` se leen bien. Lectura por `parseDocument` (hoy) y `parseDocuments` (recientes; todo-o-nada, hallazgo 4 de plataforma).
- `listRecent` = `query(collection, orderBy('date', 'desc'), limit(n))`: un solo campo, auto-indexado; `date` ya existe en cada documento y es igual a su id.
- `FakeDailyStatsRepository` en memoria con `seed(stats[])` y fallo programable por método.

*Por qué nace aquí y no en `sesion-de-repaso`:* la cola lee hoy (topes) y los recientes (racha) antes de que exista nada que escriba; el modelo es el de los datos existentes, no una decisión nueva.

### 3. Lecturas de tarjetas listas (`domain/ports/card.repository.ts`, `infrastructure/firestore/card.repository.firestore.ts`, `testing/fake-card-repository.ts`; capas dominio e infraestructura)

Se añaden al puerto:

- `listReady(uid, before: Date): Promise<Card[]>` → `where('scheduling.due', '<=', Timestamp.fromDate(before))`. Rango sobre un campo, auto-indexado. Trae vencidas y nuevas (una nueva tiene `due = createdAt`).
- `listReadyByBook(uid, bookId, before: Date): Promise<Card[]>` → el mismo rango más `where('bookId', '==', bookId)`; usa el índice compuesto `bookId + scheduling.due` ya declarado (primer consumidor real).

Ninguna de las dos filtra `suspended` ni ordena en la consulta: añadir `suspended == false` exigiría otro índice y dejaría fuera documentos viejos sin el campo (el esquema lo rellena a `false`); el filtro y el orden viven en el cerebro puro (decisión 4). Las dos pasan por `parseDocuments`. `FakeCardRepository` las implementa filtrando su mapa en memoria.

### 4. Cerebro puro (`services/queue/`; capa servicios, sin Angular)

- `ready-cards.ts`: `isReadyCard(card, endOfDay)` = `!card.suspended && card.scheduling.due <= endOfDay`; `orderReadyCards(cards, endOfDay): Card[]` = filtra listas, vencidas (`state ≠ New`) por `due` ascendente y después nuevas por `createdAt` ascendente; `countReadyByChapter(cards, endOfDay): Map<chapterId, number>`. Es la **definición única de "lista"** (decisión 1 del explore): la usan la cola de Hoy, los dos botones y la fila de capítulo.
- `build-daily-queue.ts`: `buildDailyQueue(input): DailyQueue` con `input = { candidates: Card[]; books: Book[]; introducedByBook; reviewedByBook; sessionNewByBook?: Record<bookId, number> }` y `DailyQueue = { cards; dueCount; newCount; perBook: BookPending[] }`, `BookPending = { bookId; name; due; new; baseNew; availableNew }`. Reglas: parte de `orderReadyCards`; vencidas topadas por libro a `maxReviewsPerDay − reviewedByBook` (0 = sin tope; libro sin metadatos pasa sin tope); nuevas por libro: `baseNew = min(available, max(0, newCardsPerDay − introducedByBook))`, y si `sessionNewByBook[bookId]` existe, `new = clamp(valor, 0, availableNew)` **solo para ese libro**; nuevas de libros sin metadatos no entran. `perBook` incluye todo libro con `due + new > 0`, en el orden de `book.order`; `availableNew` y `baseNew` se exponen para el control de ajuste (que necesita listar también libros con nuevas disponibles pero `new = 0`: el servicio los toma de un segundo cálculo, `availableNewByBook`, que la misma función devuelve en `DailyQueue.availableNewByBook: Record<bookId, number>`).
- `streak.ts`: `computeStreak(days: ReadonlyArray<{ date: string; reviewsCompleted: number }>, todayId: string, maxDays = 60): number`. Conjunto de fechas con `reviewsCompleted ≥ 1`; arranca en `todayId` si está, si no en `previousStudyDayId(todayId)`; cuenta consecutivos hacia atrás hasta `maxDays`. Devuelve 0 si ni hoy ni ayer están.
- Textos puros: `features/hoy/hoy.copy.ts` (`heroCount(n)` → "21 tarjetas"/"1 tarjeta"; `bookPendingMeta(due, new)` → "10 por repasar, 8 nuevas" omitiendo ceros; `streakLabel(days)` → `null` / "1 día" / "N días seguidos" / "60+ días seguidos"; `newAvailableLabel(n)` → "de 20"; textos de estados) y en `features/biblioteca/biblioteca.copy.ts` `chapterReadyLabel(n)` → "22 listas" / "1 lista" / "al día".

*Alternativa descartada:* aplicar el ajuste de sesión como total entre libros (spec base): el explore lo rechazó porque un libro se comía la tanda de otro.

### 5. Servicio de cola (`services/queue/daily-queue.service.ts`; capa servicios, `providedIn: 'root'`)

```
studyDay      = signal<{ id; endOfDay } | null>      // se fija en refresh()
refresh()     → calcula el día con new Date() y user().settings; si el id cambia, el recurso recarga;
                si no, reload() explícito
data          = resource({ params: () => uid && studyDay ? { uid, dayId, endOfDay } : undefined,
                loader: ensureLoaded libros → Promise.all(listReady, getByDay) → { candidates, today } })
baseQueue     = computed(buildDailyQueue(sin sessionNewByBook))
sessionNew    = signal<{ dayId; limits: Record<bookId, number> } | null>
sessionQueue  = computed(buildDailyQueue(con limits si sessionNew.dayId === studyDay.id))
setSessionNew(bookId, count) / sessionNewFor(bookId)
status        = computed: error de libros o de data → 'error'; cargando → 'loading'; si no → 'ready'
hasBooks      = computed(books.length > 0)
todayStats    = computed(data.value()?.today ?? null)         // lo reutiliza progreso
streak        = resource({ params: uid && dayId, loader: listRecent(uid, 60) → computeStreak;
                un fallo se captura dentro, se registra con Logger y devuelve null })
```

- El ajuste "caduca con el día" y "sobrevive a la navegación" salen de guardar `dayId` junto a los límites: recargar no toca `sessionNew`; cambiar de día lo deja fuera por el `dayId`. No se persiste (decisión 3 del explore).
- La racha es un recurso aparte para que su fallo no contamine `status` (la spec lo exige) y para que su lectura no retrase la cola. Su fallo se registra con `Logger` (prohibido el `catch` vacío).
- `HoyPageComponent` llama a `refresh()` al iniciar (cada entrada a Hoy, incluida la vuelta de una sesión) y antes de preparar la sesión si el día cambió ("la siguiente interacción vuelve a armar la cola"). `progreso` llamará a `refresh()` y leerá `baseQueue` y `todayStats`.

*Alternativa descartada:* dos servicios (cola y racha) por separado: comparten uid, día y ciclo de recarga; separarlos duplicaría el cálculo del día.

### 6. Listas por libro y preparación de sesiones (`services/queue/book-ready-cards.service.ts`, `services/queue/study-handoff.service.ts`; capa servicios)

- `BookReadyCardsService` (`providedIn: 'root'`): `openBook(bookId)` fija `bookId` y calcula el día; `ready = resource({ params: { uid, bookId, endOfDay }, loader: listReadyByBook })`; `countFor(chapterId: Signal<string>): Signal<number | undefined>` (`undefined` mientras carga o si falló: la fila omite la línea). `prepareBookSession(bookId): Promise<Card[]>` hace una lectura fresca con `listReadyByBook` y devuelve `orderReadyCards(...)`; `prepareChapterSession(chapterId): Promise<Card[]>` toma `CardsService.cards.value()` (ya cargadas en el detalle) y devuelve `orderReadyCards(...)`; si el recurso no está resuelto lanza. Mismo patrón que `ChaptersService.openBook` y `cardCountFor`, así `ChapterRowComponent` solo inyecta y lee.
- `StudyHandoffService` (`providedIn: 'root'`): `prepared = signal<PreparedStudy | null>`; `hand(prepared)`; `take(): PreparedStudy | null` (devuelve y limpia). `PreparedStudy = { cards: Card[]; source: { kind: 'today' } | { kind: 'book'; bookId } | { kind: 'chapter'; bookId; chapterId } }`. `sesion-de-repaso` lo consume al entrar a `/repaso`; si no hay nada, redirige (su spec). *Alternativa descartada:* `router.navigate` con `state`: se tipa débil y se pierde igual al recargar; un servicio con señal se prueba sin router.

### 7. Botón de estudiar compartido (`features/estudio/study-launch-button/`; capa UI)

`StudyLaunchButtonComponent` con entradas `label`, `variant: 'primary' | 'secondary'`, `prepare: () => Promise<Card[]>`, `source: PreparedStudy['source']`, `emptyMessage` (texto de "al día" del libro o capítulo; en Hoy no aplica porque el botón se deshabilita con 0), `errorMessage`, `disabled`. Máquina de estados `idle → preparing → (handoff + navigate '/repaso') | empty | error`: "Preparando…" deshabilitado; segundo toque ignorado; lista vacía → `<p role="status">` con `emptyMessage`; fallo → `ErrorState` compacto con "Reintentar" que repite `prepare`; nunca "al día" tras un fallo (hallazgo 4). Tres consumidores reales (Hoy, libro, capítulo) justifican el componente. Vive en `features/estudio/` porque conoce `Card` y servicios (no es `shared`).

### 8. Pantalla Hoy (`features/hoy/`; capa UI)

- `HoyPageComponent` (`hoy-page`): `queue.refresh()` al iniciar; cabecera con `h1` "Hoy", subtítulo `formatLocalDate` y `StreakBadgeComponent`. Pinta según `queue.status()` y `hasBooks()`: `loading` → `Skeleton` (silueta del bloque + 2 filas, `aria-busy`); `error` → `ErrorState` "No pudimos cargar tu cola de hoy" con `retry → refresh()`; `!hasBooks` → `EmptyState` de bienvenida con "Ir a la Biblioteca" (sin bloque ni racha); al día (`dueCount + sum(availableNew) === 0`) → `TodayHeroComponent` asentado; con tarjetas → bloque, "Por libro" con `BookPendingRowComponent` por fila, `NewCardsAdjusterComponent` y el enlace suave "Crear o importar un libro". La racha se pinta en todo estado salvo "sin libros" y "cargando".
- `TodayHeroComponent` (`today-hero`): entradas `count`, `settled`, `prepare`, `disabled`; pinta `heroCount`, "Listas para repasar hoy" (o "Estás al día" + frase, sin botón, si `settled`) y el `StudyLaunchButtonComponent` primario. La luz del borde es un pseudo-elemento con `@keyframes` sobre `--duration-orbit` (se añade `--duration-orbit: 7s` a `src/styles.scss`, único archivo de tema) y degradado cónico con tokens de acento; `settled` la oculta y fija el borde; bajo `prefers-reduced-motion` el componente la deja quieta (además de la regla global).
- `BookPendingRowComponent` (`book-pending-row`): `<a routerLink="/biblioteca/{bookId}">` que ocupa toda la fila, `glass-soft` + `press`, icono `books`, nombre con `truncate`, `bookPendingMeta`, total.
- `NewCardsAdjusterComponent` (`new-cards-adjuster`): `<details>` nativo con `<summary>` "Ajustar nuevas de hoy"; dentro, la aclaración y una fila por libro con `availableNew > 0` o nuevas en la cola: nombre, botones de icono "Menos nuevas de {libro}" / "Más nuevas de {libro}" (deshabilitados en 0 y en `availableNew`), el número con `aria-live="polite"` y "de N"; libros con `availableNew = 0` muestran "sin nuevas". Emite `changed(bookId, count)` → `queue.setSessionNew`.
- `StreakBadgeComponent` (`streak-badge`): entrada `days: number | null`; no pinta nada con `null` o 0; icono `flame` (se añade al catálogo de `IconComponent`) + `streakLabel`, `aria-label` "Racha: 6 días seguidos".
- Textos en `hoy.copy.ts`; sin literales de color ni fuente.

### 9. Integración en Biblioteca (capa UI, `features/biblioteca/`)

- `LibroDetailPageComponent`: en la rama "libro encontrado", llama a `bookReady.openBook(bookId)` y, una vez cargados los capítulos (`chapters.status() === 'resolved'`), muestra en la zona de acciones `StudyLaunchButtonComponent` "Estudiar este libro" con `prepare = () => bookReady.prepareBookSession(bookId)` y `emptyMessage` "Estás al día con este libro. No hay tarjetas para repasar ahora.".
  - *Corrección (2026-10-25, fase B, vía `/opsx:update`, tarea 0.1):* `libros` no dejó zona de acciones en el detalle del libro (solo `capitulos` la dejó en el del capítulo, `[data-chapter-actions]`). Se crea aquí `[data-book-actions]` al final de la cabecera del libro, tras los totales, que es donde el prototipo extendido pone "Estudiar este libro" (`book-actions`); mismo patrón `flex flex-wrap gap-2 empty:hidden` que la del capítulo, para que `practica-quiz` añada ahí "Practicar".
- `ChapterRowComponent`: añade `readyCount = bookReady.countFor(chapterId)` y, si está definido, la línea `chapterReadyLabel(readyCount)` junto a "N tarjetas". Sin valor → sin línea (como el conteo de tarjetas).
- `CapituloDetailPageComponent`: en la zona de acciones, `StudyLaunchButtonComponent` "Estudiar este capítulo", visible solo con `cards.status() === 'resolved'` y al menos una tarjeta, con `prepare = () => bookReady.prepareChapterSession(chapterId)` y `emptyMessage` "Estás al día con este capítulo. No hay tarjetas para repasar ahora.".

### 10. Rutas

`/hoy` pasa de la página provisional a `HoyPageComponent` (`loadComponent`). `/repaso` sigue provisional hasta `sesion-de-repaso`: en este change, "navegar a la pantalla de repaso" lleva a esa página "Pronto"; la prueba de ruta lo deja explícito.

### 11. Sin conexión

Ninguna pieza de este change inyecta `ConnectivityPort`: las lecturas (`listReady`, `listReadyByBook`, `getByDay`, `listRecent`) se resuelven desde la caché sin red, y no hay escrituras ni agregaciones. Es coherente con T2 ("estudiar sí funciona") y con el requisito ADDED.

### 12. Correcciones de la fase B (2026-10-25, vía `/opsx:update`)

Ajustes al implementar, sin cambiar la arquitectura ni la spec:

1. **Zona de acciones del libro:** no existía; se crea `[data-book-actions]` al final de la cabecera (ver sección 9).
2. **`studyDayAt(now, timezone, dayStartHour)` y el tipo `StudyDay { id; endOfDay }`** en `study-day.ts`: los dos servicios (cola y listas por libro) necesitan el día de estudio de "ahora"; así no repiten las dos llamadas.
3. **`buildDailyQueue` recibe también `endOfDay`**: parte de `orderReadyCards`, que lo necesita para filtrar suspendidas y futuras.
4. **`DailyQueueService.newCardsChoices` y `NewCardsChoice { bookId; name; chosen; available }`:** el control de ajuste lista todos los libros (los que no tienen nuevas, con "sin nuevas"), y solo el servicio conoce sus nombres; `NewCardsAdjusterComponent` emite `{ bookId, count }` (un `output` emite un solo valor).
5. **`DailyQueueService.prepareSession()`:** "si el día de estudio cambia con Hoy abierta, la siguiente interacción vuelve a armar la cola". "Estudiar ahora" no puede usar la cola ya pintada: el mismo día devuelve `sessionQueue().cards`; con el día cambiado vuelve a leer (lectura privada `read(day)` compartida con el recurso) y arma la cola del día nuevo, y `refresh()` repinta la pantalla.
6. **Fallo de `StudyLaunchButtonComponent`:** alerta compacta propia (`role="alert"` con el texto y "Reintentar") en vez de `ErrorState`, cuyo diseño es de página entera; el fallo se registra con `Logger`. Texto: "No se pudo preparar la sesión. Inténtalo de nuevo." (misma forma que el de `practica-quiz`).
7. **El bloque principal no lleva sombra:** `styles.scss` reserva las sombras a la tarjeta de estudio, los diálogos y el botón principal.
8. **Fechas de ejemplo de la spec:** "miércoles 22 de octubre" y "viernes 24 de octubre" son del calendario de 2025 (en 2026 caen en jueves y sábado); la prueba del subtítulo usa el 22 de octubre de 2025.
9. **`FakeCardRepository.readyBefore`** registra el instante con que se piden las listas (las pruebas afirman el fin del día).

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Filas "Por libro" | `glass-soft` + `press` | 2 |
| Bloque principal de Hoy | **sólido** (`surface` con un tinte radial de acento por tokens); la luz orbital es un pseudo-elemento animado sobre el borde | 0 |
| Racha, pliegue de ajuste, enlace suave | sin vidrio: borde sutil y fondo sólido | 0 |
| Esqueleto, estados vacío y de error | sólidos | 0 |
| Botones de estudiar en los detalles | sólidos (acento) | 0 |

El prototipo pintaba el bloque principal con acrílico. Se hace sólido por dos reglas del ADR 0003: "nunca desenfoque sobre elementos que animan" (la luz recorre su borde siempre que hay pendientes) y el presupuesto de dos capas (navegación + filas ya lo agotan). Igual que la tarjeta de estudio, el protagonista es sólido.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `studyDayId`, `endOfStudyDay`, `previousStudyDayId`, `formatLocalDate` | `sesion-de-repaso` (acreditar el día), `progreso` |
| `DailyStats`, `RatingCounts`; `DailyStatsRepository.getByDay`/`listRecent`; esquema Zod; `FakeDailyStatsRepository` | `sesion-de-repaso` escribe los incrementos del día dentro de su lote atómico (sin método `recordReview`); `progreso` lee `todayStats` |
| `CardRepository.listReady`, `listReadyByBook` | `progreso` (candidatas vía la cola), `practica-quiz` si practica "lo listo" |
| `isReadyCard`, `orderReadyCards`, `countReadyByChapter`, `buildDailyQueue`, `computeStreak` | `progreso` (pendientes = `baseQueue`), `sesion-de-repaso` (orden) |
| `DailyQueueService.refresh`, `baseQueue`, `sessionQueue`, `todayStats`, `status`, `streak` | `progreso` (una sola carga por visita, su spec), `sesion-de-repaso` (al terminar vuelve a Hoy, que refresca) |
| `StudyHandoffService.hand`/`take` y `PreparedStudy` | `sesion-de-repaso` (arranca con la lista recibida) |
| `StudyLaunchButtonComponent` en `features/estudio` | `practica-quiz` puede reutilizar el patrón si su botón tiene los mismos estados |
| Icono `flame` | `progreso` si algún día muestra racha |
| `--duration-orbit` en `styles.scss` | Nadie más (único uso permitido por la guía) |

## Plan de pruebas

Fechas fijas en todas las pruebas (`T0 = 2026-10-24T15:00:00Z`, zona `America/Bogota`, `dayStartHour = 4`). Servicios con `vi.setSystemTime`.

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Repaso de madrugada cuenta como el día anterior; Después de la hora de inicio es el mismo día; Respeta la zona horaria del usuario | `study-day.spec`: `studyDayId` a la 01:30 y a las 09:00 locales del 15 de junio → `2026-06-14` y `2026-06-15`; el mismo instante UTC en `Asia/Tokyo` y `America/Los_Angeles` da fechas distintas | unitaria pura |
| Ya pasó la hora de inicio; Aún no llegó la hora de inicio | `study-day.spec`: `endOfStudyDay` a las 10:00 → mañana 04:00 local; a las 02:00 → hoy 04:00 local; `previousStudyDayId('2026-03-01')` → `2026-02-28`, `('2026-01-01')` → `2025-12-31` | unitaria pura |
| Fecha del subtítulo | `study-day.spec`: `formatLocalDate` a la 01:30 del miércoles 22 → "Miércoles, 22 de octubre" con `studyDayId` = 21 | unitaria pura |
| Vencidas ordenadas por vencimiento; Una tarjeta que vence mañana no entra; Vencidas antes que nuevas | `ready-cards.spec`: `orderReadyCards` ordena hace 3 días, ayer, hoy; excluye `due > endOfDay`; excluye suspendidas; nuevas al final por `createdAt`; `countReadyByChapter` agrupa 22 / 63 / 0 | unitaria pura |
| Tope por libro conserva las más atrasadas; Descuenta los repasos ya hechos hoy; Cero significa sin tope | `build-daily-queue.spec`: `maxReviewsPerDay 2` con 5 vencidas → las 2 más antiguas; `10` con 8 hechas → 2; `0` con 300 → 300; libro sin metadatos pasa sin tope | unitaria pura |
| Respeta la tanda del libro; Descuenta las introducidas hoy; Tanda agotada | `build-daily-queue.spec`: `newCardsPerDay 3` con 10 nuevas → 3 más antiguas; `5` con 4 introducidas → 1; agotada → 0; `availableNewByBook` y `baseNew` correctos | unitaria pura |
| Empujar más nuevas que el tope; Un libro no toma nuevas de otro; Cero nuevas para hoy; Libro sin nuevas disponibles; El ajuste no toca la configuración | `build-daily-queue.spec`: `sessionNewByBook { inglés: 11 }` → 11 de Inglés (las más antiguas de ese libro), Medicina intacta; `{ medicina: 50 }` con 12 disponibles → 12 y ninguna extra de Inglés; todos a 0 → solo vencidas; libro con 0 disponibles → `availableNew 0`; los `Book` de entrada no se mutan | unitaria pura |
| Racha en curso; Hoy todavía no se ha estudiado; Un día sin estudiar la rompe; Una sola tarjeta basta; Primer día; Racha larga | `streak.spec`: 6 días con hoy → 6; 5 anteriores sin hoy → 5; anteayer sin ayer → 0; `reviewsCompleted 1` cuenta; solo hoy → 1; 60 días → 60 y 61 → 60; lista vacía → 0 | unitaria pura |
| (Textos) | `hoy.copy.spec`: `heroCount(21)`, `(1)`, `(0)`; `bookPendingMeta(10, 8)`, `(3, 0)`, `(0, 1)`, `(1, 1)`; `streakLabel(0)` → `null`, `(1)`, `(6)`, `(60)`; `biblioteca.copy.spec`: `chapterReadyLabel(22)`, `(1)`, `(0)` | unitaria pura |
| (Esquema de indicadores) | `daily-stats.schema.spec` con objetos planos: documento viejo sin `reviewsCompletedByBook` → `{}`; sin `ratingCounts.hard` → 0; sin `date` → falla | unitaria pura |
| (Repositorio de indicadores) | `daily-stats.repository.integration.spec`: `getByDay` inexistente → `null`, sembrado → modelo; `listRecent(uid, 3)` con 5 días sembrados → los 3 más recientes en orden descendente; documento corrupto → `InvalidDocumentError` con la ruta | integración |
| (Lecturas de tarjetas) | `card.repository.integration.spec` ampliado: `listReady(before)` devuelve vencidas y nuevas con `due ≤ before`, excluye `due > before`, incluye suspendidas (el filtro es del cerebro); `listReadyByBook` solo las del libro | integración |
| Cola por libro (índice) | Sin prueba automática: el emulador no exige índices; se verifica al desplegar (plataforma, hallazgo 3) | diferido |
| El ajuste sobrevive a la navegación; El ajuste caduca con el día; Recalcular sin volver a consultar; Cambia el día de estudio; Vuelve de una sesión | `daily-queue.service.spec` con fakes: `refresh()` lee una vez; `setSessionNew('inglés', 11)` cambia `sessionQueue` sin nueva lectura y `baseQueue` no cambia; `refresh()` de nuevo (mismo día) relee y conserva 11; `vi.setSystemTime` pasado el fin del día + `refresh()` → nuevo `dayId`, `sessionQueue` vuelve a la base | unitaria (TestBed) |
| Falla la carga; Falla la lectura de la racha | `daily-queue.service.spec`: `listReady` que lanza → `status 'error'`; libros en error → `'error'`; `listRecent` que lanza → `streak.value() === null`, `status 'ready'` y `FakeLogger` con el detalle | unitaria (TestBed) |
| Sin libros | `daily-queue.service.spec`: biblioteca vacía → `hasBooks false` y `status 'ready'` | unitaria (TestBed) |
| Estudiar un libro con backlog; Vence más tarde hoy; Misma definición que Hoy; Nada listo | `book-ready-cards.service.spec`: `prepareBookSession` con 40 vencidas, 15 nuevas y `maxReviewsPerDay 10` → 55 en orden; tarjeta con `due = ahora + 2 h` incluida; `prepareChapterSession` con todas futuras → `[]`; `countFor` → 22 / 0 / `undefined` mientras carga o tras fallo | unitaria (TestBed) |
| Estudiar un capítulo sin red | `book-ready-cards.service.spec`: `prepareChapterSession` no llama al repositorio (usa el recurso de tarjetas); manual sin red (tarea 8.1) | unitaria + manual |
| (Entrega a la sesión) | `study-handoff.service.spec`: `hand` → `take` devuelve y limpia; `take` sin nada → `null` | unitaria pura |
| Preparando la sesión; Doble toque; Falla la preparación; Nada listo (botón) | `study-launch-button.component.spec`: `prepare` pendiente → "Preparando…" deshabilitado y segundo clic no vuelve a llamar; resuelve con tarjetas → `hand` con `source` y URL `/repaso`; resuelve `[]` → `role="status"` con `emptyMessage`; rechaza → `ErrorState` con "Reintentar" que repite `prepare`, sin el texto de "al día" | componente |
| Cargando; Falla la carga; Sin libros; Cola vacía; Con tarjetas; Una tarjeta; Cero nuevas elegidas sin vencidas | `hoy-page.component.spec` con fakes: esqueleto `aria-busy` sin botón; error con "No pudimos cargar tu cola de hoy" y Reintentar que llama a `refresh`; sin libros → bienvenida, "Ir a la Biblioteca", sin bloque ni racha; al día → "Estás al día", sin botón, racha "6 días seguidos" y enlace; 21 → "21 tarjetas" y "Listas para repasar hoy"; 1 → "1 tarjeta"; sin vencidas y nuevas a 0 → "0 tarjetas" con botón deshabilitado y sin "Estás al día" | componente |
| Fecha del subtítulo (pantalla) | `hoy-page.component.spec`: con `vi.setSystemTime` el subtítulo muestra `formatLocalDate` | componente |
| Reducir movimiento | `today-hero.component.spec`: `settled` añade la clase y oculta la luz; estática: `today-hero.component.scss` contiene `prefers-reduced-motion` y `--duration-orbit`; `styles.scss` define `--duration-orbit: 7s` | componente + estática |
| Desglose ordenado; Fila con vencidas y nuevas; Fila sin nuevas; Fila sin vencidas; Fila con el ajuste aplicado; Tocar una fila | `book-pending-row.component.spec`: textos y total; `href` a `/biblioteca/b1`; `hoy-page.component.spec`: dos libros en orden y el tercero omitido; subir Inglés a 12 → fila "10 por repasar, 12 nuevas" y total 22 | componente |
| (Control de ajuste) | `new-cards-adjuster.component.spec`: fila por libro con disponibles, "de 20", "Menos nuevas de Inglés" deshabilitado en 0 y "Más" en el máximo, emite `changed`; libro con 0 disponibles → "sin nuevas" sin botones; `<summary>` "Ajustar nuevas de hoy" | componente |
| (Racha) | `streak-badge.component.spec`: `null` y 0 → nada; 6 → "6 días seguidos" con `aria-label` "Racha: 6 días seguidos" | componente |
| Capítulo con listas; Capítulo al día; Los topes no afectan al conteo del capítulo; Conteo de listas no disponible | `chapter-row.component.spec` ampliado: `countFor` 22 → "22 listas"; 0 → "al día"; `undefined` → sin línea ni alerta | componente |
| Estudiar este libro (de `libros`): Hay tarjetas listas; Nada que estudiar; Falla la preparación; Doble toque | `libro-detail-page.component.spec` ampliado: el botón aparece solo con capítulos resueltos; tocar → `prepareBookSession` y URL `/repaso`; `[]` → "Estás al día con este libro…"; rechazo → error con Reintentar | componente |
| Estudiar este capítulo (de `capitulos`): los cuatro escenarios | `capitulo-detail-page.component.spec` ampliado: botón solo con tarjetas resueltas y ≥ 1; mismos cuatro casos con "Estás al día con este capítulo…" | componente |
| (Ruta) | `app.routes.spec` ampliado: `/hoy` renderiza `HoyPageComponent` dentro del caparazón; `/repaso` sigue provisional | componente |
| Abrir Hoy sin red; Estudiar un capítulo sin red | Manual con emuladores y DevTools en "Offline" tras una visita con red: Hoy arma la cola, la racha aparece, "Estudiar este capítulo" navega. Playwright al cerrar la paridad | manual |

## Risks / Trade-offs

- [`listReady` trae todas las vencidas de la cuenta en cada entrada a Hoy] → es lo que hacía la 0.1.1 y lo que la spec de `progreso` presupone; con la caché persistente, las repetidas en el día salen de la caché. Si un usuario acumula miles de vencidas, un tope de lectura sería su propio change.
- [La racha cuesta hasta 60 lecturas por entrada a Hoy] → documentos pequeños y en caché tras la primera lectura del día; con el plan gratuito sobra. Si molesta, se baja el límite sin tocar la spec.
- [Hoy y el detalle del libro no cuadran en números] → decidido en el explore: Hoy aplica topes y el detalle dice "N listas" sin topes. El copy distinto ("por repasar" vs "listas") es la señal.
- [Caché sin red incompleta o desactualizada] → el conteo por capítulo y la cola pueden diferir de la realidad hasta que vuelva la red. Es un modo, no un error (guía §10); aceptado.
- [`/repaso` provisional] → pulsar "Estudiar ahora" lleva a "Pronto" hasta `sesion-de-repaso`, que es el change siguiente en la misma rama. La entrega queda en `StudyHandoffService` y se prueba sin la pantalla.
- [Bloque principal sólido en vez de acrílico] → se aparta del prototipo para respetar el ADR 0003; el tinte radial con tokens conserva la profundidad. Si en el móvil se ve plano, se afina el tinte en `styles.scss`, no se añade vidrio.
- [`<details>` nativo para el pliegue] → accesible y sin JavaScript; su icono de apertura se oculta por CSS y el chevron se dibuja con `IconComponent`. Si el estilo del `summary` da problemas en Safari, se cambia a un botón con `aria-expanded` sin tocar la spec.

## Migración

Noveno commit de la rama única `feature/reescritura-cadence` en la fase B. Sin cambios de datos ni de reglas; el índice compuesto `bookId + scheduling.due` ya está declarado y se despliega con `firebase deploy --only firestore:indexes` cuando el usuario publique (pendiente suyo desde T8). Rollback: revertir el merge.
