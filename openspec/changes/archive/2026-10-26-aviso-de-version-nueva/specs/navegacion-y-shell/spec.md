# Spec Delta

## ADDED Requirements

### Requirement: Aviso de versión nueva
Cuando el trabajador de servicio termina de descargar una versión nueva de la app, el sistema SHALL mostrar en las pantallas con navegación un aviso discreto con el texto "Hay una versión nueva" y un botón "Recargar", anunciado con rol de estado. "Recargar" SHALL recargar la app con la versión nueva. El aviso NO SHALL obligar: la app sigue funcionando igual si se ignora. El aviso NO SHALL mostrarse en las pantallas completas (repaso, práctica, práctica con IA); si la versión llega mientras el usuario está en una, el aviso SHALL aparecer al volver a una pantalla con navegación. El aviso SHALL ser una superficie sólida, para no sumar una capa de vidrio al aviso "sin conexión" y a la navegación.

#### Scenario: Versión nueva en la Biblioteca
- **WHEN** el usuario está en la Biblioteca y se termina de descargar una versión nueva
- **THEN** aparece "Hay una versión nueva" con el botón "Recargar"

#### Scenario: Recargar
- **WHEN** el usuario toca "Recargar"
- **THEN** la app se recarga con la versión nueva

#### Scenario: Durante un repaso
- **WHEN** se termina de descargar una versión nueva mientras el usuario repasa
- **THEN** el repaso no muestra ningún aviso, y al salir a Hoy aparece "Hay una versión nueva"

#### Scenario: Sin versión nueva
- **WHEN** no hay una versión nueva descargada (o el trabajador de servicio no está activo, como en desarrollo)
- **THEN** no se muestra ningún aviso
