# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/sesion-de-repaso/spec.md`. Estado esperado de `dev` cuando este change se ejecute (10.º, tras `cola-diaria`):

- De `cola-diaria`: `StudyHandoffService` (`hand`, `take`, `PreparedStudy { cards; source }`); `isReadyCard(card, endOfDay)`; `studyDayId`, `endOfStudyDay`; `DailyStats` con su esquema y repositorio de lectura (`getByDay`, `listRecent`); `DailyQueueService.refresh()` (Hoy lo llama al llegar, así la vuelta de una sesión rearma la cola sola); la ruta `/repaso` fuera del caparazón, todavía provisional.
- De `programacion-espaciada`: `SchedulingPort.preview(scheduling, now)` → `Record<Rating, SchedulingPreview { scheduling; intervalDays; due; log }>`, `Rating`, `SchedulingLogValues`, `formatInterval(due, now)`, `FakeSchedulingPort` (`setPreview`, `calls`).
- De `tarjetas`: `Card` (`front`, `back`, `example?`, `cardType`, `suspended`, `scheduling`), `CardState`, `cardDocumentSchema` y el mapeo de programación a documento, `hasCloze` / `clozeSegments` / `clozeQuestion`.
- De `ajustes-de-usuario` y `autenticacion-y-acceso`: `SessionService.user()` con `settings.autoGradeByTime`, `timezone`, `dayStartHour`; `requireSessionUser`.
- De `navegacion-y-shell`: `IconComponent` con `brain` y `check` en el catálogo; `ConnectivityPort.online` y `OfflineIndicatorComponent`; `Logger`; tokens de movimiento en `styles.scss` (`--duration-base 320ms`, `--duration-flip 500ms`, `--duration-view 360ms`, `--ease-out-soft`); la regla global de reducir movimiento.
- De `plataforma-datos-y-offline`: `FIRESTORE`, `firestoreTimestamp`, caché persistente multi-pestaña activa; `tests/support/firestore-test-environment.ts`. Reglas publicadas: `reviewLogs` permite `create` y `read`, niega `update` y `delete`.
- SDK de Firestore (verificado en la documentación y en los tipos): `writeBatch().commit()` aplica las escrituras a la caché local al instante y encola el lote en IndexedDB; la promesa se resuelve al confirmar el servidor y se rechaza si lo niega, en cuyo caso el SDK deshace el cambio local. La cola pendiente sobrevive a cerrar la app y se envía en orden. `increment()` funciona dentro de `set(..., { merge: true })` con mapas anidados (la 0.1.1 lo usaba).
- Código viejo de referencia en `backup/old-version` (`services/review/{review.service,suggest-rating}.ts`, `domain/ports/grade-persistence.port.ts`, `infrastructure/firestore/{grade-persistence.firestore,review-log.repository.firestore}.ts`, `features/review/{rating,review-session}`): el lote atómico y la sugerencia son correctos y se reescriben con TDD; el servicio esperaba el `commit`, no reencolaba, usaba `schedule(scheduling)` sin instante y mezclaba el filtro de "listas" con la sesión.
- Prototipo aprobado `docs/design/cadence-prototipo-extendido.html`: barra superior (`track` + "1 / 5" + Salir), tarjeta con `card-inner.flipped` (volteo 500 ms), cara trasera con reverso, divisor y ejemplo, `rating` con cascada de 40 ms, cierre con anillo (`ring`, 900 ms + check 380 ms), "Sesión terminada", "Repasaste N tarjetas.", pastillas por grado, nota, bloque IA y "Volver a Hoy".

## Goals / Non-Goals

**Goals:**
- Un núcleo de sesión **puro** (estado + transiciones) que se prueba con fechas fijas y sin Angular: reencolado, progreso, difíciles, rechazo tardío.
- Calificar se siente instantáneo con o sin red, y el almacén sigue siendo todo o nada.
- Que `practica-con-ia` solo tenga que inyectar la sesión para leer las difíciles y colgar su bloque en el hueco del cierre.

