# Cola diaria Specification

## Purpose

Decide qué tarjetas estudia el usuario "hoy": todas las vencidas que le tocan más una tanda controlada de tarjetas nuevas, respetando los topes de cada libro y la frontera del día de estudio del usuario. Es el corazón de la pantalla Hoy y el punto de entrada a la sesión de repaso.

## Requirements

### Requirement: El día de estudio empieza a la hora configurada por el usuario, no a medianoche
El sistema SHALL identificar el "día de estudio" con una fecha `YYYY-MM-DD` calculada en la zona horaria del usuario (`timezone`) y desplazada por su hora de inicio (`dayStartHour`, por defecto 4). Todo lo que ocurra antes de esa hora pertenece al día anterior.

#### Scenario: Repaso de madrugada cuenta como el día anterior
- **WHEN** el usuario tiene `dayStartHour = 4` y califica una tarjeta a la 01:30 local del 15 de junio
- **THEN** el día de estudio es `2026-06-14`

#### Scenario: Después de la hora de inicio es el mismo día
- **WHEN** el usuario tiene `dayStartHour = 4` y califica a las 09:00 local del 15 de junio
- **THEN** el día de estudio es `2026-06-15`

#### Scenario: Respeta la zona horaria del usuario
- **WHEN** dos usuarios califican en el mismo instante UTC pero con `timezone` distintas que caen en fechas locales distintas
- **THEN** cada uno obtiene el día de estudio de su propia zona

### Requirement: El fin del día de estudio es el próximo instante en que el reloj local alcanza la hora de inicio
El sistema SHALL calcular el fin del día de estudio como el próximo momento en que la hora local del usuario llega a `dayStartHour`, y SHALL usarlo como tope para no adelantar tarjetas que vencen mañana.

#### Scenario: Ya pasó la hora de inicio
- **WHEN** son las 10:00 local y `dayStartHour = 4`
- **THEN** el fin del día es mañana a las 04:00 local

#### Scenario: Aún no llegó la hora de inicio
- **WHEN** son las 02:00 local y `dayStartHour = 4`
- **THEN** el fin del día es hoy a las 04:00 local

### Requirement: Las tarjetas vencidas entran todas, ordenadas por lo más atrasado
El sistema SHALL incluir en la cola toda tarjeta no suspendida cuyo estado no sea "nueva" y cuya fecha de vencimiento sea menor o igual al fin del día de estudio, ordenadas por fecha de vencimiento ascendente (las más atrasadas primero).

#### Scenario: Vencidas ordenadas por vencimiento
- **WHEN** hay tres tarjetas en repaso con vencimientos ayer, hace tres días y hoy
- **THEN** la cola las presenta en el orden: hace tres días, ayer, hoy

#### Scenario: Una tarjeta que vence mañana no entra
- **WHEN** una tarjeta en repaso vence después del fin del día de estudio
- **THEN** no aparece en la cola de hoy

### Requirement: Las vencidas se topan por libro al máximo de repasos diarios del libro
El sistema SHALL limitar las vencidas de cada libro a `maxReviewsPerDay` del libro menos los repasos ya completados hoy en ese libro, conservando las más atrasadas. Un valor `0` significa sin tope. Las tarjetas de un libro cuyos metadatos no estén disponibles pasan sin tope.

#### Scenario: Tope por libro conserva las más atrasadas
- **WHEN** un libro tiene `maxReviewsPerDay = 2` y cinco tarjetas vencidas
- **THEN** la cola incluye solo las dos con vencimiento más antiguo de ese libro

#### Scenario: Descuenta los repasos ya hechos hoy
- **WHEN** un libro tiene `maxReviewsPerDay = 10` y el usuario ya completó 8 repasos de ese libro hoy
- **THEN** la cola incluye como máximo 2 vencidas de ese libro

#### Scenario: Cero significa sin tope
- **WHEN** un libro tiene `maxReviewsPerDay = 0` y 300 tarjetas vencidas
- **THEN** la cola incluye las 300

### Requirement: Las tarjetas nuevas entran por libro hasta la tanda diaria, descontando las ya introducidas hoy
El sistema SHALL incluir, por cada libro, hasta `newCardsPerDay` tarjetas nuevas (estado "nueva") menos las que ya se introdujeron hoy en ese libro, eligiendo las más antiguas por fecha de creación. Las nuevas se presentan después de las vencidas.

