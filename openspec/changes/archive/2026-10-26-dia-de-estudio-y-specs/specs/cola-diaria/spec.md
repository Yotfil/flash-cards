# Spec Delta

## MODIFIED Requirements

### Requirement: El día de estudio empieza a la hora configurada por el usuario, no a medianoche
El sistema SHALL identificar el "día de estudio" con una fecha `YYYY-MM-DD` calculada en la zona horaria del usuario (`timezone`) y desplazada por su hora de inicio (`dayStartHour`, por defecto 4). Todo lo que ocurra antes de esa hora pertenece al día anterior. El cálculo SHALL hacerse con el reloj local: si la hora local es anterior a `dayStartHour`, el día de estudio es la fecha local anterior; si no, la fecha local. Así, la noche del cambio de hora (que dura 23 o 25 horas) no desplaza el día.

#### Scenario: Repaso de madrugada cuenta como el día anterior
- **WHEN** el usuario tiene `dayStartHour = 4` y califica una tarjeta a la 01:30 local del 15 de junio
- **THEN** el día de estudio es `2026-06-14`

#### Scenario: Después de la hora de inicio es el mismo día
- **WHEN** el usuario tiene `dayStartHour = 4` y califica a las 09:00 local del 15 de junio
- **THEN** el día de estudio es `2026-06-15`

#### Scenario: Respeta la zona horaria del usuario
- **WHEN** dos usuarios califican en el mismo instante UTC pero con `timezone` distintas que caen en fechas locales distintas
- **THEN** cada uno obtiene el día de estudio de su propia zona

#### Scenario: La noche en que se adelanta la hora
- **WHEN** el usuario de Madrid tiene `dayStartHour = 4` y califica a las 04:30 local del 29 de marzo de 2026 (esa noche las 02:00 pasan a ser las 03:00)
- **THEN** el día de estudio es `2026-03-29`

#### Scenario: La noche en que se atrasa la hora
- **WHEN** el usuario de Madrid tiene `dayStartHour = 4` y califica a las 03:30 local del 25 de octubre de 2026 (esa noche las 03:00 vuelven a ser las 02:00)
- **THEN** el día de estudio es `2026-10-24`

### Requirement: El fin del día de estudio es el próximo instante en que el reloj local alcanza la hora de inicio
El sistema SHALL calcular el fin del día de estudio como el próximo momento en que la hora local del usuario llega a `dayStartHour`, y SHALL usarlo como tope para no adelantar tarjetas que vencen mañana. El cálculo SHALL tener en cuenta el cambio de hora de esa noche: si la hora de inicio no existe (el reloj salta por encima de ella), el fin es el instante del salto; si se repite (el reloj vuelve atrás), el fin es la primera vez que el reloj la marca.

#### Scenario: Ya pasó la hora de inicio
- **WHEN** son las 10:00 local y `dayStartHour = 4`
- **THEN** el fin del día es mañana a las 04:00 local

#### Scenario: Aún no llegó la hora de inicio
- **WHEN** son las 02:00 local y `dayStartHour = 4`
- **THEN** el fin del día es hoy a las 04:00 local

#### Scenario: Noche de 23 horas
- **WHEN** el usuario de Madrid tiene `dayStartHour = 4` y son las 22:00 local del 28 de marzo de 2026
- **THEN** el fin del día es el 29 de marzo a las 04:00 local (02:00 UTC), 5 horas después y no 6

#### Scenario: Noche de 25 horas
- **WHEN** el usuario de Madrid tiene `dayStartHour = 4` y son las 22:00 local del 24 de octubre de 2026
- **THEN** el fin del día es el 25 de octubre a las 04:00 local (03:00 UTC), 7 horas después y no 6

#### Scenario: La hora de inicio cae en el salto
- **WHEN** el usuario de Madrid tiene `dayStartHour = 2` y es la 01:30 local del 29 de marzo de 2026
- **THEN** el fin del día es el instante en que el reloj salta de las 02:00 a las 03:00 (01:00 UTC)

#### Scenario: La hora de inicio se repite
- **WHEN** el usuario de Madrid tiene `dayStartHour = 2` y es la 01:30 local del 25 de octubre de 2026
- **THEN** el fin del día es la primera vez que el reloj marca las 02:00 (00:00 UTC)