**Non-Goals:**
- Esperar al servidor en ningún camino.
- Leer el historial.
- Un puerto de reloj (misma política que `cola-diaria`: funciones puras con `now`, servicio con `Date.now()`, pruebas con `vi.setSystemTime`).

## Decisions

### 1. Modelo del historial y registro de calificación (`domain/models/review-log.model.ts`, `domain/models/grade-record.ts`; capa dominio)

- `ReviewLog { id; cardId; bookId; rating: Rating; state: CardState; due; stability; difficulty; elapsedDays; lastElapsedDays; scheduledDays; reviewedAt: Date; durationMs: number }` y `ReviewLogInput = Omit<ReviewLog, 'id'>`. Igual que la 0.1.1 salvo `durationMs`, que pasa a obligatorio (la spec lo exige en cada calificación; el esquema de lectura lo dejará opcional cuando alguien lea registros viejos).
- `GradeRecord { cardId; bookId; scheduling: CardScheduling; log: ReviewLogInput; dayId: string; stat: { rating: Rating; wasNew: boolean } }`: todo lo que el lote necesita, construido por el núcleo puro a partir de la tarjeta, el grado, `preview(scheduling, t1)[rating]` y el día de estudio.

### 2. Puerto de persistencia atómica (`domain/ports/grade-persistence.port.ts`, `infrastructure/firestore/grade-persistence.firestore.ts`, `schemas/review-log.schema.ts`, `testing/fake-grade-persistence.ts`)

- `GradePersistencePort.persistGrade(uid, record: GradeRecord): Promise<void>`. Una operación, un `writeBatch`: `update` de `cards/{cardId}` con el bloque de programación (mapeo de `tarjetas`) y `updatedAt`; `set` de `reviewLogs/{idNuevo}` con `reviewLogToDocument(log)`; `set(..., { merge: true })` de `dailyStats/{dayId}` con `dailyStatsIncrements(dayId, stat)`: `date`, `reviewsCompleted: increment(1)`, `ratingCounts.{grado}: increment(1)` y, según `wasNew`, `newCardsIntroduced.{bookId}` o `reviewsCompletedByBook.{bookId}`.
- **Los incrementos de indicadores viven en este lote, no en un método `recordReview` del repositorio de indicadores.** `cola-diaria` lo anunció como "`sesion-de-repaso` añade `recordReview`"; se cumple el fondo (aquí nace la escritura) con una forma más estricta: nadie escribe indicadores fuera del lote, así que un método suelto sería una puerta para romper el todo o nada. `dailyStatsIncrements` se exporta desde `daily-stats.repository.firestore.ts` para que el formato del documento tenga una sola definición. (Ajuste de redacción pendiente en el design de `cola-diaria`, sin cambio de comportamiento.)
- `reviewLogSchema` (Zod) existe solo para la prueba de ida y vuelta del documento y para quien lea registros en el futuro; `durationMs` opcional en lectura.
- `FakeGradePersistence`: guarda los `GradeRecord` recibidos y permite **resolver o rechazar cada llamada a mano** (`resolveNext()`, `rejectNext(error)`), imprescindible para probar el rechazo tardío con la sesión ya avanzada.

### 3. Núcleo puro de la sesión (`services/review/review-session-state.ts`; capa servicios, sin Angular)

Estado inmutable y funciones de transición; cada función recibe `now` y devuelve un estado nuevo.

