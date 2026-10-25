# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `tarjetas`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Sin componentes ni literales de copy sueltos. Fechas fijas en todas las pruebas (`T0 = 2026-10-23T10:00:00Z`). Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Dominio

- [x] 1.1 Crear `src/app/domain/models/rating.ts` (`Rating = 1 | 2 | 3 | 4`, `RATINGS`) y `src/app/domain/ports/scheduling.port.ts` (`SchedulingPreview`, `SchedulingLogValues`, `SchedulingPort.preview(scheduling, now)` con `now` obligatorio); verificar `npm run typecheck` y `npm run lint`.
- [x] 1.2 Escribir en rojo `src/app/testing/fake-scheduling-port.spec.ts` (generador por defecto: `intervalDays = grado`, `due = now + grado días`, `lastReview = now`; `setPreview` sustituye el generador; `calls` registra `{ scheduling, now }`) y verificar que falla; implementar `FakeSchedulingPort` y verificar que pasa.

## 2. Formato de intervalos (puro)

- [x] 2.1 Escribir en rojo `src/app/services/scheduling/format-interval.spec.ts` (`+1 min` → "1 min"; `+5,5 min` → "6 min"; `+10 min` → "10 min"; `+90 min` → "2 h"; `+5 h` → "5 h"; `0` y `−1 min` → "ahora"; `+1 d` → "1 día"; `+1 d 23 h` → "1 día"; `+6 d` → "6 días"; `+30 d` → "1 mes"; `+45 d` → "2 meses"; `+365 d` → "1 año") y verificar que falla; implementar `formatInterval(due, now)` con los textos en `format-interval.copy.ts` y verificar que pasa.

## 3. Adaptador de ts-fsrs (puro, sin Angular)

- [x] 3.1 Escribir en rojo `tests/static/ts-fsrs-defaults.spec.ts` (`generatorParameters()` de ts-fsrs: `request_retention 0.9`, `maximum_interval 36500`, `enable_fuzz false`, `enable_short_term true`, `learning_steps ['1m','10m']`, `relearning_steps ['10m']`) y verificar que pasa (vigila la versión instalada; si falla, detenerse y revisar la spec).
- [x] 3.2 Escribir en rojo `src/app/infrastructure/scheduling/ts-fsrs-scheduling.adapter.spec.ts`, bloque "traducción y estado inicial": `toCardScheduling(createEmptyCard(T0))` `toEqual` `initialCardScheduling(T0)`; `toFsrsCard` ↔ `toCardScheduling` son inversas (incluido `lastReview null` ↔ `last_review undefined`); verificar que falla; implementar las dos funciones puras y verificar que pasa.
- [x] 3.3 Añadir en rojo el bloque "tarjeta nueva": claves 1..4 con `scheduling`, `intervalDays`, `due` y `log`; `intervalDays` 0, 0, 0 y `[4] === 8`; `due[1] === T0 + 1 min`, `due[3] === T0 + 10 min`, `due[2]` entre ambos; `state` Learning, Learning, Learning, Review; `reps 1` y `lapses 0` en los cuatro; `lastReview === T0` en los cuatro; dos `preview` idénticos → `toEqual`; verificar que falla; implementar `TsFsrsSchedulingAdapter.preview` con `fsrs().repeat` y verificar que pasa.
- [x] 3.4 Añadir en rojo el bloque "transiciones": aprendiendo (`learningSteps 1`) con 3 → Review e `intervalDays ≥ 1`, con 1 → Learning, `learningSteps 0`, `due = T0 + 1 min`; repaso (estabilidad 10, dificultad 5, 3 reps, `lastReview = T0 − 2 d`) con 1 → Relearning, `due = T0 + 10 min`, `lapses + 1`, y monotonía `intervalDays[1] ≤ [2] ≤ [3] ≤ [4]` con `[1] === 0` y `due[2] < due[3] < due[4]`, `lapses` intactos en 2, 3, 4; reaprendiendo con 3 → Review e `intervalDays ≥ 1`, con 1 → Relearning, `due` en minutos, `lapses` igual; 2 reps → 3 en todos; verificar que falla; ajustar la traducción si hace falta y verificar que pasa.
- [x] 3.5 Añadir en rojo el bloque "historial e instantes": repaso programado a 2 días con `lastReview = T0 − 7 d` → `log.state Review`, `log.scheduledDays 2`, `log.elapsedDays 7`; `preview(s, T0)[3].intervalDays === preview(s, T0 + 40 s)[3].intervalDays` y `lastReview` de cada uno igual a su propio `now`; el mismo instante construido como `2026-10-23T10:00:00Z` y como `2026-10-23T05:00:00-05:00` da `due` idénticos; verificar que falla o pasa (documentar) y dejar en verde.
- [x] 3.6 Escribir en rojo `src/app/infrastructure/scheduling/scheduling-roundtrip.spec.ts` (resultado del grado 3 → documento vía `cardDocumentSchema` con `Timestamp.fromDate` → `preview` sobre lo recuperado `toEqual` al calculado sobre el original) y verificar que pasa; si los milisegundos se pierden, corregir la traducción.
- [x] 3.7 Ampliar en rojo `src/app/core/provide-core.spec.ts` (`inject(SchedulingPort)` es un `TsFsrsSchedulingAdapter`) y verificar que falla; registrar el puerto con `useFactory` en `provide-core.ts` y verificar que pasa.

## 4. Documentación

- [x] 4.1 Actualizar `README.md` (frontera de programación: puerto de una operación, previsualizar al mostrar y calcular al calificar, formato de intervalos, prueba estática de defaults) y anotar en `MEMORY.md` el cierre del change con el tamaño del bundle.

## 5. Cierre

- [x] 5.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build`, y verificar que todos terminan en verde. Luego `/opsx:archive programacion-espaciada` y un único commit de cierre `feat(programacion-espaciada): …` con el código, las pruebas y el archive; push de respaldo de la rama sin abrir PR.
