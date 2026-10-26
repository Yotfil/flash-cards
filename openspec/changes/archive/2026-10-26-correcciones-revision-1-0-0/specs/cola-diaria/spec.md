# Spec Delta

## MODIFIED Requirements

### Requirement: Las vencidas se topan por libro al máximo de repasos diarios del libro
El sistema SHALL limitar las vencidas de cada libro a `maxReviewsPerDay` del libro menos los repasos ya completados hoy en ese libro, conservando las más atrasadas. Un valor `0` significa sin tope. Las tarjetas de un libro que no está en la biblioteca del usuario (las de un libro borrado que quedaron sin borrar) NO SHALL entrar en la cola, ni vencidas ni nuevas, y el sistema SHALL dejar constancia en el registro de errores de la app de cuántas quedaron fuera.

#### Scenario: Tope por libro conserva las más atrasadas
- **WHEN** un libro tiene `maxReviewsPerDay = 2` y cinco tarjetas vencidas
- **THEN** la cola incluye solo las dos con vencimiento más antiguo de ese libro

#### Scenario: Descuenta los repasos ya hechos hoy
- **WHEN** un libro tiene `maxReviewsPerDay = 10` y el usuario ya completó 8 repasos de ese libro hoy
- **THEN** la cola incluye como máximo 2 vencidas de ese libro

#### Scenario: Cero significa sin tope
- **WHEN** un libro tiene `maxReviewsPerDay = 0` y 300 tarjetas vencidas
- **THEN** la cola incluye las 300

#### Scenario: Tarjetas de un libro que ya no existe
- **WHEN** quedan en la cuenta dos tarjetas vencidas y una nueva de un libro que ya no está en la biblioteca
- **THEN** ninguna de las tres entra en la cola ni en el desglose, y el registro de errores de la app dice que tres tarjetas quedaron fuera

### Requirement: Las tarjetas nuevas entran por libro hasta la tanda diaria, descontando las ya introducidas hoy
El sistema SHALL incluir, por cada libro, hasta `newCardsPerDay` tarjetas nuevas (estado "nueva") menos las que ya se introdujeron hoy en ese libro, eligiendo las más antiguas por fecha de creación. Las tarjetas creadas juntas (al importar un libro, al importar tarjetas en un capítulo o al crear varias a la vez) SHALL quedar con fechas de creación en el orden en que llegaron, de modo que entren en el orden del archivo. Entre nuevas con la misma fecha de creación (las que versiones anteriores crearon juntas), el orden SHALL ser el mismo cada vez que se arma la cola y SHALL presentar juntas las de un mismo capítulo, ordenadas dentro de él por anverso normalizado y luego por reverso. Las nuevas se presentan después de las vencidas.

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

#### Scenario: Las nuevas de un libro importado salen en el orden del archivo
- **WHEN** el usuario importa un libro cuyo archivo trae 30 tarjetas y su tanda es 20
- **THEN** la cola de hoy incluye las 20 primeras del archivo, en ese orden

#### Scenario: Nuevas creadas en el mismo instante por una versión anterior
- **WHEN** un libro tiene nuevas que comparten la misma fecha de creación, repartidas en dos capítulos
- **THEN** la cola presenta juntas las de cada capítulo, cada grupo ordenado por anverso, y en el mismo orden cada vez que se arma
