# Spec Delta

## ADDED Requirements

### Requirement: El cierre de la práctica con IA recibe el foco
Al mostrarse el cierre de la práctica de un paquete, el sistema SHALL mover el foco a su título, como en el cierre del repaso, para que un lector de pantalla lo anuncie y Tab siga por "Copiar prompt" y "Volver al paquete".

#### Scenario: Cierre con teclado
- **WHEN** el usuario califica con el teclado el último ítem de la práctica y aparece el cierre
- **THEN** el foco está en el título "Práctica terminada" y Tab lleva a "Copiar prompt" y después a "Volver al paquete"
