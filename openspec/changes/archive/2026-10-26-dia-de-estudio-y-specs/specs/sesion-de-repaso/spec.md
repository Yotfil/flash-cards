# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: La sesión recuerda sus tarjetas difíciles y las entrega a la práctica con IA`
- TO: `### Requirement: La sesión recuerda sus tarjetas difíciles`

## MODIFIED Requirements

### Requirement: Las estadísticas del día se acreditan al día de estudio del usuario
El sistema SHALL acreditar cada calificación al día de estudio en que empezó la sesión, calculado al arrancarla con la zona horaria y la hora de inicio del día del usuario (ver spec de cola diaria): una sesión no cruza al día siguiente aunque termine pasada la hora de inicio. Con cada calificación SHALL incrementar: repasos completados (+1 siempre), el conteo del grado elegido (+1 en "otra vez", "difícil", "bien" o "fácil") y, según el estado previo de la tarjeta: si era "nueva", las nuevas introducidas de su libro (+1); si no, los repasos completados de su libro (+1). Los contadores no tocados se consideran cero.

#### Scenario: Primera vista de una nueva
- **WHEN** se califica una tarjeta en estado "nueva" del libro L
- **THEN** repasos completados +1, el conteo del grado +1, nuevas introducidas de L +1 y los repasos completados de L sin cambio

#### Scenario: Repaso de una vencida
- **WHEN** se califica una tarjeta en repaso del libro L
- **THEN** repasos completados +1, el conteo del grado +1, repasos completados de L +1 y las nuevas introducidas de L sin cambio

#### Scenario: Madrugada
- **WHEN** el usuario califica a la 01:30 local con hora de inicio del día 4
- **THEN** la estadística se acredita al día anterior

#### Scenario: Una sesión que cruza la hora de inicio
- **WHEN** el usuario, con hora de inicio del día 4, empieza una sesión a las 03:55 local y califica una tarjeta a las 04:20
- **THEN** esa calificación se acredita al día anterior, el mismo de la sesión

### Requirement: La sesión termina con un cierre breve y satisfactorio
Al salir de la sesión la última tarjeta, el sistema SHALL mostrar una pantalla de cierre con un anillo que se completa en el color de acento seguido de una marca de verificación, el título "Sesión terminada", "Repasaste N tarjetas." con plural real y N igual a las tarjetas distintas de la sesión, el conteo por calificación (otra vez, difícil, bien, fácil; cuenta calificaciones, con sus marcas de color y el número visible), la nota "Las que más te costaron volverán antes." y el botón "Volver a Hoy", que lleva a Hoy. El cierre de un repaso NO SHALL mostrar ningún bloque de práctica con IA: esa pantalla la reutiliza la práctica de un paquete con su propio bloque (ver spec de práctica con IA). El número SHALL subir de 0 al total mientras el anillo se completa; con reducir movimiento SHALL mostrarse directo. Al terminar SHALL dejar de mostrar previsualizaciones y sugerencias.

#### Scenario: Fin de sesión
- **WHEN** el usuario califica la última tarjeta, esta sale de la sesión y el guardado se acepta
- **THEN** se ve "Sesión terminada", "Repasaste 20 tarjetas." y el desglose por calificación, y "Volver a Hoy" lleva a Hoy

#### Scenario: Una sola tarjeta
- **WHEN** la sesión tenía una tarjeta distinta, calificada dos veces (Otra vez y Bien)
- **THEN** el cierre dice "Repasaste 1 tarjeta." y el desglose muestra 1 en "Otra vez" y 1 en "Bien"

#### Scenario: Cierre con reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento
- **THEN** el anillo, la marca y el número aparecen completos de inmediato

#### Scenario: El cierre de un repaso no lleva práctica con IA
- **WHEN** termina un repaso con tarjetas calificadas "Otra vez"
- **THEN** el cierre no muestra ningún bloque de práctica con IA ni el botón "Copiar prompt"

### Requirement: La sesión recuerda sus tarjetas difíciles
El sistema SHALL conservar, durante la sesión, la lista de tarjetas cuya calificación guardada con éxito fue "Otra vez" (1) o "Difícil" (2), en orden de calificación y sin repetir una tarjeta, y SHALL entregarla junto con el motivo del final al terminar o al pulsar "Salir". La práctica con IA no la recibe: trabaja con paquetes propios (ver su spec), así que hoy ninguna pantalla la muestra. Al iniciar una sesión nueva la lista SHALL empezar vacía.

#### Scenario: Difíciles de la sesión
- **WHEN** en una sesión se califican con éxito tarjetas con grados 1, 3, 2 y 4
- **THEN** la lista de difíciles contiene la primera y la tercera, en ese orden

#### Scenario: Calificación fallida no entra
- **WHEN** una tarjeta se califica "Otra vez", el guardado falla, y el reintento con "Bien" tiene éxito
- **THEN** la tarjeta no está en la lista de difíciles

#### Scenario: Sesión nueva arranca limpia
- **WHEN** termina una sesión con difíciles y el usuario inicia otra
- **THEN** la lista de difíciles de la nueva sesión está vacía