```
Appearance   = { id: string; card: Card }                 // una aparicion de una tarjeta en la cola
SessionState = {
  status: 'active' | 'finished'
  queue: Appearance[]                                     // la actual es queue[0]
  distinctCount: number                                   // tarjetas distintas al arrancar
  exitedCardIds: Set<string>                              // salieron: no vuelven hoy
  revealed: boolean; shownAt: number; revealedAt: number | null
  suggested: Rating | null; previews: Record<Rating, SchedulingPreview> | null
  ratingCounts: RatingCounts                              // calificaciones (no tarjetas)
  difficult: { cardId; appearanceId }[]                   // orden de calificacion, sin repetir cardId
  inFlight: Map<appearanceId, { cardBefore: Card; rating: Rating; exited: boolean }>
  alerts: string[]                                        // avisos de rechazo tardio
  rejectedAfterFinish: number
}
startSession(cards, now, preview)            -> state (queue = una aparicion por tarjeta; previews de queue[0] con now)
reveal(state, now, autoGrade)                -> revealed, suggested = autoGrade ? suggestRatingByLatency(now - shownAt) : null
grade(state, rating, now, preview, endOfDay) -> { state, record: GradeRecord } | state sin cambios si !revealed o finished
  - cardAfter = { ...card, scheduling: preview(card.scheduling, now)[rating].scheduling }
  - durationMs = now - shownAt; log.state = card.scheduling.state (antes); reviewedAt = now
  - sigueLista = isReadyCard(cardAfter, endOfDay) -> queue = [...rest, { id nuevo, card: cardAfter }]
    si no -> exitedCardIds.add(card.id)
  - ratingCounts[rating]++ ; rating <= 2 y cardId no esta -> difficult.push
  - inFlight.set(appearance.id, { cardBefore: card, rating, exited: !sigueLista })
  - status = queue vacia ? 'finished' : 'active'; si active, previews de la nueva queue[0] con now, revealed=false, shownAt=now
confirmSaved(state, appearanceId)            -> inFlight.delete
rejectSaved(state, appearanceId, now, preview) ->
  - deshace: ratingCounts[rating]--, difficult sin la entrada de esa aparicion, exitedCardIds.delete si exited
  - si la tarjeta reencolada (cardAfter) sigue en la cola, se sustituye por cardBefore; si no, se anade al final { card: cardBefore }
  - alerts.push(rejectedGradeMessage(front)); si status era 'finished' -> rejectedAfterFinish++ y status vuelve a 'active'? NO: tras el cierre la sesion
    ya no se reabre (la pantalla de cierre esta visible); solo se cuenta. Hoy mostrara la tarjeta como pendiente.
remaining(state) = queue.length ; progressPercent(state) = exitedCardIds.size / distinctCount
```

Por qué la **aparición** y no la tarjeta es la unidad: una tarjeta reencolada tiene varias calificaciones en vuelo con resultados distintos; cada una se confirma o se rechaza por separado, y cada una mide su propia duración. El "doble toque" se resuelve sin cerrojo: tras calificar, `queue[0]` es otra aparición sin revelar, y `grade` ignora lo no revelado (hallazgo 9 y el requisito ADDED a la vez). *Alternativa descartada:* un `grading = true` como en la 0.1.1, que solo servía porque la sesión esperaba al servidor.

Sugerencia en `services/review/suggest-rating.ts` (`suggestRatingByLatency(ms)`, umbrales 1500 / 7000, nunca 1), igual que la 0.1.1. Textos de progreso y cierre en `features/repaso/repaso.copy.ts` (`remainingLabel(n)` → "Quedan 5" / "Queda 1"; `reviewedCardsLabel(n)` → "Repasaste 20 tarjetas." / "Repasaste 1 tarjeta."; `rejectedGradeMessage(front)`; `rejectedAfterFinishLabel(n)` → "1 calificación no se guardó. Esa tarjeta sigue pendiente." / "3 calificaciones no se guardaron. Esas tarjetas siguen pendientes."; nota, títulos, etiquetas de los grados, "¿Qué tan bien la recordaste?", "Mostrar respuesta", "Salir", "Volver a Hoy").

### 4. Servicio de sesión (`services/review/review-session.service.ts`; capa servicios, `providedIn: 'root'`)