#### Scenario: Respeta la tanda del libro
- **WHEN** un libro tiene `newCardsPerDay = 3` y 10 tarjetas nuevas
- **THEN** la cola incluye exactamente 3 nuevas de ese libro, las creadas primero

#### Scenario: Descuenta las introducidas hoy
- **WHEN** un libro tiene `newCardsPerDay = 5` y hoy ya se introdujeron 4 nuevas de ese libro
- **THEN** la cola incluye como máximo 1 nueva de ese libro

#### Scenario: Tanda agotada
- **WHEN** hoy ya se introdujeron tantas nuevas como `newCardsPerDay`
- **THEN** la cola no incluye nuevas de ese libro

#### Scenario: Vencidas antes que nuevas
- **WHEN** la cola tiene vencidas y nuevas
- **THEN** todas las vencidas se presentan antes que cualquier nueva

### Requirement: El usuario puede ajustar la cantidad de nuevas solo para la sesión de hoy
El sistema SHALL permitir al usuario indicar, desde la pantalla Hoy, un número de nuevas para la sesión actual. Ese número SHALL reemplazar el tope por libro: se toman hasta ese total de nuevas (más antiguas primero) entre todos los libros, sin cambiar la configuración de ningún libro. El sistema SHALL mostrar cuántas nuevas hay disponibles en total como máximo elegible.

#### Scenario: Empujar más nuevas que el tope
- **WHEN** los topes por libro darían 5 nuevas y el usuario elige 12 para esta sesión
- **THEN** la cola incluye 12 nuevas en total, las más antiguas, sin importar el libro

#### Scenario: Cero nuevas para hoy
- **WHEN** el usuario elige 0 nuevas para esta sesión
- **THEN** la cola contiene únicamente vencidas

#### Scenario: El ajuste no toca la configuración
- **WHEN** el usuario cambia el número de nuevas de la sesión
- **THEN** el `newCardsPerDay` de cada libro permanece igual

#### Scenario: Recalcular sin volver a consultar
- **WHEN** el usuario cambia el número de nuevas de la sesión
- **THEN** la cola se recalcula al instante a partir de las tarjetas ya cargadas

### Requirement: La cola muestra un desglose por libro
El sistema SHALL informar, para cada libro con tarjetas en la cola, su nombre, cuántas vencidas y cuántas nuevas aporta, en el orden en que los libros aparecen en la biblioteca. Los libros sin pendientes no aparecen en el desglose.

#### Scenario: Desglose ordenado
- **WHEN** dos libros aportan tarjetas y un tercero no
- **THEN** el desglose lista los dos libros con sus conteos, en el orden de la biblioteca, y omite el tercero

### Requirement: Estudiar un libro o capítulo concreto ignora los topes diarios
El sistema SHALL permitir iniciar una sesión sobre un libro o un capítulo específico que incluya todas sus tarjetas listas (vencidas y nuevas) sin aplicar `newCardsPerDay` ni `maxReviewsPerDay`. Las tarjetas que no están listas (ni vencidas ni nuevas) quedan fuera.

#### Scenario: Estudiar un libro con backlog
- **WHEN** un libro tiene 40 vencidas, 15 nuevas y `maxReviewsPerDay = 10`
- **THEN** la sesión del libro incluye las 55 tarjetas listas

#### Scenario: Nada listo
- **WHEN** un capítulo no tiene tarjetas vencidas ni nuevas
- **THEN** el sistema informa que no hay nada que estudiar y no inicia la sesión

### Requirement: La pantalla Hoy refleja el estado de la cola de forma honesta
El sistema SHALL mostrar en Hoy un estado de carga mientras arma la cola, un estado de error visible si la carga falla, un estado vacío con mensaje sereno si no hay nada pendiente, y el resumen (vencidas, nuevas, desglose) con el botón para empezar cuando hay tarjetas.

#### Scenario: Cola vacía
- **WHEN** no hay vencidas ni nuevas disponibles
- **THEN** Hoy muestra un estado vacío, sin botón de empezar

#### Scenario: Falla la carga
- **WHEN** la lectura de tarjetas o de estadísticas del día falla
- **THEN** Hoy muestra un estado de error con opción de reintentar, en vez de fingir una cola vacía
