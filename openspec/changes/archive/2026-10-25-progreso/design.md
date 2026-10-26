# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/progreso/spec.md`. Estado esperado de `dev` cuando este change se ejecute (13.º, tras `exportacion-de-libros`):

- De `cola-diaria`: `DailyQueueService` (`refresh()`, `baseQueue: Signal<Card[]>`, `todayStats: Signal<DailyStats | null>`, `status: 'loading' | 'error' | 'ready'`, `hasBooks`), `DailyStats`/`RatingCounts`, `FakeDailyStatsRepository`, `FakeCardRepository.listReady`; `features/hoy/` como referencia de página con `Skeleton`/`ErrorState`/`EmptyState`.
- De `sesion-de-repaso`: `dailyStatsIncrements` suma `reviewsCompleted` y `ratingCounts[rating]` por calificación (una tarjeta vista dos veces cuenta dos).
- De `libros`: `BookRepository.countCardsByState(uid, bookId)` con tres `getCountFromServer` y el patrón `totalsFor` (`resource` con `params: () => online() ? ... : undefined`); `pluralize`.
- De `navegacion-y-shell`: `ConnectivityPort.online`, `FakeConnectivity`, `EmptyState`, `ErrorState`, `Skeleton`; `/progreso` apunta a la página provisional.
- Tokens: la escala de calificación (`rating-again/hard/good/easy`) existe para los cerebros; el acento tiene matices (`accent`, `accent-soft`, `accent-muted` o equivalentes en `styles.scss`).
- Código viejo de referencia en `backup/old-version` (`services/stats/progress.service.ts`, `features/progreso/`): el cálculo de barras y proporciones es correcto y se reescribe con TDD; allí el servicio llamaba a la recarga de la cola de Hoy (hallazgo 5).

## Goals / Non-Goals

**Goals:**
- Cero lecturas nuevas de tarjetas: todo lo del día sale de `DailyQueueService`; la colección son tres agregaciones.
- Dos recursos independientes (día y colección) para que el segundo falle o espere sin tumbar al primero.
- Cerebro puro mínimo (filas de calificación y proporciones) con sus pruebas; UI liviana.

**Non-Goals:**
- Racha, historial, desglose por libro, suspendidas.

## Decisions

### 1. Agregación por cuenta (`domain/ports/book.repository.ts`, `infrastructure/firestore/book.repository.firestore.ts`; capas dominio e infraestructura)

`BookRepository.countCollectionByState(uid): Promise<StateCounts>` con el mismo tipo `{ newCards; learning; review }` que `countCardsByState`: tres `getCountFromServer` sobre `cards` con `where('scheduling.state', '==', 0)`, `in [1, 3]` y `== 2`, sin filtro de libro. *Por qué en el repositorio de libros:* es la misma pregunta que ya responde por libro, sin leer documentos de tarjeta; segundo caso real que justifica extraer el helper privado `countByStates(constraints)` que comparten ambos métodos. Las agregaciones siempre van al servidor: sin red rechazan, por eso el servicio no las pide sin red. Fake: `FakeBookRepository.seedCollectionCounts` o cálculo sobre las tarjetas sembradas; fallo programable.

### 2. Cerebro puro (`services/progress/`; capa servicios)

- `rating-rows.ts`: `ratingRows(stats: DailyStats | null): RatingRow[]` devuelve SIEMPRE cuatro filas en orden fijo `{ rating: 1..4; count; share }`, con ausentes = 0 y `share = count / reviewsCompleted` (0 si no hay repasos). La etiqueta la pone el componente con la copia compartida de calificaciones (ver sección 5).
- `collection-shares.ts`: `collectionShares(counts: StateCounts): { total; segments: { key; count; share }[] }` con las tres proporciones sobre el total (0 si total 0).
- `progress.service.ts`: `ProgressService` (`providedIn: 'root'`):
  - `refresh()` → `queue.refresh()` y `collection.reload()` si está habilitado.
  - `pending = computed(() => queue.baseQueue().length)`; `reviewedToday = computed(() => queue.todayStats()?.reviewsCompleted ?? 0)`; `ratings = computed(() => ratingRows(queue.todayStats()))`; `dayStatus = queue.status`.
  - `collection = resource({ params: () => online() && uid ? { uid } : undefined, loader: countCollectionByState })`; `collectionStatus: 'offline' | 'loading' | 'error' | 'ready'` derivado de `online()` y del recurso; `shares = computed(collectionShares)`; `isEmpty = computed(() => collectionStatus === 'ready' && total === 0)`.
  *Por qué dos recursos:* la spec separa los fallos; un solo `Promise.all` los acoplaría. *Por qué `online()` en `params`:* es el patrón de `totalsFor`; al volver la red el recurso recarga solo.

