# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado en la rama única (`3c05f0a`), verificado el 2026-10-26:

- **CD-03 abierto.** `services/study-day/study-day.ts`: `studyDayId` resta `dayStartHour` horas *reales* al instante y formatea la fecha local; `endOfStudyDay` suma al instante los segundos que faltan en el reloj local hasta `dayStartHour`. Las noches de 23 o 25 horas, los dos se desfasan una hora. `dayStartHour` va de 0 a 23 (spec de ajustes), así que la hora de inicio puede caer dentro del salto o de la hora repetida (Madrid, 02:00).
- **PE-02 abierto.** `services/scheduling/format-interval.ts` redondea por tramo con `Math.round` sin mirar si el resultado llega al siguiente: "60 min", "24 h", "12 meses".
- **SR-02 abierto (spec).** `review-session-state.ts` fija `day` en el arranque y cada registro lleva `dayId: state.day.id`; la spec dice "al día de estudio del usuario".
- **SR-01 abierto (spec).** `ReviewSessionService` guarda `difficult` y lo entrega en `ended()`, pero nadie lo lee; `repaso-page` no llena el hueco `[practice]` del cierre (solo lo llena `practice-ai-page`). La spec pide entregar la lista "a la práctica con IA" y un bloque o espacio reservado en el cierre.
- **AJ-02 abierto (spec).** La spec de ajustes dice que el formulario de crear libro "arranca en 10"; el diálogo (spec de libros) solo pide nombre y materia y `BooksService.create` siembra `defaultNewCardsPerDay` (exige sesión: el "20 sin sesión" de la spec no puede darse).

## Goals / Non-Goals

**Goals:**
- Un día de estudio que dependa solo del reloj local, también las noches de cambio de hora, en funciones puras con pruebas sobre zonas reales (Madrid).
- Que las specs de repaso y ajustes describan lo que hace la app, con una prueba que fije cada frase nueva.

**Non-Goals:**
- Cambiar cuándo se acredita una calificación (dec. 18: al día de la sesión).
- Un bloque de IA tras el repaso, o retirar la lista de difíciles (la spec la conserva; dec. 20).
- Zonas con cambios de media hora sobre la hora de inicio.

## Decisions

### D1. El día de estudio por la fecha y la hora locales (servicio puro, `study-day.ts`)
Una sola lectura del reloj local con `Intl.DateTimeFormat` (`localDateTime(now, timezone)` → fecha `YYYY-MM-DD` y segundos del día). `studyDayId`: si los segundos locales son menores que `dayStartHour × 3600`, la fecha local anterior; si no, la fecha local. `previousStudyDayId` ya resta un día a una fecha: se generaliza en un `shiftDate(fecha, días)` privado que usan las dos.

### D2. El fin del día: la hora de inicio de una fecha local, convertida a instante (servicio puro)
`endOfStudyDay`: la fecha objetivo es la local si aún no se llegó a la hora de inicio, si no la siguiente; el fin es `instantOfLocalTime(fecha, dayStartHour, timezone)`.

`instantOfLocalTime` toma la hora local "leída como si fuera UTC" (`wall`) y prueba los dos desfases de la zona alrededor de esa noche: el de un día antes y el de un día después (ninguna zona cambia dos veces en 48 horas). De los candidatos `wall − desfase`, devuelve el más temprano cuyo reloj local ya marca esa hora o más. Así:
- noche normal: los dos desfases coinciden y el candidato marca justo la hora;
- la hora no existe (salto hacia adelante): solo el candidato con el desfase de antes la supera, y es el instante del salto;
- la hora se repite (salto hacia atrás): los dos la marcan y gana el más temprano, la primera vez.

Alternativa descartada: una librería de zonas horarias (dependencia nueva para dos funciones; `Intl` ya da el desfase).

### D3. PE-02: redondear y, si llega al tope del tramo, pasar al siguiente (servicio puro, `format-interval.ts`)
La cascada se ordena por el valor redondeado, no por el crudo: minutos redondeados < 60 → minutos; si no, horas redondeadas < 24 → horas; si no, días completos (mínimo 1) < 30 → días; si no, meses redondeados < 12 → meses; si no, años redondeados (mínimo 1). 59,6 min → 60 → "1 h"; 23,7 h → 24 → "1 día"; 345 días → 11,5 → 12 → "1 año".

### D4. Specs que dicen lo que hay (SR-01, SR-02, AJ-02), cada una con su prueba
- SR-02: prueba en `review-session-state.spec`: la sesión arranca a las 03:55 de Bogotá y la calificación de las 04:20 lleva el `dayId` del día anterior.
- SR-01: prueba en `repaso-page.component.spec`: al terminar un repaso con un "Otra vez", el cierre no tiene contenido en `[practice]` ni "Copiar prompt". El requisito de los difíciles se renombra a "La sesión recuerda sus tarjetas difíciles" (ya no se entrega a la práctica con IA); sus pruebas existentes siguen valiendo.
- AJ-02: el requisito de ajustes remite a libros; las pruebas existentes de `books.service.spec` (siembra 7) y `book-settings-dialog` (muestra el valor del libro) ya lo cubren; se añade a la tabla.

