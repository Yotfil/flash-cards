# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/practica-quiz/spec.md`. Estado esperado de `dev` cuando este change se ejecute (14.º, tras `progreso`):

- De `tarjetas`: `CardsService.cards` (recurso con las tarjetas del capítulo abierto), `Card`, `hasCloze`, `normalizeCardText`.
- De `cola-diaria`: `StudyHandoffService` (`prepared` signal, `hand`, `take`) y `PreparedStudy`; `StudyLaunchButtonComponent` (`label`, `variant`, `prepare: () => Promise<Card[]>`, `source`, `emptyMessage`, `errorMessage`, `disabled`) que entrega a `StudyHandoffService` y navega a `/repaso`; `CapituloDetailPageComponent` y `LibroDetailPageComponent` con zona de acciones.
- De `sesion-de-repaso`: `ReviewTopBarComponent` (`glass-soft`, `role="progressbar"`, `remainingLabel`, botón Salir) en `features/repaso/review-top-bar`; `studyHandoffGuard` (`features/repaso/study-handoff.guard.ts`); `/repaso` fuera del caparazón con `authGuard`.
- De `navegacion-y-shell`: `IconComponent` (`check`, `x`), `authGuard`, rutas; `/practicar` apunta a la página provisional.
- Capas (ESLint): `shared` solo importa `domain`; `features` importa `services` y `shared`; `services` importa `domain`.
- Código viejo de referencia en `backup/old-version` (`services/quiz/{generate-quiz,written-answer,quiz.service}.ts`, `features/quiz/practice-session`): `generateQuiz(cards, { random, maxQuestions })`, `isWrittenAnswerCorrect` y `normalizeAnswer` son correctos y se reescriben con TDD; el servicio no se reiniciaba (hallazgo 2) y la barra usaba `(pos - 1) / total` (hallazgo 3).

## Goals / Non-Goals

**Goals:**
- Cerebro puro completo (elegibles, generador, respuesta escrita, estado) con la cobertura más densa del change; UI que solo pinta.
- Reutilizar la bandeja y la barra superior del repaso sin copiarlas: dos generalizaciones con segundo caso real.
- Cero escrituras y cero lecturas en la práctica por capítulo.

**Non-Goals:**
- Difíciles para `practica-con-ia`, clozes, "lo listo de hoy", mínimo de tarjetas.

## Decisions

### 0. Generalizaciones previas (refactor; segundo caso real)

- **Bandeja genérica** `services/handoff/handoff-tray.ts`: `abstract class HandoffTray<T> { prepared = signal<T | null>; hand(value); take(): T | null }`. `StudyHandoffService extends HandoffTray<PreparedStudy>` sin cambio de comportamiento (sus pruebas siguen en verde). Nace `PracticeHandoffService extends HandoffTray<PreparedPractice>` en `services/practice/`. *Por qué dos servicios y no uno con unión:* el guard de `/repaso` no debe aceptar una práctica ni al revés; el tipo lo garantiza.
- **Barra superior de sesión** `shared/session-top-bar/session-top-bar.component.ts` (`SessionTopBarComponent`): entradas `progress: number` (0-1), `label: string`, `exitLabel = 'Salir'`; salida `exit`. `glass-soft`, `role="progressbar"` con `aria-valuenow`. `ReviewTopBarComponent` se sustituye por ella en `RepasoPageComponent` (el texto `remainingLabel` lo calcula la página). *Por qué en `shared`:* es presentacional y la usan dos features; `shared` solo importa `domain`, y esta barra no necesita nada más.
- **Botón de lanzamiento con destino:** `StudyLaunchButtonComponent` cambia su contrato a `prepare: () => Promise<number>` (cuántas preguntas o tarjetas se prepararon; quien prepara entrega a su propia bandeja) y `destination: string[]` (ruta a navegar si `> 0`). Los tres usos de `cola-diaria` pasan a envolver su `prepare` con `studyHandoff.hand(...)` y devolver `cards.length`; `destination = ['/repaso']`. Sus pruebas se adaptan en la misma tarea. *Alternativa descartada:* un `PracticeLaunchButtonComponent` copiado: misma máquina de estados ("Preparando…", vacío, error) duplicada.

