# Spec Delta

## ADDED Requirements

### Requirement: El cierre recibe el foco
Al mostrarse la pantalla de cierre de la sesión, el sistema SHALL mover el foco a su título, para que un lector de pantalla anuncie el cierre y Tab siga por sus controles en orden, en lugar de quedar perdido en el documento.

#### Scenario: Cierre con teclado
- **WHEN** el usuario califica con el teclado la última tarjeta y aparece el cierre
- **THEN** el foco está en el título "Sesión terminada" y Tab lleva a los controles del cierre hasta "Volver a Hoy"
