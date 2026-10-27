# Spec Delta

## ADDED Requirements

### Requirement: Salir y volver regresan con el historial
"Salir" y el botón del resumen ("Volver al capítulo" o "Volver al libro") SHALL regresar al origen de la práctica como la entrada anterior del historial, igual que el "atrás" del sistema, sin apilar una entrada nueva. Así, el siguiente "atrás" lleva a la pantalla anterior al origen, y la práctica queda como "adelante" (que redirige a la Biblioteca).

#### Scenario: Atrás después de salir
- **WHEN** el usuario entra a "Inglés B2", abre "Unidad 1", practica, toca "Salir" y después pulsa "atrás"
- **THEN** llega al detalle de "Inglés B2", no a la Biblioteca ni otra vez a "Unidad 1"

#### Scenario: Atrás después del resumen
- **WHEN** el usuario termina una práctica iniciada desde un libro, toca "Volver al libro" y después pulsa "atrás"
- **THEN** llega a la pantalla desde la que abrió el libro

## MODIFIED Requirements

### Requirement: La práctica es efímera y nunca se retoma
El sistema SHALL arrancar una práctica nueva en cada entrada desde un botón "Practicar": el quiz preparado se entrega a la pantalla una sola vez y la pantalla empieza en la primera pregunta con el puntaje en cero. Al salir o al terminar, la práctica SHALL vaciarse. Volver a la ruta de práctica sin un quiz recién preparado (recarga, "adelante", dirección escrita a mano) SHALL redirigir a la Biblioteca, nunca mostrar una práctica anterior.

#### Scenario: Volver atrás tras salir
- **WHEN** el usuario sale a mitad de una práctica, pulsa "atrás" y después "adelante" hacia la ruta de práctica
- **THEN** el sistema redirige a la Biblioteca y no muestra la práctica abandonada

#### Scenario: Dos prácticas seguidas
- **WHEN** el usuario termina una práctica, vuelve al capítulo y toca "Practicar" otra vez
- **THEN** la nueva práctica empieza en la pregunta 1 con "Acertaste" en cero y las preguntas barajadas de nuevo