### 1. Cerebro puro (`services/practice/`; capa servicios)

- `eligible-cards.ts`: `selectEligibleCards(cards): Card[]` (no cloze, `front.trim()` y `back.trim()` no vacíos; suspendidas incluidas).
- `generate-quiz.ts`: `generateQuiz(cards: Card[], options: { pool?: Card[]; random?: () => number; maxQuestions?: 10 }): QuizQuestion[]`. Baraja `cards` (Fisher-Yates con `random`), toma `maxQuestions`; `pool` (por defecto `cards`) es de donde salen los distractores: respuestas distintas por `normalizeCardText(back)` conservando el primer texto, excluida la correcta; posición impar → `multiple-choice` con 3 distractores al azar y 4 opciones barajadas, si no hay 3 → `written`; posición par → `written`. `QuizQuestion = { id; cardId; type; prompt; answer; options?: string[] }`. *Por qué `random` inyectable:* pruebas deterministas sin mocks de `Math`.
- `written-answer.ts`: `normalizeAnswer` (= `normalizeCardText`, se reutiliza) e `isWrittenAnswerCorrect(input, answer)` (reverso completo o cualquier fragmento por `,` `;` `/`; vacío nunca).
- `practice-state.ts` (puro, sin Angular): `PracticeState = { questions; index; answers: Map<questionId, { chosen; correct }>; status: 'active' | 'finished' }`; `startPractice(questions)`, `answerCurrent(state, chosen)` (ignora si ya respondida o `finished`; corrige con igualdad exacta en opción múltiple y con `isWrittenAnswerCorrect` en escribir), `advance(state)` (solo si la actual está respondida; desde la última → `finished`), selectores `progress(state) = answers.size / questions.length`, `score(state)`, `isLast(state)`, `currentAnswer(state)`.
- `practice-session.service.ts`: `PracticeSessionService` (`providedIn: 'root'`): `state = signal<PracticeState | null>`; `origin = signal<PracticeOrigin | null>`; `start(prepared: PreparedPractice)`, `answer(chosen)`, `advance()`, `reset()`; `computed`: `current`, `position`, `total`, `progress`, `score`, `finished`, `feedback`. Sin inyección de repositorios: no escribe nada.
- `practice.service.ts`: `PracticeService`: `prepareChapterPractice(cards: Card[], origin): Promise<number>` (sincrónico envuelto: `selectEligibleCards` → `generateQuiz` → `practiceHandoff.hand({ questions, origin })` → `questions.length`) y `prepareBookPractice(bookId): Promise<number>` (`requireSessionUid`, `cards.listByBook(uid, bookId)`, igual; registra en `Logger` si la lectura falla y relanza). `PreparedPractice = { questions: QuizQuestion[]; origin: { kind: 'chapter'; bookId; chapterId } | { kind: 'book'; bookId } }`.

### 2. Lectura por libro (`domain/ports/card.repository.ts`, `infrastructure/firestore`)

`CardRepository.listByBook(uid, bookId): Promise<Card[]>` con `getDocs(query(cards, where('bookId', '==', bookId)))`: cache-first, sin red devuelve lo guardado. Distinto de `listByBookFromServer` (exportación) a propósito: aquí una caché parcial es aceptable. Fake: devuelve las sembradas del libro o lanza.

### 3. Pantalla y preguntas (`features/practica/`; capa UI)

