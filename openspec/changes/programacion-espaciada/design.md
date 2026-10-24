# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/programacion-espaciada/spec.md`. Estado esperado de `dev` cuando este change se ejecute (tras `tarjetas`):

- De `tarjetas`: `CardScheduling`, `CardState` (0..3), `initialCardScheduling(now)` en `domain/models/card-scheduling.ts`; el esquema de tarjeta con `learningSteps` por defecto 0.
- `core/provide-core.ts` registra `Logger` y `ErrorHandler`; aquí se añade el puerto de programación.
- `ts-fsrs@5.4.1` instalada (ADR 0002: no reimplementar algoritmos). Verificado en `dist/index.d.ts`: `fsrs()`, `createEmptyCard(now)`, `FSRS.repeat(card, now)` devuelve un registro por grado con `{ card, log }`; defaults `request_retention 0.9`, `maximum_interval 36500`, `enable_fuzz false`, `enable_short_term true`, `learning_steps ['1m','10m']`, `relearning_steps ['10m']`. `ReviewLog.elapsed_days` y `last_elapsed_days` están marcados `@deprecated` para la 6.0.0.
- Código viejo de referencia en `backup/old-version` (`domain/ports/scheduling.port.ts`, `infrastructure/scheduling/ts-fsrs-scheduling.adapter.ts`, `services/review/format-interval.ts`): el adaptador era un `@Injectable` de Angular y el puerto traía `createInitialScheduling`; el formateador solo recibía días. Se reescribe con TDD.

## Goals / Non-Goals

**Goals:**
- Una frontera única y pura con el algoritmo, probada con fechas fijas y sin Angular.
- Que `sesion-de-repaso` pueda probar su flujo con un fake programable y aplicar la doble llamada (mostrar / calificar) sin tocar este código.
- Que un cambio de versión de ts-fsrs se detecte por una prueba, no en producción.

**Non-Goals:**
- Persistir resultados, armar la cola, pintar cerebros.
- Parámetros configurables.

## Decisions

### 1. Puerto de una operación (`domain/ports/scheduling.port.ts`, `domain/models/rating.ts`; capa dominio)

```
Rating = 1 | 2 | 3 | 4
SchedulingPreview = { scheduling: CardScheduling; intervalDays: number; due: Date; log: SchedulingLogValues }
SchedulingLogValues = { state: CardState; due: Date; stability; difficulty; elapsedDays; lastElapsedDays; scheduledDays }
abstract class SchedulingPort { abstract preview(scheduling: CardScheduling, now: Date): Record<Rating, SchedulingPreview> }
```

`now` es obligatorio, no opcional: obliga a quien llama a decidir el instante (mostrar o calificar) y hace las pruebas deterministas. `due` se expone aparte de `scheduling.due` por claridad del contrato de formato: es el dato que consume `formatInterval`. No hay `createInitialScheduling`: el estado inicial vive en el dominio y este change solo demuestra la equivalencia. *Alternativa descartada:* `schedule(scheduling, now, grade)` que devuelve un solo resultado: la sesión necesita los cuatro para pintar y, con `repeat`, calcularlos juntos cuesta lo mismo.

### 2. Adaptador sin Angular (`infrastructure/scheduling/ts-fsrs-scheduling.adapter.ts`; capa infraestructura)

Clase `TsFsrsSchedulingAdapter extends SchedulingPort` sin decoradores: construye `fsrs()` una vez y en `preview` llama a `repeat(toFsrsCard(scheduling), now)` y traduce cada entrada. Traducciones: `camelCase ↔ snake_case`; `lastReview: null ↔ last_review: undefined`; `state` comparte valores numéricos con `State` de ts-fsrs. `intervalDays = card.scheduled_days`; `due = card.due`. `log` toma `state`, `due`, `stability`, `difficulty`, `elapsed_days`, `last_elapsed_days`, `scheduled_days` del `ReviewLog` de ts-fsrs.

Registro en `provideCore`: `{ provide: SchedulingPort, useFactory: () => new TsFsrsSchedulingAdapter() }`. *Por qué sin `@Injectable`:* el adaptador no inyecta nada y así sus pruebas corren como funciones puras, sin TestBed (ADR 0002: pruebas densas en el cerebro).