- `state = signal<SessionState | null>(null)`; `computed`: `current` (`queue[0]?.card`), `revealed`, `suggested`, `previews`, `remaining`, `progress`, `ratingCounts`, `distinctCount`, `difficultCards: Card[]`, `alerts`, `rejectedAfterFinish`, `status: 'idle' | 'active' | 'finished'`.
- `start(prepared: PreparedStudy)`: `requireSessionUser`; calcula `endOfDay = endOfStudyDay(now, tz, dayStartHour)` y `dayId = studyDayId(...)` una vez por sesión (una sesión no cruza el fin del día: si lo cruza, la regla usa el `endOfDay` fijado al arrancar; riesgo aceptado y anotado); `startSession(cards, Date.now(), preview)`.
- `reveal()`: idempotente, lee `user().settings.autoGradeByTime` tal cual (hallazgo 8 de ajustes).
- `grade(rating)`: `const { state, record } = grade(...)`; si no hubo cambio, nada. Si hubo: `state.set(next)` y **sin `await`** `persistGrade(uid, record).then(() => confirmSaved).catch((error) => { logger.error(...); state.set(rejectSaved(...)) })`. La promesa queda en vuelo; la pantalla ya avanzó.
- `exit()`: `state.set(null)`; navega quien llama. Las promesas en vuelo siguen vivas: un rechazo tras `exit()` solo se registra con `Logger` (no hay pantalla que avisar; Hoy mostrará la tarjeta como lista al rearmarse). `finish` no limpia: el cierre lee el resumen; `reset()` lo limpia al pulsar "Volver a Hoy".
- Las difíciles se exponen como `difficultCards` y la sesión emite `ended = output`-like `signal<{ reason: 'finished' | 'exit'; difficult: Card[] } | null>` al terminar o salir: `practica-con-ia` lo consumirá inyectando este servicio; no se crea un puerto hasta ese segundo caso real.

### 5. Entrada a la pantalla y guardia (`features/repaso/repaso-page`, `app.routes.ts`; capa UI)

- `canActivate` `studyHandoffGuard`: si `studyHandoff.prepared() === null` → `router.createUrlTree(['/hoy'])`. No consume la bandeja.
- `RepasoPageComponent` al iniciar: `const prepared = studyHandoff.take()`; si `null` (carrera improbable) → navega a Hoy; si `cards.length === 0` → Hoy; si no, `session.start(prepared)`. Al destruirse por "Salir" o "Volver a Hoy", `session.exit()` / `session.reset()`. Así la pantalla nunca retoma nada (transversal 4).
- Teclado en la página (`@HostListener('window:keydown')`): Espacio → `reveal()` si no revelado (con `preventDefault` para no desplazar), o confirma la sugerencia si revelado y hay sugerencia; Enter → confirma la sugerencia; `1`-`4` → `grade` si revelado. Ignora eventos con el foco en controles de texto (no hay) y con `repeat`.
- Guardia contra toques accidentales: durante la animación de entrada de la nueva tarjeta (`--duration-base`) la zona de la tarjeta no revela por toque; el núcleo ya ignora calificaciones sin revelar.

### 6. Piezas de la pantalla (`features/repaso/`; capa UI)