- Ruta `/practicar` → `PracticaPageComponent` con `canActivate: [authGuard, practiceHandoffGuard]` (`features/practica/practice-handoff.guard.ts`: sin `prepared()` → `/biblioteca`), fuera del caparazón.
- `PracticaPageComponent`: al iniciar `const prepared = practiceHandoff.take()`; `null` o 0 preguntas → `/biblioteca`; si no `session.start(prepared)`. `SessionTopBarComponent` con `progress`, `label = positionLabel(position, total)` ("4 / 10"), `exit` → `navigateToOrigin()`. Cuerpo según `session.finished()`: pregunta actual (`MultipleChoiceQuestionComponent` o `WrittenQuestionComponent` según `type`) + `PracticeFeedbackComponent` + botón "Siguiente"/"Ver resultado"; o `PracticeSummaryComponent`. `DestroyRef.onDestroy(() => session.reset())`. `navigateToOrigin()`: `chapter` → `/biblioteca/{bookId}/{chapterId}`, `book` → `/biblioteca/{bookId}`.
- `MultipleChoiceQuestionComponent`: entradas `prompt`, `options`, `answered: { chosen; answer } | null`; salida `choose(option)`. Botones sólidos; tras responder, `disabled`, la correcta con clase de acento + `IconComponent name="check"`, la elegida errónea atenuada + `x`, el resto atenuado. Sin escala rojo→verde.
- `WrittenQuestionComponent`: entradas `prompt`, `answered`; salida `submit(text)`. `<input autocomplete="off" autocapitalize="off" spellcheck="false">`, "Comprobar" deshabilitado con vacío/espacios, Enter envía; tras responder, deshabilitado; se vacía al cambiar de pregunta (clave por `questionId`).
- `PracticeFeedbackComponent`: entrada `result: { correct: boolean; answer: string } | null`; "¡Correcto!" + `check` o "La respuesta era «…»." + `x`, en `role="status"`.
- `PracticeSummaryComponent`: entradas `score`, `total`, `originKind`; "¡Práctica completada!", `scoreLabel(score, total)` ("Acertaste 7 de 10."), botón `backLabel(originKind)` ("Volver al capítulo" / "Volver al libro"); salida `back`.
- Textos en `features/practica/practica.copy.ts`.

### 4. Botones de entrada

- `CapituloDetailPageComponent`: junto a "Estudiar este capítulo", `StudyLaunchButtonComponent` secundario "Practicar" con `prepare = () => practice.prepareChapterPractice(cards.sorted(), { kind: 'chapter', bookId, chapterId })`, `destination = ['/practicar']`, visible solo si `cards.status() === 'resolved'` y `selectEligibleCards(cards.value()).length > 0` (computed `canPractice`). Como la preparación es en memoria, "Preparando…" dura un tick; `emptyMessage` no se usa porque el botón no existe sin elegibles.
- `LibroDetailPageComponent`: junto a "Estudiar este libro", `StudyLaunchButtonComponent` secundario "Practicar" con `prepare = () => practice.prepareBookPractice(bookId)`, `destination = ['/practicar']`, `emptyMessage = "Nada que practicar aún."`, `errorMessage = "No se pudo preparar la práctica. Inténtalo de nuevo."`, visible cuando `chapters.status() === 'resolved'`.

### 5. Correcciones de la fase B (2026-10-25, vía `/opsx:update`)

1. **`StudyHandoffService.handCards(cards, source)`**: entrega solo si hay tarjetas y devuelve cuántas. Los tres usos de estudiar (Hoy, libro, capítulo) envuelven su preparación con él en una línea, en vez de repetir el `if` en cada pantalla.
2. **Guardia de sesión:** el código usa `requireSessionGuard` (no `authGuard`), como el repaso.
3. **`WrittenQuestionComponent`** recibe `questionId` y `answered: boolean`, y su salida se llama `submitted`: la regla de Angular ESLint `no-output-native` prohíbe una salida `submit`.
4. **Página provisional retirada:** `/practicar` era la última ruta con `PendingPageComponent`; se borran el componente, su `pendingPage` en `app.routes.ts` y sus textos de `SHELL_COPY`.
5. **Textos de la barra:** "Salir" y "Progreso de la sesión" pasan de `REPASO_COPY` a `shared/session-top-bar/session-top-bar.copy.ts` (la barra es de `shared`).
6. **Foco con teclado:** la pregunta escrita toma el foco al aparecer y "Siguiente"/"Ver resultado" al responder (Enter responde, Enter avanza).
7. **`seededRandom`** en `testing/` da el azar determinista de las pruebas del generador.
8. **Clases de las opciones:** el fondo va dentro de cada estado (`bg-surface` o `bg-accent-tint`); fijo en la plantilla, Tailwind dejaba ganar a `bg-surface` sobre el tinte de la correcta.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra superior de sesión | `glass-soft` | 1 (no hay nav en pantalla completa) |
| Tarjeta de pregunta, opciones, campo, feedback, resumen | sólidas (es lo que se lee y lo que anima al responder) | 0 |
| Fondo | degradado de la app sin vinotinto (como el repaso) | 0 |