### 3. Página y secciones (`features/progreso/`; capa UI)

- `ProgresoPageComponent` (`progreso-page`): `progress.refresh()` al iniciar; pinta según `dayStatus()`: `loading` → `Skeleton` (dos tarjetas + cuatro filas + una barra, `aria-busy`); `error` → `ErrorState` "No pudimos cargar tus estadísticas" / "No se pudieron cargar tus estadísticas." / Reintentar → `refresh()`; `ready` y `isEmpty()` → `EmptyState` con los textos de la spec; `ready` → las tres secciones.
- `SummaryCardComponent` (`summary-card`): entradas `label`, `value: number`; `<article>` `glass-soft` con el número grande. Dos instancias: "Pendientes hoy", "Repasadas hoy".
- `RatingDistributionComponent` (`rating-distribution`): entrada `rows: RatingRow[]` y `total`; `<section aria-labelledby>` "Calificaciones de hoy"; si `total === 0`, "Aún no has calificado tarjetas hoy."; si no, `<ol>` de cuatro filas con etiqueta, número y barra cuyo ancho es `share` (estilo inline de `width` como porcentaje es el único valor calculado; el color por clase de token `bar-rating-{again|hard|good|easy}`). Sin animación de entrada salvo `--duration-fill` respetando `prefers-reduced-motion`.
- `CollectionOverviewComponent` (`collection-overview`): entradas `status`, `shares`, salida `retry`; `<section>` "Tu colección"; según `status`: `loading` → esqueleto de la barra; `offline` → `<p>` "Necesitas conexión para contar tu colección."; `error` → "No pudimos contar tu colección." + botón "Reintentar" (emite `retry`); `ready` → `collectionTotal(total)` ("N tarjetas en total", plural real), barra apilada (tres `<span>` con `width` por proporción y clases `bar-accent-{new|learning|review}`) y tres conteos con etiqueta.
- Textos en `features/progreso/progreso.copy.ts` (`progresoCopy`): títulos, `collectionTotal(n)`, mensajes de vacío, error, sin red y colección.
- Ruta: `/progreso` → `ProgresoPageComponent` (sustituye a la provisional).

### 4. Accesibilidad de las barras

Cada barra lleva el número visible junto a ella (diferenciador redundante al color, spec). La barra apilada tiene `role="img"` con `aria-label` que enumera los tres conteos ("3 nuevas, 2 en aprendizaje, 5 dominadas"). Las barras de calificación son decorativas (`aria-hidden`) porque la fila ya dice etiqueta y número.

### 5. Correcciones de la fase B (2026-10-25, vía `/opsx:update`)

1. **`RatingRow` no lleva `label`:** `services/` no puede importar `features/` ni `shared/` (capas de ESLint, ADR 0002) y las etiquetas de calificación viven en `REPASO_COPY.ratingLabels` (`features/repaso/repaso.copy.ts`), las mismas de los cerebros. `ratingRows` devuelve `{ rating; count; share }` y `RatingDistributionComponent` toma la etiqueta de `REPASO_COPY.ratingLabels[rating]` (sin literal nuevo). La prueba de "las etiquetas son las compartidas" pasa de `rating-rows.spec` (1.1) a `rating-distribution.component.spec` (4.2).

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Tarjetas de resumen y las dos secciones | `glass-soft` (sin animación de desenfoque) | 2 |
| Barras (calificación y apilada), esqueletos, estados | sólidas por tokens; las barras de calificación con la escala reservada (permitido aquí por la guía §9.7), la apilada con matices del acento | 0 |

