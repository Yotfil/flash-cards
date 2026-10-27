# Spec Delta

## MODIFIED Requirements

### Requirement: Un guardado rechazado devuelve la tarjeta a la sesión con aviso
El sistema SHALL seguir el resultado de cada guardado en segundo plano. Si el almacén rechaza un guardado por un fallo pasajero (cualquiera salvo los dos permanentes: tarjeta borrada y acceso retirado, que describe el requisito siguiente), el sistema SHALL devolver esa tarjeta al final de la sesión como una aparición nueva, descontarla del progreso, no contarla entre las difíciles por esa calificación, y mostrar como alerta accesible "No se guardó tu calificación de «{anverso}». Vuelve a calificarla.". Si la sesión ya terminó cuando llega el rechazo, la pantalla de cierre SHALL mostrar "N calificaciones no se guardaron. Esas tarjetas siguen pendientes." con plural real. El rechazo NO SHALL dejar nada a medias en el almacén: la tarjeta conserva su programación anterior, no hay registro nuevo y los indicadores no cambian.

#### Scenario: Rechazo durante la sesión
- **WHEN** el usuario califica "Bien" la tarjeta «to give up», la sesión avanza y segundos después el almacén rechaza el guardado
- **THEN** aparece la alerta con «to give up», la barra retrocede y la tarjeta vuelve a mostrarse al final de la sesión sin revelar

#### Scenario: Rechazo tras el cierre
- **WHEN** la sesión terminó y el almacén rechaza una calificación pendiente
- **THEN** el cierre muestra "1 calificación no se guardó. Esa tarjeta sigue pendiente." y el resumen sigue visible

#### Scenario: Nada queda a medias
- **WHEN** el almacén rechaza el guardado de una calificación
- **THEN** la tarjeta conserva su programación anterior, no existe un registro nuevo en el historial y los indicadores del día no cambian

#### Scenario: Reintento tras el rechazo
- **WHEN** la tarjeta devuelta vuelve a mostrarse y el usuario la califica de nuevo con éxito
- **THEN** la alerta desaparece, el guardado se acepta y la tarjeta sigue la regla de reencolado normal

## ADDED Requirements

### Requirement: Un rechazo permanente no devuelve la tarjeta: tarjeta borrada o acceso retirado
Reencolar solo sirve si el servidor puede aceptar el reintento. Si el almacén rechaza un guardado porque la tarjeta ya no existe (se borró en otro dispositivo), el sistema SHALL sacarla de la sesión sin devolverla a la cola (con todas sus apariciones pendientes), contarla como salida en la barra, descontar esa calificación del desglose y de las difíciles, y mostrar como alerta accesible "La tarjeta «{anverso}» se borró en otro dispositivo; su calificación no se guardó.". Si era la que se mostraba, SHALL pasar a la siguiente; si no queda ninguna, SHALL mostrarse el cierre. Con el cierre ya visible, ese rechazo NO SHALL contarse entre las calificaciones que "siguen pendientes". Si el almacén rechaza un guardado porque el usuario ya no tiene permiso (le retiraron el acceso), el sistema SHALL cerrar la sesión en ese momento, también con el cierre ya visible, y mostrar a pantalla completa, como alerta accesible, "Ya no tienes acceso" y "Lo que calificaste antes quedó guardado." con el botón "Continuar", que SHALL dejar la sesión de la app en "sin acceso" y llevar a `/sin-acceso` sin dejar el repaso en el historial. Ninguno de los dos rechazos deja nada a medias en el almacén.

#### Scenario: La tarjeta se borró en otro dispositivo
- **WHEN** el usuario califica «to give up», la sesión avanza y el almacén rechaza el guardado porque la tarjeta ya no existe
- **THEN** aparece "La tarjeta «to give up» se borró en otro dispositivo; su calificación no se guardó.", la tarjeta no vuelve a mostrarse y la barra la cuenta como salida

#### Scenario: Se borra la que se estaba mostrando
- **WHEN** la tarjeta calificada volvió al final y ya es la que se muestra cuando llega el rechazo por tarjeta borrada
- **THEN** se muestra la siguiente sin revelar; si no queda ninguna, el cierre

#### Scenario: Tarjeta borrada con el cierre visible
- **WHEN** la sesión terminó y llega el rechazo por tarjeta borrada
- **THEN** el cierre no dice que esa tarjeta siga pendiente

#### Scenario: Acceso retirado a mitad de la sesión
- **WHEN** al usuario le retiran el acceso y el almacén rechaza el guardado de su siguiente calificación por permisos
- **THEN** la sesión se cierra y muestra "Ya no tienes acceso", "Lo que calificaste antes quedó guardado." y "Continuar", sin la tarjeta ni los cerebros

#### Scenario: Continuar tras perder el acceso
- **WHEN** el usuario toca "Continuar"
- **THEN** la sesión de la app queda en "sin acceso" con su correo y la app muestra `/sin-acceso`; "atrás" no vuelve al repaso

#### Scenario: Acceso retirado con el cierre visible
- **WHEN** la sesión terminó y llega un rechazo por permisos
- **THEN** el cierre se sustituye por "Ya no tienes acceso" y "Continuar"
