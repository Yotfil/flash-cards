# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `exportacion-de-libros`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Componentes en su carpeta con cuatro archivos; cero literales; textos en `features/progreso/progreso.copy.ts`. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Cerebro puro

- [x] 1.1 Escribir en rojo `src/app/services/progress/rating-rows.spec.ts`: 1/1/4/1 → cuatro filas en orden Otra vez/Difícil/Bien/Fácil con `share` 1/7, 1/7, 4/7, 1/7; `null` → cuatro filas a 0 y `share 0`; solo `good: 3` → las otras 0 (las etiquetas las pone el componente: design §5); verificar que falla; implementar `ratingRows` y verificar que pasa.
- [x] 1.2 Escribir en rojo `src/app/services/progress/collection-shares.spec.ts`: 3/2/5 → `total 10` y proporciones 0.3/0.2/0.5 en orden nuevas/aprendizaje/dominadas; 0/0/0 → `total 0` y proporciones 0; verificar que falla; implementar `collectionShares` y verificar que pasa.
- [x] 1.3 Escribir en rojo `src/app/features/progreso/progreso.copy.spec.ts`: `collectionTotal(1)` → "1 tarjeta en total", `(10)` → "10 tarjetas en total"; constantes con los textos exactos de la spec (vacío, error global, sin red, error de colección, "Aún no has calificado tarjetas hoy."); verificar que falla; implementar con `pluralize` y verificar que pasa.

## 2. Agregación por cuenta (integración con emulador)

- [x] 2.1 Añadir `countCollectionByState(uid)` a `src/app/domain/ports/book.repository.ts` y a `FakeBookRepository` (cuenta sobre tarjetas sembradas o devuelve lo configurado; fallo programable); verificar `npm run typecheck` y `npm run lint`.
- [x] 2.2 Añadir en rojo a `tests/firestore/book.repository.integration.spec.ts` el bloque "colección": tarjetas de dos libros con `scheduling.state` 0 ×3, 1 ×1, 3 ×1 y 2 ×5 → `countCollectionByState` devuelve 3/2/5; cuenta vacía → 0/0/0; verificar que falla; implementar con tres `getCountFromServer` compartiendo el helper con `countCardsByState` y verificar que pasa (y que `countCardsByState` sigue en verde).

## 3. Servicio (unitarias con fakes)

- [x] 3.1 Escribir en rojo `src/app/services/progress/progress.service.spec.ts` con `FakeCardRepository`, `FakeDailyStatsRepository`, `FakeBookRepository`, `FakeConnectivity` y el `DailyQueueService` real: `refresh()` llama a `queue.refresh()`; 4 vencidas + 2 nuevas → `pending 6`; `reviewsCompleted 7` → `reviewedToday 7`; sin contador → 0; `ratings` deriva de `ratingRows`; una visita → `listReady`, `getByDay` y `countCollectionByState` una vez cada uno; verificar que falla; implementar `ProgressService` (recurso de colección aparte) y verificar que pasa.
- [x] 3.2 Añadir en rojo el bloque "colección y fallos": repositorio que lanza → `collectionStatus 'error'` con `dayStatus 'ready'`; `collection.reload()` → `'ready'` sin nueva lectura de la cola; sin red → no llama y `'offline'`; `setOnline(true)` → llama y `'ready'`; `isEmpty` solo con `'ready'` y total 0 (no con `'offline'` ni `'error'`); cola en error → `dayStatus 'error'` aunque la colección resuelva; verificar que falla; implementar y verificar que pasa.

## 4. Componentes de sección

- [x] 4.1 Escribir en rojo `src/app/features/progreso/summary-card/summary-card.component.spec.ts` (etiqueta y valor visibles; `<article>` con la clase `glass-soft`) y verificar que falla; crear `SummaryCardComponent` y verificar que pasa.
- [x] 4.2 Escribir en rojo `src/app/features/progreso/rating-distribution/rating-distribution.component.spec.ts`: con total 7 y filas 1/1/4/1, cuatro `<li>` en orden con la etiqueta compartida de calificación (`REPASO_COPY.ratingLabels`: Otra vez/Difícil/Bien/Fácil), número y barra con `width` 14.3 %/14.3 %/57.1 %/14.3 % y clases `bar-rating-again|hard|good|easy`, barras `aria-hidden`; con total 0, "Aún no has calificado tarjetas hoy." y sin barras; verificar que falla; crear `RatingDistributionComponent` y las clases `bar-rating-*` en `styles.scss` (tokens de la escala) y verificar que pasa.
- [x] 4.3 Escribir en rojo `src/app/features/progreso/collection-overview/collection-overview.component.spec.ts`: `ready` con 3/2/5 → "10 tarjetas en total", barra `role="img"` con `aria-label` "3 nuevas, 2 en aprendizaje, 5 dominadas", tres segmentos con `width` 30 %/20 %/50 % y clases `bar-accent-new|learning|review`, tres conteos; `loading` → esqueleto `aria-busy`; `offline` → "Necesitas conexión para contar tu colección." sin cifras; `error` → "No pudimos contar tu colección." y "Reintentar" que emite `retry`; verificar que falla; crear `CollectionOverviewComponent` y las clases `bar-accent-*` (matices del acento; definir los tokens si faltan) y verificar que pasa.

## 5. Página y ruta

- [x] 5.1 Escribir en rojo `src/app/features/progreso/progreso-page/progreso-page.component.spec.ts` con los fakes y el `ProgressService` real: al iniciar llama a `refresh()`; `loading` → esqueleto `aria-busy` sin paneles; cola en error → `ErrorState` "No pudimos cargar tus estadísticas" / "No se pudieron cargar tus estadísticas." / Reintentar que llama a `refresh()` (aunque la colección resuelva); `ready` con total 0 → `EmptyState` con los textos de la spec; `ready` con tarjetas y 0 repasos → paneles "0" y aviso de calificaciones; conteo que lanza → paneles visibles y la sección con su error; sin red y cola vacía → paneles "0" y aviso de colección, nunca el vacío; `setOnline(true)` → la sección pide y pinta; verificar que falla; crear `ProgresoPageComponent` y verificar que pasa.
- [x] 5.2 Sustituir la página provisional de `/progreso` por `ProgresoPageComponent` en `app.routes.ts`; verificar que `app.routes.spec` y `shell.component.spec` siguen en verde y que la pantalla se ve en `ng serve` con emuladores.

## 6. Cierre

- [x] 6.1 Verificación manual con emuladores: tras una sesión de repaso con 7 calificaciones (1/1/4/1), Progreso muestra "Repasadas hoy 7" y las barras en proporción; ajustar nuevas en Hoy y volver a Progreso → "Pendientes hoy" no cambia y el ajuste de Hoy sigue (hallazgo 5); desconectar la red → paneles visibles y "Necesitas conexión para contar tu colección."; reconectar → la colección aparece sola; cuenta sin tarjetas → estado vacío; verificar que `npm run lint`, `format:check`, `typecheck`, `test`, `test:integration` y `build` están en verde.