### 3. Vigilancia de los parámetros (`tests/static/ts-fsrs-defaults.spec.ts`)

Prueba estática que importa `generatorParameters()` de ts-fsrs y afirma los seis valores que la spec exige. Si una actualización de la librería los cambia, falla aquí y no en los intervalos del usuario. *Por qué no pasar los parámetros explícitos a `fsrs()`:* la spec dice "parámetros por defecto"; fijarlos a mano los convertiría en configuración nuestra que habría que mantener.

### 4. Formato de intervalos (`services/scheduling/format-interval.ts`; capa servicios, puro)

`formatInterval(due: Date, now: Date): string`. Calcula `ms = due − now`; `≤ 0` → "ahora"; `< 60 min` → `max(1, round(min))` + " min"; `< 24 h` → `round(h)` + " h"; `días = floor(ms / 86 400 000)`; `< 2` → "1 día"; `< 30` → "N días"; `< 365` → meses; resto años, con los redondeos de la 0.1.1. Textos en `services/scheduling/format-interval.copy.ts` (sin literales sueltos). *Alternativa descartada:* un formateador por días y otro por minutos: dos fuentes para un mismo dato.

### 5. Fake (`testing/fake-scheduling-port.ts`)

`FakeSchedulingPort extends SchedulingPort` con `setPreview(scheduling => Record<Rating, SchedulingPreview>)` y un generador por defecto que devuelve, para cada grado, `scheduling` con `due = now + grado días`, `intervalDays = grado`, `lastReview = now`; registra las llamadas (`calls: { scheduling; now }[]`) para que `sesion-de-repaso` afirme la doble llamada.

### 6. Pruebas de equivalencia y de ida y vuelta

- `initialCardScheduling(now)` se compara campo a campo con `toScheduling(createEmptyCard(now))` del adaptador (la traducción se expone como función pura `toCardScheduling` para esta prueba).
- Ida y vuelta: un resultado de `preview` pasa por `cardDocumentSchema` (Zod de `tarjetas`, con `Timestamp` de Firestore en memoria, sin emulador) y vuelve; `preview` sobre lo recuperado da los mismos cuatro resultados.

## Superficies con acrílico (ADR 0003)

Este change no pinta ninguna superficie.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `SchedulingPort.preview(scheduling, now)` → `Record<Rating, SchedulingPreview>`; `Rating`; `SchedulingLogValues` | `sesion-de-repaso` (pintar cuatro intervalos con `t0`, guardar el grado elegido con `t1`, historial), `cola-diaria` (vencimientos), `progreso` |
| `formatInterval(due, now)` | `sesion-de-repaso` (texto de cada cerebro y etiqueta accesible "Bien, vuelve en 10 min") |
| `FakeSchedulingPort` con `setPreview` y `calls` | `sesion-de-repaso`, `cola-diaria`, `practica-con-ia` |
| `toCardScheduling` / `toFsrsCard` puros | Pruebas de equivalencia; `progreso` si algún día calcula retención |
| `tests/static/ts-fsrs-defaults.spec.ts` | CI: vigila actualizaciones de ts-fsrs |

## Plan de pruebas