- `ReviewTopBarComponent` (`review-top-bar`): `glass-soft`, barra de progreso (`role="progressbar"` con `aria-valuenow`), `remainingLabel`, botón "Salir". Debajo, `OfflineIndicatorComponent` si `!online()`.
- `FlipCardComponent` (`flip-card`): entradas `card`, `revealed`, `appearanceId`; salida `revealRequested`. Superficie **sólida** (`surface`, alto contraste). Dos caras con `backface-visibility: hidden`; `revealed` añade la clase que rota 180° en `--duration-flip`; la cara trasera muestra reverso y, si hay, `example` con tipografía secundaria; cloze: anverso con `clozeQuestion` ("[…]"), al revelar `clozeSegments` con los huecos en acento y sin reverso. Botón "Mostrar respuesta" bajo la tarjeta antes de revelar. Cambio de aparición: salida a la izquierda y entrada desde la derecha (`--duration-base`), con `@keyframes` por clase y `prefers-reduced-motion` que anula volteo y desplazamiento (además de la regla global). La cara trasera lleva `aria-live="polite"` para anunciar el reverso al revelar.
- `RatingBarComponent` (`rating-bar`): entradas `previews`, `suggested`, `now` (para `formatInterval`), `showKeyHints`; salida `graded`. Cuatro `<button>` **sólidos** (no acrílico: animan) en una `grid-cols-4` con `max-width` en escritorio; cada uno con cuatro `IconComponent name="brain"` grandes (`size="lg"` nuevo en el catálogo), N activos con su token `rating-*` y el resto atenuados por token; etiqueta; intervalo (`formatInterval(preview.due, now)`); `<kbd>` oculto bajo `@media (hover: none)` (aproximación a "táctil sin teclado"); `aria-label` "{etiqueta}, vuelve en {intervalo}{ (sugerido)}"; sugerido con anillo de acento e insignia. Cascada: `animation-delay` por `--delay-cascade` (nuevo token, 40 ms) sobre `--duration-cascade` (nuevo, 280 ms); al tocar, realce en su color (`--duration-fast`). Solo emite 1-4 (contrato de CLAUDE.md).
- `SessionSummaryComponent` (`session-summary`): anillo SVG que se completa (`--duration-ring` 900 ms, nuevo token) y check (`--duration-check` 380 ms, nuevo), título, `reviewedCardsLabel(distinctCount)` con el número que sube con `requestAnimationFrame` (directo con reducir movimiento), pastillas por grado con color y número, nota, `rejectedAfterFinishLabel` si aplica, `<ng-content select="[practice]">` como hueco del bloque de práctica, botón "Volver a Hoy" → `session.reset()` + navegar.
- Tokens nuevos en `styles.scss`: `--duration-cascade`, `--delay-cascade`, `--duration-ring`, `--duration-check`. `IconComponent` gana el tamaño `lg`.

### 7. Rutas

`/repaso` pasa de la página provisional a `RepasoPageComponent` con `canActivate: [authGuard, studyHandoffGuard]`, fuera del caparazón (ya lo estaba). Se amplía `app.routes.spec.ts`: sin bandeja redirige a `/hoy`; con bandeja renderiza la sesión sin navegación.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra superior (progreso, contador, Salir) | `glass-soft`, estática | 1 |
| Indicador sin conexión | `glass-soft`, estático | 2 (solo sin red) |
| Tarjeta de estudio | **sólida**, alto contraste | 0 |
| Botones de calificación | **sólidos** (animan: cascada y realce) | 0 |
| Cierre: anillo, pastillas, botón | sólidos | 0 |
| Hueco del bloque de práctica | lo decide `practica-con-ia` dentro del presupuesto (queda una capa libre) | — |

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `ReviewLog`, `ReviewLogInput`, `GradeRecord`, `reviewLogSchema` | `progreso` o un futuro optimizador si leen el historial |
| `GradePersistencePort.persistGrade` y `FakeGradePersistence` (resolver/rechazar a mano) | Nadie más escribe calificaciones; `practica-quiz` lo prueba por ausencia (no debe llamarlo) |
| `dailyStatsIncrements(dayId, stat)` | Única definición de los incrementos del día |
| Núcleo puro `review-session-state.ts` (`startSession`, `reveal`, `grade`, `confirmSaved`, `rejectSaved`) | `practica-con-ia` (difíciles por aparición), pruebas |
| `ReviewSessionService.difficultCards`, `ended`, `status`, `ratingCounts` | `practica-con-ia` (bloque del cierre, entrega al salir) |
| `SessionSummaryComponent` con el hueco `[practice]` | `practica-con-ia` |
| `RatingBarComponent` (solo emite 1-4) | `practica-quiz` si algún día califica con cerebros; cambiar su aspecto no toca nada más |
| `FlipCardComponent` con cloze y ejemplo | `practica-quiz` |
| `studyHandoffGuard` | Patrón de pantalla efímera para `practica-quiz` (transversal 4) |
| Tokens `--duration-cascade`, `--delay-cascade`, `--duration-ring`, `--duration-check`; `IconComponent size="lg"` | Cierre de práctica, otros resúmenes |

## Plan de pruebas