Feedback por acento + iconos + texto; la escala rojo→verde nunca aparece. Transiciones con los tokens de movimiento y `prefers-reduced-motion`.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `HandoffTray<T>` | Cualquier pantalla completa que reciba un lote preparado (`practica-con-ia` si abre una pantalla) |
| `SessionTopBarComponent` | `practica-con-ia` si muestra progreso de un lote |
| `StudyLaunchButtonComponent` con `destination` | Cualquier botón "preparar y navegar" |
| `selectEligibleCards`, `generateQuiz`, `isWrittenAnswerCorrect` | Futuras variantes de práctica |
| `CardRepository.listByBook` | `practica-con-ia` (rehidratar un lote por ids no; pero lecturas por libro sí), mover tarjetas de capítulo |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Capítulo con tarjetas básicas; Capítulo sin tarjetas elegibles; Capítulo vacío; Falla la carga al preparar | `capitulo-detail-page.component.spec`: con básicas → botón "Practicar" visible, tocarlo llama a `prepareChapterPractice` con las tarjetas cargadas (el fake de tarjetas no recibe otra lectura) y navega a `/practicar`; solo clozes → sin botón; vacío → sin botón; repo que lanza → `ErrorState` de la lista y sin botón | componente |
| Libro con tarjetas básicas; Libro sin tarjetas elegibles; Falla la lectura del libro; Libro sin red | `practice.service.spec`: `prepareBookPractice` lee `listByBook`, arma ≤10 con pool del libro, entrega a la bandeja y devuelve el número; solo clozes → 0 y bandeja vacía; repo que lanza → `Logger` y relanza; `libro-detail-page.component.spec`: botón secundario, 0 → "Nada que practicar aún.", error → texto de error; `card.repository.integration.spec`: `listByBook` devuelve las del libro (sin red no se puede probar en Node: se verifica a mano) | unitaria pura + componente + integración |
| Entrada directa sin práctica preparada; Volver atrás tras salir; Dos prácticas seguidas | `app.routes.spec`: `/practicar` sin bandeja → `/biblioteca`; `practica-page.component.spec`: `take()` vacía la bandeja, destruir la página llama a `reset()`; dos `start` seguidos → índice 0 y puntaje 0; `generate-quiz.spec`: dos `random` distintos → órdenes distintos | componente + unitaria pura |
| Salir a mitad; Volver al capítulo; Volver al libro | `practica-page.component.spec`: `exit` con origen capítulo → `/biblioteca/b1/c1`; resumen con origen libro → "Volver al libro" → `/biblioteca/b1`; `practica.copy.spec`: `backLabel` | componente + unitaria pura |
| Barra de progreso; Barra completa | `practice-state.spec`: `progress` 3/10 antes de responder la 4.ª, 4/10 después, 1 al responder la última; `session-top-bar.component.spec`: `aria-valuenow` y ancho; `practica.copy.spec`: `positionLabel(4, 10)` → "4 / 10" | unitaria pura + componente |
| Las cloze se omiten; Tarjeta con reverso vacío; Sin tarjetas elegibles | `eligible-cards.spec`: cloze fuera, básica dentro; reverso de espacios fuera; suspendida dentro; lista vacía → `[]` | unitaria pura |
| Capítulo grande; Capítulo pequeño; Alternancia; Pocas respuestas distintas | `generate-quiz.spec` con `random` fijo: 15 → 10; 2 → 2 ambas `written`; 6 distintas → MC, W, MC, W, MC, W; 3 tarjetas → todas `written` | unitaria pura |
| Cuatro opciones distintas con la correcta; Reversos repetidos; Distractores fuera del quiz | `generate-quiz.spec`: 4 opciones únicas que incluyen `answer` y son reversos del pool; "casa"/"CASA" cuentan una vez; con pool de 15 y quiz de 10, algún distractor proviene de las 5 fuera | unitaria pura |
| Elegir la opción correcta; Elegir una errónea; Las opciones se bloquean | `practice-state.spec`: `answerCurrent` correcto/erróneo; segunda respuesta ignorada; `multiple-choice-question.component.spec`: clases de acento/atenuado e iconos, botones `disabled` tras responder | unitaria pura + componente |
| Mayúsculas y espacios; Cualquier fragmento; Reverso completo; Acentos; Respuesta distinta; Entrada vacía | `written-answer.spec`: los seis casos con los textos exactos; `written-question.component.spec`: "Comprobar" deshabilitado con espacios, Enter envía, campo deshabilitado tras responder, se vacía al cambiar de pregunta | unitaria pura + componente |
| Acierto; Fallo; Responder dos veces no cuenta doble; Última pregunta | `practice-feedback.component.spec`: textos e iconos; `practice-state.spec`: `score` sube una vez; `practica-page.component.spec`: "Siguiente" vs "Ver resultado", no avanza sin responder | componente + unitaria pura |
| Resumen con aciertos y fallos; Respuestas después de terminar | `practice-summary.component.spec`: "¡Práctica completada!", "Acertaste 1 de 2."; `practice-state.spec`: `answerCurrent` en `finished` no cambia nada | componente + unitaria pura |
| Practicar no cambia la cola de Hoy; Practicar no cuenta como repaso | `practice-session.service.spec`: el servicio no inyecta ningún repositorio de escritura (afirmación estructural: sus dependencias son solo la bandeja); `practica-page.component.spec`: completar una práctica no llama a ningún método de `FakeCardRepository`, `FakeDailyStatsRepository` ni `FakeGradePersistence` | unitaria pura + componente |
| Generalizaciones | `handoff-tray.spec`: `hand`/`take` genérico; `study-handoff.service.spec` y `repaso-page.component.spec` siguen en verde; `session-top-bar.component.spec`; `study-launch-button.component.spec` con `prepare` numérico y `destination`; `hoy-page`/`libro-detail`/`capitulo-detail` specs de `cola-diaria` adaptados y en verde | unitaria pura + componente |

## Risks / Trade-offs

- [Tres refactors sobre changes anteriores (bandeja, barra, botón)] → mecánicos, con sus pruebas adaptadas en la misma tarea y en verde antes de tocar la práctica; se anotan en `MEMORY.md`.
- [Práctica por libro con caché parcial sin red] → aceptado: es ejercicio sin consecuencias; el quiz sale con lo que hay.
- [Un reverso con `,` donde la coma no separa sinónimos ("ir, ira")] → aceptado y documentado como intención.
- [`random` por defecto `Math.random`] → solo en producción; las pruebas inyectan uno determinista.
- [Libro enorme leído entero para 10 preguntas] → una lectura por práctica; si pesara, se limita por capítulo al azar (aditivo).

## Migration Plan

Decimocuarto commit de la rama única `feature/reescritura-cadence` en la fase B (última de las originales: con él y `exportacion-de-libros` se abre el PR de 1.0.0). Sin datos, reglas ni índices nuevos. `/practicar` deja de ser provisional. Rollback: revertir el commit.
