# Progreso Specification

## Purpose

Da al usuario una lectura sobria y honesta de dónde está: cuánto le queda hoy, cuánto repasó hoy y cómo calificó, y cómo se reparte su colección entre tarjetas nuevas, en aprendizaje y dominadas. Es una pantalla de solo lectura que agrega datos ya existentes (la cola del día, el contador del día de estudio y el conteo de tarjetas por estado) sin inventar nada ni repetir lecturas.

## Requirements

### Requirement: Progreso es una pestaña de la navegación principal
El sistema SHALL ofrecer "Progreso" como una de las secciones de la navegación principal, con el título "Progreso", y SHALL cargar sus métricas al entrar a la pantalla en cada visita.

#### Scenario: Entrar a Progreso
- **WHEN** el usuario abre la pestaña Progreso
- **THEN** el sistema inicia la carga de métricas y muestra el estado de carga hasta tenerlas

### Requirement: La ventana temporal de "hoy" es el día de estudio del usuario
El sistema SHALL calcular todas las métricas de "hoy" sobre el día de estudio del usuario (fecha en su zona horaria desplazada por su hora de inicio de día), el mismo que usa la cola diaria. No existen métricas por semana, mes ni racha: la pantalla solo muestra el día en curso y el estado total de la colección.

#### Scenario: Repaso de madrugada
- **WHEN** el usuario tiene hora de inicio 4 y repasa a la 01:30 local
- **THEN** ese repaso cuenta en el "hoy" del día de estudio anterior, igual que en la cola diaria

### Requirement: Muestra los pendientes y las repasadas de hoy
El sistema SHALL mostrar dos tarjetas de resumen: "Pendientes hoy", igual a la suma de vencidas y nuevas que la cola diaria entrega con los topes por libro aplicados (sin el ajuste de nuevas de la sesión), y "Repasadas hoy", igual al total de repasos completados registrados en el contador del día de estudio (incluye la introducción de tarjetas nuevas).

#### Scenario: Con cola y repasos
- **WHEN** la cola diaria tiene 4 vencidas y 2 nuevas y el contador del día registra 7 repasos
- **THEN** Progreso muestra "6" en Pendientes hoy y "7" en Repasadas hoy

#### Scenario: Sin contador del día
- **WHEN** todavía no existe contador para el día de estudio
- **THEN** Repasadas hoy muestra 0

### Requirement: Muestra la distribución de calificaciones de hoy
El sistema SHALL mostrar la sección "Calificaciones de hoy" con cuatro filas fijas en este orden: "Otra vez", "Difícil", "Bien", "Fácil", cada una con su conteo numérico y una barra cuyo ancho es la proporción del conteo sobre el total de repasadas hoy. Las barras SHALL usar los colores reservados de la escala de calificación (rojo, naranja, amarillo, verde respectivamente), con el número visible como diferenciador redundante al color. Los conteos ausentes en el contador del día SHALL tratarse como 0. Cuando no hay repasos hoy, en lugar de las barras SHALL mostrarse "Aún no has calificado tarjetas hoy.".

#### Scenario: Distribución del día
- **WHEN** el contador del día registra 1 Otra vez, 1 Difícil, 4 Bien y 1 Fácil (7 repasos)
- **THEN** la fila Bien muestra 4 con una barra al 4/7 del ancho y las demás en proporción

#### Scenario: Sin calificaciones hoy
- **WHEN** las repasadas de hoy son 0
- **THEN** la sección muestra "Aún no has calificado tarjetas hoy." sin barras

#### Scenario: Contador parcial
- **WHEN** el contador del día solo registra calificaciones "Bien"
- **THEN** las filas Otra vez, Difícil y Fácil muestran 0

### Requirement: Muestra el estado de la colección por estado de tarjeta
El sistema SHALL mostrar la sección "Tu colección" con el total de tarjetas ("N tarjetas en total"), una barra apilada y tres conteos: "Nuevas" (tarjetas en estado nuevo), "En aprendizaje" (estados aprendizaje y reaprendizaje sumados) y "Dominadas" (estado repaso). Los conteos SHALL abarcar todas las tarjetas del usuario, de todos los libros, incluidas las suspendidas, y SHALL obtenerse como conteo agregado en el almacén sin leer tarjeta por tarjeta. Cada segmento de la barra apilada mide la proporción de su grupo sobre el total y los tres usan matices del color de acento, no la escala de calificación.

#### Scenario: Colección mixta
- **WHEN** el usuario tiene 3 tarjetas nuevas, 2 en aprendizaje o reaprendizaje y 5 en repaso
- **THEN** Progreso muestra "10 tarjetas en total" con 3 Nuevas, 2 En aprendizaje y 5 Dominadas

#### Scenario: Reaprendizaje cuenta como aprendizaje
- **WHEN** una tarjeta dominada falla y pasa a reaprendizaje
- **THEN** deja de contar en Dominadas y suma en En aprendizaje

### Requirement: Estado vacío cuando no hay tarjetas
El sistema SHALL mostrar un estado vacío con el título "Aún no hay nada que mostrar" y el mensaje "Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar." únicamente cuando el total de tarjetas de la colección es 0. Si hay tarjetas pero ningún repaso, SHALL mostrar los paneles con sus ceros.

#### Scenario: Sin tarjetas
- **WHEN** el usuario no tiene ninguna tarjeta
- **THEN** Progreso muestra el estado vacío en lugar de los paneles

#### Scenario: Tarjetas sin repasar
- **WHEN** el usuario tiene tarjetas pero nunca ha repasado
- **THEN** Progreso muestra los paneles con Repasadas hoy en 0 y el aviso de que aún no ha calificado hoy

### Requirement: Estados de carga y error honestos
Mientras carga, el sistema SHALL mostrar esqueletos de contenido (no un spinner) marcados como ocupados para tecnologías de asistencia. Si falla cualquiera de las fuentes (la cola del día, el contador del día o el conteo de la colección) o la cola del día quedó en error, el sistema SHALL mostrar un estado de error con el título "No pudimos cargar tus estadísticas", el mensaje "No se pudieron cargar tus estadísticas." y un botón "Reintentar" que vuelve a cargar todo, en lugar de mostrar datos parciales o ceros fingidos.

#### Scenario: Falla la cola del día
- **WHEN** la cola diaria no se pudo armar
- **THEN** Progreso muestra el estado de error con Reintentar, aunque el conteo de la colección estuviera disponible

#### Scenario: Falla el conteo de la colección
- **WHEN** el conteo agregado de tarjetas falla
- **THEN** Progreso muestra el estado de error con Reintentar

#### Scenario: Reintentar
- **WHEN** el usuario toca "Reintentar" tras un error
- **THEN** el sistema vuelve al estado de carga y repite la carga completa

### Requirement: Una sola carga de tarjetas y del contador del día por visita
El sistema SHALL reutilizar en Progreso la carga de la cola diaria (tarjetas candidatas y contador del día de estudio) en lugar de volver a pedirlas por separado: por cada visita a Progreso SHALL haber como máximo una lectura de tarjetas candidatas, una lectura del contador del día y tres conteos agregados (uno por grupo de estado). El historial de repasos NO SHALL leerse para esta pantalla.

#### Scenario: Progreso no duplica la lectura del contador
- **WHEN** el usuario entra a Progreso
- **THEN** el contador del día se lee una sola vez y de él salen tanto las repasadas de hoy como la distribución de calificaciones

#### Scenario: Progreso no lee el historial
- **WHEN** el usuario entra a Progreso
- **THEN** no se consulta ningún registro del historial de repasos