Fechas fijas (`T0 = 2026-10-24T15:00:00Z`, `America/Bogota`, `dayStartHour = 4`, fin del día `2026-10-25T09:00:00Z`). El núcleo puro recibe `now` y un `preview` falso determinista; el servicio usa `FakeSchedulingPort`, `FakeGradePersistence` y `vi.setSystemTime`.

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Orden respetado; Siempre nueva; Lista vacía no entra | `review-session-state.spec`: `startSession([A,B,C])` → `queue` A, B, C, `distinctCount 3`, `ratingCounts` en cero, `difficult` vacío; `review-session.service.spec`: `start` tras un `reset` arranca limpio; `repaso-page.component.spec`: `take()` con `cards: []` → URL `/hoy` | unitaria pura + TestBed + componente |
| Otra vez en medio de la sesión; Nueva con Bien vuelve una vez; Tarjeta que gradúa sale; Vencimiento más tarde hoy; Vencimiento pasado el fin del día; La sesión termina cuando nada sigue listo | `review-session-state.spec`: `grade` con un `preview` que da `due = now + 1 min` → la aparición vuelve al final con `scheduling` nuevo e `id` distinto; `due = now + 8 d` → `exitedCardIds` la contiene; `due` 10 min antes del fin del día → vuelve; `due` 10 min después del fin del día (now = 03:55) → sale; cola de 1 con `due` lejano → `status 'finished'` | unitaria pura |
| Momento pregunta; Momento respuesta; Toque sobre la tarjeta; Espacio antes de revelar; Volver a tocar ya revelada | `flip-card.component.spec`: sin `revealed` → anverso, "Mostrar respuesta", sin cara trasera visible; `revealed` → clase de volteo y reverso; clic emite `revealRequested`; `review-session-state.spec`: `reveal` dos veces → mismo estado; `repaso-page.component.spec`: Espacio sin revelar → `reveal` y `preventDefault`; ya revelada, clic en la tarjeta → sin cambios | componente + unitaria pura |
| Tarjeta con ejemplo; Cloze sin revelar; Cloze revelada; Marcador vacío; Libro configurado en ambas direcciones | `flip-card.component.spec`: `example` presente → se lee bajo el reverso; cloze "El {{gato}} es {{negro}}" → "El […] es […]" y, revelada, "gato" y "negro" con la clase de acento y sin reverso; "{{}}" literal; tarjeta `reverse` → anverso como pregunta igual | componente |
| Reducir movimiento (tarjeta); Cierre con reducir movimiento | Estática (`tests/static/repaso-styles.spec`): `flip-card.component.scss` y `session-summary.component.scss` contienen `prefers-reduced-motion`; `session-summary.component.spec` con `matchMedia` falso → número final directo | estática + componente |
| Orden y conteo; Un toque califica; Intervalos visibles por opción; Etiqueta accesible; Pista oculta en táctil | `rating-bar.component.spec`: cuatro botones con 1, 2, 3 y 4 iconos activos (clase `rating-*`) y etiquetas; clic en el tercero emite 3; previews con `due` +1 min, +6 min, +10 min, +8 d → "1 min", "6 min", "10 min", "8 días"; `aria-label` "Bien, vuelve en 3 días" y "(sugerido)" cuando aplica; `showKeyHints false` → sin `<kbd>`; estática: `.scss` contiene `(hover: none)` | componente + estática |
| Lo guardado se calcula al tocar | `review-session.service.spec` con `FakeSchedulingPort.calls`: `start` en `T0` → una llamada con `T0`; `grade` en `T0 + 40 s` → segunda llamada con `T0 + 40 s` y el `GradeRecord.scheduling.lastReview === T0 + 40 s`, `log.reviewedAt === T0 + 40 s` | TestBed |
| Tecla con respuesta revelada; Tecla sin revelar; Confirmar con Enter; Enter sin sugerencia; Elegir distinto a lo sugerido; Sesión terminada | `repaso-page.component.spec`: revelada + "4" → `grade(4)`; sin revelar + "2" → nada; sugerencia 3 + Enter → `grade(3)`; sin sugerencia + Enter → nada; sugerencia 4 + clic en "Otra vez" → `grade(1)`; `status 'finished'` + "4" → nada | componente |
| Recuerdo instantáneo; Recuerdo normal; Recuerdo lento; Ajuste apagado | `suggest-rating.spec`: 1500 → 4, 1501 → 3, 7000 → 3, 7001 → 2; `review-session-state.spec`: `reveal` con `autoGrade false` → `suggested null`; `review-session.service.spec`: usuario con `autoGradeByTime: false` → `suggested null` sin `??` (el fake de sesión entrega el perfil completo) | unitaria pura + TestBed |
| Duración registrada; Dos apariciones, dos duraciones | `review-session-state.spec`: `shownAt = T0`, `grade` en `T0 + 8 s` → `record.log.durationMs === 8000`; tras reencolar y mostrar de nuevo en `T1`, `grade` en `T1 + 1,5 s` → segundo `record` con 1500 | unitaria pura |
| Todo queda guardado; Nada queda a medias; Registro de una tarjeta nueva; Primera vista de una nueva; Repaso de una vencida; Madrugada | `grade-persistence.integration.spec` (emulador): `persistGrade` con una nueva y grado 3 → la tarjeta tiene la programación nueva y `updatedAt`, existe un `reviewLog` con `rating 3`, `state 0`, `reviewedAt`, `durationMs`, y `dailyStats/{dayId}` tiene `reviewsCompleted 1`, `ratingCounts.good 1`, `newCardsIntroduced.{bookId} 1` y sin `reviewsCompletedByBook`; con una en repaso → `reviewsCompletedByBook.{bookId} 1` y `newCardsIntroduced` intacto; un segundo `persistGrade` el mismo día acumula 2; un lote cuyo `cardId` apunta a un árbol ajeno (reglas) → rechaza y no existe ni el `reviewLog` ni el documento del día; `review-session-state.spec`: `dayId` para `T0` a la 01:30 local → día anterior | integración + unitaria pura |
| Avanza sin esperar; Rechazo durante la sesión; Rechazo tras el cierre; Reintento tras el rechazo; Nada queda a medias (sesión) | `review-session.service.spec` con `FakeGradePersistence` sin resolver: tras `grade(3)` `current` ya es la siguiente y `remaining` bajó, con la promesa pendiente; `rejectNext()` → `alerts` contiene "No se guardó tu calificación de «to give up». Vuelve a calificarla.", `ratingCounts.good` volvió a 0, la tarjeta está al final de `queue` con su programación anterior y `progress` retrocedió; con `status 'finished'` y `rejectNext()` → `rejectedAfterFinish 1` y `status` sigue `'finished'`; `FakeLogger` recibe el error; volver a calificar la devuelta y `resolveNext()` → `alerts` vacío | TestBed |
| Doble toque; Calificar sin revelar desde la lógica | `review-session-state.spec`: `grade` sin `revealed` → mismo estado y sin `record`; tras un `grade`, un segundo `grade` inmediato (la nueva aparición no está revelada) → sin cambios; `status 'finished'` → sin cambios | unitaria pura |
| Primera tarjeta de cinco; Tras calificar dos; Una vuelve; Queda una | `review-session-state.spec` + `repaso.copy.spec`: `remaining` 5 y `progressPercent` 0; dos salidas → 3 y 40 %; una que vuelve → 5 y 0 %; `remainingLabel(1)` → "Queda 1", `(5)` → "Quedan 5"; `review-top-bar.component.spec`: `aria-valuenow 40` y el texto | unitaria pura + componente |
| Fin de sesión; Una sola tarjeta; Cierre con reducir movimiento | `session-summary.component.spec`: título "Sesión terminada", `reviewedCardsLabel(20)` y `(1)`, pastillas con los cuatro conteos y clases `rating-*`, nota, "Volver a Hoy" navega a `/hoy` y llama a `reset`; `rejectedAfterFinish 1` → "1 calificación no se guardó. Esa tarjeta sigue pendiente."; el hueco `[practice]` proyecta contenido | componente |
| Difíciles de la sesión; Calificación fallida no entra; Sesión nueva arranca limpia | `review-session-state.spec`: grados 1, 3, 2, 4 → `difficult` con la 1.ª y la 3.ª en orden; la misma tarjeta con 1 y luego 2 → una sola vez; `rejectSaved` de la aparición con grado 1 → sale de `difficult`; `startSession` nuevo → vacío; `review-session.service.spec`: `ended` emite `{ reason: 'finished', difficult }` al terminar y `{ reason: 'exit', difficult }` en `exit()` | unitaria pura + TestBed |
| Salida anticipada; Salir justo después de calificar | `repaso-page.component.spec`: "Salir" → `exit()` y URL `/hoy`, sin diálogo; `review-session.service.spec`: `exit()` con una promesa pendiente → `state null`; `rejectNext()` después → solo `FakeLogger`, sin excepción | componente + TestBed |
| Entrar desde Hoy con tarjetas; Abrir la pantalla sin sesión activa; Volver atrás tras terminar | `app.routes.spec` ampliado: con `hand(...)` previo, `/repaso` renderiza la sesión sin navegación; sin bandeja → URL final `/hoy`; `repaso-page.component.spec`: `take()` consume la bandeja (segundo `take()` → `null`) | componente |
| Calificar sin red; Vuelve la conexión | `repaso-page.component.spec` con `FakeConnectivity`: sin red se pinta el indicador y `grade` sigue avanzando; manual con el emulador y DevTools en "Offline": cinco calificaciones, cerrar la pestaña, reabrir con red → los cinco `reviewLogs` existen en orden | componente + manual |
| (Catálogo e iconos) | `icon.component.spec` ampliado: `brain` en `size="lg"`; estática: `styles.scss` define los cuatro tokens nuevos | componente + estática |

