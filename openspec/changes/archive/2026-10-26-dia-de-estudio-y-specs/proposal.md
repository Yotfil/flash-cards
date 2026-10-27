# Proposal

## Why

La revisión de la 1.0.0 dejó cinco hallazgos sobre el "día de estudio" y sobre specs que no dicen lo que hace la app. El más serio es de código: la noche del cambio de hora, durante una hora, el día de estudio y su fin se calculan con una hora de desfase en las zonas con horario de verano (CD-03), y lo repasado se acredita al día equivocado. Los demás: el formato de intervalos muestra "60 min" o "12 meses" cuando el redondeo llega al tramo siguiente (PE-02), y tres specs contradicen el código ya decidido: la sesión acredita al día en que empezó (SR-02), el cierre de un repaso no lleva bloque de práctica con IA (SR-01) y crear un libro no pregunta las nuevas por día (AJ-02). El usuario decidió cada punto el 2026-10-26 (decisiones 18 a 21 de la sexta sesión; CD-03 sin decisión).

## What Changes

- **CD-03** El día de estudio se calcula con el reloj local: si la hora local es anterior a la de inicio, es la fecha local anterior. Su fin es la siguiente fecha local a la hora de inicio, convertida a instante teniendo en cuenta el cambio de hora de esa noche (si esa hora no existe, el instante del salto; si se repite, la primera vez).
- **SR-02 (dec. 18)** Solo spec: cada calificación se acredita al día de estudio en que empezó la sesión, aunque termine pasada la hora de inicio.
- **AJ-02 (dec. 19)** Solo spec: la de ajustes dice lo mismo que la de libros (el diálogo "Nuevo libro" pide nombre y materia; las nuevas por día se siembran del ajuste global al guardar; los ajustes de un libro muestran su propio valor).
- **SR-01 (dec. 20)** Solo spec: la sesión conserva sus difíciles y los entrega al terminar o salir, pero el cierre de un repaso no lleva bloque de práctica con IA (la práctica con IA trabaja con paquetes propios).
- **PE-02 (dec. 21)** Si el redondeo llega al tramo siguiente, se muestra ese tramo: 59,6 min → "1 h", 23,7 h → "1 día", de 345 a 364 días → "1 año".

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `cola-diaria`: el día de estudio y su fin con el reloj local, también las noches de cambio de hora.
- `sesion-de-repaso`: acreditar al día en que empezó la sesión; cierre sin bloque de IA; los difíciles no se entregan a la práctica con IA.
- `ajustes-de-usuario`: la siembra de nuevas por día como la describe `libros`.
- `programacion-espaciada`: el redondeo que llega al tramo siguiente.

## Impact

- Servicios puros: `services/study-day/study-day.ts` (`studyDayId`, `endOfStudyDay`) y `services/scheduling/format-interval.ts`.
- Pruebas que fijan lo que las specs pasan a decir (sesión que cruza la hora de inicio, cierre del repaso sin bloque de IA).
- Sin cambios de datos, reglas, índices, lecturas ni UI. El cambio de día solo se nota las noches de cambio de hora.

## Fuera de alcance

- Acreditar cada calificación con su propio instante (descartado en la decisión 18).
- Mostrar un bloque de práctica con IA tras un repaso normal (sería producto nuevo).
- Zonas con cambios de media hora que crucen la hora de inicio (Lord Howe): el día puede volver atrás 30 minutos; no hay usuarios ahí.
