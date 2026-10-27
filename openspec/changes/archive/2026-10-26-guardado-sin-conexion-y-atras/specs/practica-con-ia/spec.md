# Spec Delta

## ADDED Requirements

### Requirement: Salir y volver al paquete no dejan la práctica en el historial
"Salir" y "Volver al paquete" SHALL llevar al detalle del paquete sin dejar la práctica detrás en el historial: si la práctica se abrió desde ese detalle, regresan a él como la entrada anterior del historial; si se abrió desde otra pantalla (por ejemplo, "Practicar hoy" en Hoy), la práctica SHALL reemplazarse por el detalle del paquete, de modo que el siguiente "atrás" lleve a la pantalla desde la que se abrió.

#### Scenario: Desde el detalle del paquete
- **WHEN** el usuario abre "Película del viernes", toca "Practicar hoy", toca "Salir" y pulsa "atrás"
- **THEN** llega a la pantalla anterior al detalle del paquete, no otra vez al paquete

#### Scenario: Desde Hoy
- **WHEN** el usuario toca "Practicar hoy" en Hoy, termina, toca "Volver al paquete" y pulsa "atrás"
- **THEN** vuelve a Hoy, sin pasar por la práctica
