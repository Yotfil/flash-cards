# Spec Delta

## ADDED Requirements

### Requirement: Salir y volver a Hoy no dejan la sesión en el historial
"Salir" y "Volver a Hoy" SHALL llevar a Hoy sin dejar la sesión detrás en el historial: si la sesión se abrió desde Hoy, regresan a Hoy como la entrada anterior del historial; si se abrió desde un capítulo o un libro, la sesión SHALL reemplazarse por Hoy, de modo que el siguiente "atrás" lleve a ese capítulo o libro.

#### Scenario: Desde un capítulo
- **WHEN** el usuario toca "Estudiar este capítulo" en "Unidad 1", toca "Salir" y pulsa "atrás"
- **THEN** llega a "Unidad 1", no a la sesión ni a otra Hoy

#### Scenario: Desde Hoy
- **WHEN** el usuario empieza en Hoy, termina la sesión, toca "Volver a Hoy" y pulsa "atrás"
- **THEN** llega a la pantalla anterior a Hoy, sin pasar por la sesión

## MODIFIED Requirements

### Requirement: La sesión ocupa toda la pantalla, sin la navegación principal
El sistema SHALL presentar la sesión de repaso en una pantalla propia, sin las pestañas de navegación (Hoy, Biblioteca, Progreso, Ajustes), accesible solo con sesión iniciada. La pantalla SHALL mostrar únicamente una barra superior discreta de acrílico tenue (barra de progreso, contador "Quedan N" y "Salir") y la tarjeta, que SHALL ser una superficie sólida de alto contraste, sin acrílico. Si se llega a la pantalla sin una lista entregada para estudiar (recarga del navegador, URL directa, "atrás" o "adelante"), el sistema SHALL redirigir a Hoy.

#### Scenario: Entrar desde Hoy con tarjetas
- **WHEN** el usuario pulsa empezar en Hoy y la cola tiene al menos una tarjeta
- **THEN** la app abre la pantalla de repaso a pantalla completa, sin navegación, mostrando la primera tarjeta

#### Scenario: Abrir la pantalla sin sesión activa
- **WHEN** el usuario llega a la pantalla de repaso sin una lista entregada (por ejemplo, recargando el navegador en esa ruta)
- **THEN** la app lo redirige a Hoy en vez de mostrar una sesión vacía

#### Scenario: Volver atrás tras terminar
- **WHEN** el usuario terminó una sesión abierta desde un capítulo, está en Hoy y pulsa "atrás" en el navegador
- **THEN** la app lo lleva al capítulo sin mostrar la sesión anterior ni su cierre