Fondo de gestión con el brillo vinotinto tenue. Con `prefers-reduced-transparency`, todo sólido.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `BookRepository.countCollectionByState(uid)` | Futuro "N suspendidas" (cuarta agregación) o métricas por semana |
| `ratingRows`, `collectionShares` | `sesion-de-repaso` podría reutilizar `ratingRows` en su cierre si unifica las pastillas |
| `SummaryCardComponent` | Cualquier métrica futura (racha en Progreso si se decide) |
| Clases `bar-rating-*`, `bar-accent-*` en `styles.scss` | Gráficas futuras |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Entrar a Progreso; Repaso de madrugada | `progress.service.spec`: `refresh()` llama a `queue.refresh()` y recarga la colección; el día lo fija `DailyQueueService` (ya probado en `cola-diaria`), aquí solo se afirma que no se calcula otro | unitaria pura |
| Con cola y repasos; Sin contador del día | `progress.service.spec` con `FakeCardRepository`/`FakeDailyStatsRepository`: 4 vencidas + 2 nuevas → `pending 6`; `reviewsCompleted 7` → `reviewedToday 7`; `todayStats null` → 0 | unitaria pura |
| Distribución del día; Sin calificaciones hoy; Contador parcial | `rating-rows.spec`: 1/1/4/1 → `share` de Bien 4/7; `null` → cuatro filas a 0; solo `good` → las otras 0; orden fijo | unitaria pura |
| Colección mixta; Reaprendizaje cuenta como aprendizaje; Una sola tarjeta | `collection-shares.spec`: 3/2/5 → total 10 y proporciones; `book.repository.integration.spec`: tarjetas de dos libros con estados 0 ×3, 1 ×1, 3 ×1, 2 ×5 → `countCollectionByState` 3/2/5; `progreso.copy.spec`: `collectionTotal(1)`, `(10)` | unitaria pura + integración |
| Falla el conteo con conexión; Reintentar solo la colección | `progress.service.spec`: repositorio que lanza → `collectionStatus 'error'` y `dayStatus 'ready'`; `collection.reload()` → `'ready'` sin tocar la cola; `collection-overview.component.spec`: texto + "Reintentar" emite `retry` | unitaria pura + componente |
| Sin tarjetas; Tarjetas sin repasar; Sin conteo no hay vacío | `progress.service.spec`: `isEmpty` solo con `ready` y total 0; `progreso-page.component.spec`: `EmptyState` con los textos; con tarjetas y 0 repasos → paneles y "Aún no has calificado tarjetas hoy."; sin red y cola vacía → paneles con "0" y aviso de colección | unitaria pura + componente |
| Falla la cola del día; Falla el conteo de la colección; Reintentar | `progreso-page.component.spec`: `queue.status 'error'` → `ErrorState` con los textos aunque la colección resuelva; conteo que lanza → paneles visibles y sección con su error; Reintentar global → `refresh()` y esqueleto | componente |
| Progreso sin red; Vuelve la red | `progress.service.spec` con `FakeConnectivity`: sin red no llama a `countCollectionByState` y `collectionStatus 'offline'`; `setOnline(true)` → llama y `'ready'`; `collection-overview.component.spec`: texto sin cifras | unitaria pura + componente |
| Progreso no duplica la lectura del contador; Progreso no lee el historial | `progress.service.spec`: una visita → `getByDay` una vez y `listReady` una vez (contadores del fake), `countCollectionByState` una vez; ningún método de `reviewLogs` existe en los fakes inyectados | unitaria pura |
| Escala y acento | `rating-distribution.component.spec`: cada fila lleva la clase `bar-rating-*` que le toca y el número visible; `collection-overview.component.spec`: `role="img"` con el `aria-label` enumerado y clases `bar-accent-*` | componente |

## Risks / Trade-offs

- [Tres agregaciones por visita] → acción poco frecuente; `getCountFromServer` cuesta como una lectura cada una. Si se notara, se cachean por día en el servicio (aditivo).
- [`in [1, 3]` sobre `scheduling.state` en toda la cuenta] → índice automático de un campo; sin índice compuesto nuevo. Verificado en `libros` para el caso por libro.
- [Pendientes hoy difiere del número de Hoy cuando el usuario ajustó nuevas] → es la cola BASE a propósito (spec). Riesgo de confusión aceptado; si molesta, se añade una nota "sin tu ajuste de hoy" sin cambiar el dato.
- [Tokens de matices del acento inexistentes] → se definen en `styles.scss` en este change si faltan (`accent-soft`, `accent-muted`), sin literales en componentes.

## Migration Plan

Decimotercer commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos, reglas ni índices nuevos. `/progreso` deja de ser provisional. Rollback: revertir el commit.