## Risks / Trade-offs

- [Rechazo tardío cuando el usuario ya salió o ya cerró] → se registra con `Logger`; Hoy rearma la cola al llegar y la tarjeta aparece como lista. Aceptado: el caso es raro (reglas o perfil) y el almacén no queda a medias.
- [Una sesión que cruza el fin del día de estudio] → `endOfDay` y `dayId` se fijan al arrancar; las calificaciones posteriores a las 04:00 se acreditan al día en que empezó la sesión y el reencolado usa ese límite. Aceptado: es coherente con "lo que estudias de madrugada cuenta para el día anterior".
- [Cola pendiente del SDK muy grande] → cientos de escrituras por semana sin red son normales; miles solo en un uso anómalo. Sin mitigación propia.
- [`@media (hover: none)` como señal de "sin teclado"] → un portátil con pantalla táctil y ratón sigue mostrando las pistas; una tableta con teclado las oculta. Es la aproximación estándar; si molesta, se añade `(pointer: coarse)`.
- [Promesas en vuelo y pruebas] → `FakeGradePersistence` resuelve a mano, así cada prueba controla el orden; en la app real el orden lo garantiza la cola del SDK.
- [Animaciones de salida y entrada por aparición] → una tarjeta reencolada tiene un `appearanceId` nuevo, así que Angular la trata como elemento nuevo y la animación de entrada se dispara aunque sea la misma tarjeta.
- [`durationMs` sin tope] → valores enormes si el usuario deja la pantalla abierta; decidido en el explore, quien consuma el dato filtrará.

## Migración

Décimo commit de la rama única `feature/reescritura-cadence` en la fase B. Sin cambios de datos ni de reglas (el historial y los indicadores usan el formato y las reglas de la 0.1.1). Rollback: revertir el merge. Ajuste de redacción pendiente, sin cambio de comportamiento, en el design de `cola-diaria` (decisión 2 y tabla de contratos: "`sesion-de-repaso` añade `recordReview`" → "los incrementos viven en el lote atómico de `sesion-de-repaso`").