Todas con fechas fijas (`T0 = new Date('2026-10-23T10:00:00Z')`). Valores exactos solo donde la spec los fija; cotas en el resto.

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Mismo resultado para la misma entrada | `ts-fsrs-scheduling.adapter.spec`: dos `preview` idénticos → resultados `toEqual`; `tests/static/ts-fsrs-defaults.spec`: `enable_fuzz === false` y los otros cinco defaults | unitaria pura + estática |
| Estado inicial; Equivalencia con el algoritmo | `ts-fsrs-scheduling.adapter.spec`: `initialCardScheduling(T0)` `toEqual` `toCardScheduling(createEmptyCard(T0))` | unitaria pura |
| Ida y vuelta | `scheduling-roundtrip.spec`: resultado del grado 3 → `cardDocumentSchema` (con `Timestamp.fromDate`) → `preview` igual al calculado sobre el original | unitaria pura |
| Cuatro resultados; Se guarda lo previsualizado; El último repaso es el instante recibido | `ts-fsrs-scheduling.adapter.spec`: claves 1..4 con `scheduling`, `intervalDays`, `due`, `log`; `preview(s, T0)[3].intervalDays === preview(s, T0 + 40 s)[3].intervalDays`; `lastReview` de cada grado `=== now` para `T0` y para `T0 + 40 s` | unitaria pura |
| Tarjeta en repaso (monotonía) | tarjeta en repaso con estabilidad 10, dificultad 5, 3 reps → `intervalDays[1] ≤ [2] ≤ [3] ≤ [4]` y `[1] === 0` | unitaria pura |
| Pasos de minutos se informan como cero días | nueva: `intervalDays` 0, 0, 0 y `[4] > 0`; `due[1] === T0 + 1 min`, `due[3] === T0 + 10 min`, `due[2]` entre ambos | unitaria pura |
| Nueva con Bien; Nueva con Fácil; Nueva con Otra vez | nueva con 3 → `state Learning`, `due = T0 + 10 min`, `reps 1`, `lapses 0`; con 4 → `Review`, `intervalDays === 8`; con 1 → `Learning`, `due = T0 + 1 min`, `lapses 0` | unitaria pura |
| Graduación; Reinicio de pasos | aprendiendo en `learningSteps 1` con 3 → `Review`, `intervalDays ≥ 1`; con 1 → `Learning`, `learningSteps 0`, `due = T0 + 1 min` | unitaria pura |
| Otra vez en repaso; Bien en repaso | repaso con 1 → `Relearning`, `due = T0 + 10 min`, `lapses + 1`, nunca `Review`; con 2 < 3 < 4 en `due` y `lapses` intactos | unitaria pura |
| Recuperación; Sigue fallando | reaprendiendo con 3 → `Review`, `intervalDays ≥ 1`; con 1 → `Relearning`, `due` en minutos, `lapses` igual | unitaria pura |
| Conteo de repeticiones | 2 reps → 3 y `lastReview === now` en los cuatro grados | unitaria pura |
| Dos zonas, mismo instante | el mismo `T0` construido desde dos cadenas con zonas distintas (`…T10:00:00Z` y `…T05:00:00-05:00`) da `due` idénticos | unitaria pura |
| Historial de una tarjeta en repaso | repaso programado a 2 días, `lastReview = T0 − 7 d`, calificada en `T0` → `log.state Review`, `log.scheduledDays 2`, `log.elapsedDays 7` | unitaria pura |
| Minutos; Horas; Menos de un día; Días; Meses; Años | `format-interval.spec`: `+1 min` → "1 min"; `+5,5 min` → "6 min"; `+10 min` → "10 min"; `+90 min` → "2 h"; `+5 h` → "5 h"; `0` y `−1 min` → "ahora"; `+1 d` y `+6 d`; `+30 d` → "1 mes"; `+45 d` → "2 meses"; `+365 d` → "1 año"; `+1 d 23 h` → "1 día" | unitaria pura |
| (Registro en el inyector) | `provide-core.spec` ampliado: `inject(SchedulingPort)` devuelve un `TsFsrsSchedulingAdapter` | unitaria (TestBed) |
| (Fake) | `fake-scheduling-port.spec`: generador por defecto, `setPreview` y `calls` | unitaria pura |

## Risks / Trade-offs

- [ts-fsrs 6.0 retira `elapsed_days`/`last_elapsed_days` del log] → el adaptador los calcula él mismo desde `lastReview` y `now` si la librería deja de darlos; los campos del dominio no cambian. Se anota en el adaptador.
- [Los redondeos de minutos ("6 min" para 5,5) dependen de los pasos por defecto] → la prueba estática de defaults avisa si cambian; el formateador no asume valores.
- [Doble cálculo mostrar/calificar] → coste despreciable (aritmética en memoria); lo aplica `sesion-de-repaso`, aquí solo se garantiza determinismo.
- [Ida y vuelta por Zod con `Timestamp` pierde submilisegundos] → `Timestamp.fromDate` conserva milisegundos; la prueba lo confirma.

## Migration Plan

Octavo commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos, reglas ni UI. Rollback: revertir el commit.