### Superficies (ADR 0003)
Sin UI nueva.

## Risks / Trade-offs

- [Cambia el día acreditado una hora al año en zonas con horario de verano] → Es la corrección; los datos ya guardados no se tocan.
- [`Intl` con zonas inválidas lanza] → Igual que hoy: la zona viene validada de la lista de zonas de Ajustes.
- [Lord Howe (cambio de 30 minutos) con hora de inicio 2] → El día puede volver atrás media hora; fuera de alcance.

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `cola-diaria`: Madrugada, Después de la hora de inicio, Respeta la zona (ya cubiertos) | `study-day.spec` sigue en verde | unitaria |
| `cola-diaria`: La noche en que se adelanta la hora | `study-day.spec`: Madrid, `2026-03-29T02:30:00Z` (04:30 CEST), inicio 4 → `2026-03-29` | unitaria |
| `cola-diaria`: La noche en que se atrasa la hora | `study-day.spec`: Madrid, `2026-10-25T02:30:00Z` (03:30 CET), inicio 4 → `2026-10-24` | unitaria |
| `cola-diaria`: Ya pasó / Aún no llegó (ya cubiertos) | `study-day.spec` sigue en verde | unitaria |
| `cola-diaria`: Noche de 23 horas | `study-day.spec`: Madrid, `2026-03-28T21:00:00Z`, inicio 4 → `2026-03-29T02:00:00Z` | unitaria |
| `cola-diaria`: Noche de 25 horas | `study-day.spec`: Madrid, `2026-10-24T20:00:00Z`, inicio 4 → `2026-10-25T03:00:00Z` | unitaria |
| `cola-diaria`: La hora de inicio cae en el salto | `study-day.spec`: Madrid, `2026-03-29T00:30:00Z`, inicio 2 → `2026-03-29T01:00:00Z`; y el id cambia justo ahí (00:59:59Z → 28, 01:00Z → 29) | unitaria |
| `cola-diaria`: La hora de inicio se repite | `study-day.spec`: Madrid, `2026-10-24T23:30:00Z`, inicio 2 → `2026-10-25T00:00:00Z`; y el id de las 01:30Z (la segunda 02:30) sigue siendo 25 | unitaria |
| `cola-diaria`: (coherencia) | `study-day.spec`: en Madrid y Bogotá, para cada hora de varias noches (normales y de cambio), `studyDayId(endOfStudyDay(t) − 1 s) === studyDayId(t)` y `studyDayId(endOfStudyDay(t))` es el día siguiente | unitaria |
| `sesion-de-repaso`: Una sesión que cruza la hora de inicio | `review-session-state.spec`: arranque 03:55 Bogotá, calificar a las 04:20 → `dayId` del día anterior | unitaria |
| `sesion-de-repaso`: Madrugada, Primera vista, Repaso de una vencida (ya cubiertos) | `review-session-state.spec`, `grade-persistence` siguen en verde | unitaria + integración |
| `sesion-de-repaso`: El cierre de un repaso no lleva práctica con IA | `repaso-page.component.spec`: al terminar con un "Otra vez", sin `[practice]` ni "Copiar prompt" | componente |
| `sesion-de-repaso`: Fin de sesión, Una sola tarjeta, reducir movimiento (ya cubiertos) | `repaso-page`, `session-summary` siguen en verde | componente |
| `sesion-de-repaso`: Difíciles de la sesión, Calificación fallida, Sesión nueva (ya cubiertos) | `review-session-state.spec`, `review-session.service.spec` siguen en verde | unitaria |
| `ajustes-de-usuario`: Crear libro, Importar un libro | `books.service.spec` (siembra de `defaultNewCardsPerDay`), `book-form-dialog.component.spec` (sin campo de nuevas), `import.service.spec` (7) siguen en verde | unitaria + componente |
| `ajustes-de-usuario`: Editar libro | `book-settings-dialog.component.spec` (muestra el valor del libro) sigue en verde | componente |
| `programacion-espaciada`: Minutos, Horas, Días, Meses, Años, ahora (ya cubiertos) | `format-interval.spec` sigue en verde | unitaria |
| `programacion-espaciada`: El redondeo llega al tramo siguiente | `format-interval.spec`: 59,6 min → "1 h"; 23,7 h → "1 día"; 345 y 364 días → "1 año"; 59,4 min → "59 min" y 23,4 h → "23 h" | unitaria |

## Migration Plan

Sin migración. Los indicadores ya guardados en el día equivocado (una hora al año) se quedan como están.

## Contratos que deja listos

- `instantOfLocalTime` (privada en `study-day.ts`): si otro cálculo necesita "tal hora local de tal fecha" (recordatorios), se exporta entonces.
- La cascada de `formatInterval` por valor redondeado: un tramo nuevo (semanas) se añade sin bordes raros.
