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
El sistema SHALL mostrar la sección "Tu colección" con el total de tarjetas, con plural real ("1 tarjeta en total", "10 tarjetas en total"), una barra apilada y tres conteos: "Nuevas" (tarjetas en estado nuevo), "En aprendizaje" (estados aprendizaje y reaprendizaje sumados) y "Dominadas" (estado repaso). Los conteos SHALL abarcar todas las tarjetas del usuario, de todos los libros, incluidas las suspendidas, y SHALL obtenerse como conteo agregado en el almacén sin leer tarjeta por tarjeta. Cada segmento de la barra apilada mide la proporción de su grupo sobre el total y los tres usan matices del color de acento, no la escala de calificación. Mientras el conteo llega, la sección SHALL mostrar su propio esqueleto. Si el conteo falla con conexión, la sección SHALL mostrar "No pudimos contar tu colección." con un botón "Reintentar" que repite solo ese conteo, y el resto de la pantalla SHALL seguir visible.

#### Scenario: Colección mixta
- **WHEN** el usuario tiene 3 tarjetas nuevas, 2 en aprendizaje o reaprendizaje y 5 en repaso
- **THEN** Progreso muestra "10 tarjetas en total" con 3 Nuevas, 2 En aprendizaje y 5 Dominadas

#### Scenario: Reaprendizaje cuenta como aprendizaje
- **WHEN** una tarjeta dominada falla y pasa a reaprendizaje
- **THEN** deja de contar en Dominadas y suma en En aprendizaje

#### Scenario: Una sola tarjeta
- **WHEN** el usuario tiene exactamente 1 tarjeta
- **THEN** la sección dice "1 tarjeta en total"

#### Scenario: Falla el conteo con conexión
- **WHEN** hay conexión y el conteo agregado de la colección falla
- **THEN** "Tu colección" muestra "No pudimos contar tu colección." y "Reintentar", mientras Pendientes hoy, Repasadas hoy y las calificaciones siguen visibles

#### Scenario: Reintentar solo la colección
- **WHEN** el usuario toca "Reintentar" en la sección y el conteo termina bien
- **THEN** la sección muestra los conteos y los paneles del día no se recargan

### Requirement: Estado vacío cuando no hay tarjetas
El sistema SHALL mostrar un estado vacío con el título "Aún no hay nada que mostrar" y el mensaje "Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar." únicamente cuando el conteo de la colección llegó y su total es 0. Si hay tarjetas pero ningún repaso, SHALL mostrar los paneles con sus ceros. Si el conteo de la colección no está disponible (sin conexión o fallido), el sistema SHALL NOT mostrar el estado vacío: SHALL mostrar los paneles del día y la sección de colección con su aviso.

#### Scenario: Sin tarjetas
- **WHEN** el usuario no tiene ninguna tarjeta y el conteo llegó
- **THEN** Progreso muestra el estado vacío en lugar de los paneles

#### Scenario: Tarjetas sin repasar
- **WHEN** el usuario tiene tarjetas pero nunca ha repasado
- **THEN** Progreso muestra los paneles con Repasadas hoy en 0 y el aviso de que aún no ha calificado hoy

#### Scenario: Sin conteo no hay vacío
- **WHEN** el conteo de la colección no está disponible y la cola base está vacía
- **THEN** Progreso muestra los paneles con "0" y la sección de colección con su aviso, no el estado vacío

### Requirement: Estados de carga y error honestos
Mientras carga, el sistema SHALL mostrar esqueletos de contenido (no un spinner) marcados como ocupados para tecnologías de asistencia. Si falla la carga de la cola del día o del contador del día (vienen de la misma carga), el sistema SHALL mostrar un estado de error de toda la pantalla con el título "No pudimos cargar tus estadísticas", el mensaje "No se pudieron cargar tus estadísticas." y un botón "Reintentar" que vuelve a cargar todo, en lugar de mostrar datos parciales o ceros fingidos. Un fallo del conteo de la colección SHALL NOT llevar a ese estado: se trata dentro de su sección.

#### Scenario: Falla la cola del día
- **WHEN** la cola diaria no se pudo armar
- **THEN** Progreso muestra el estado de error con Reintentar, aunque el conteo de la colección estuviera disponible

#### Scenario: Falla el conteo de la colección
- **WHEN** el conteo agregado de tarjetas falla y la cola del día cargó bien
- **THEN** Progreso muestra los paneles del día y la sección "Tu colección" con "No pudimos contar tu colección." y su Reintentar, sin el estado de error de toda la pantalla

#### Scenario: Reintentar
- **WHEN** el usuario toca "Reintentar" tras un error de toda la pantalla
- **THEN** el sistema vuelve al estado de carga y repite la carga completa, incluido el conteo de la colección

### Requirement: Una sola carga de tarjetas y del contador del día por visita
El sistema SHALL reutilizar en Progreso la carga de la cola diaria (tarjetas candidatas y contador del día de estudio) en lugar de volver a pedirlas por separado: por cada visita a Progreso SHALL haber como máximo una lectura de tarjetas candidatas y una lectura del contador del día. La racha de días de estudio NO SHALL leerse para esta pantalla (no la muestra). El historial de repasos NO SHALL leerse para esta pantalla. Los tres conteos agregados de la colección (uno por grupo de estado) SHALL hacerse en la primera visita con conexión y conservarse en memoria mientras la app siga abierta; el sistema SHALL repetirlos únicamente cuando, desde este dispositivo, cambió la colección (se calificó, creó, importó, reemplazó o borró alguna tarjeta, o se borró un capítulo o un libro), cuando el usuario toca "Reintentar" en la sección, o cuando no hay un conteo en memoria. Un cambio hecho en otro dispositivo SHALL reflejarse en el conteo en la siguiente ocasión en que se repita por cualquiera de esas causas.

#### Scenario: Progreso no duplica la lectura del contador
- **WHEN** el usuario entra a Progreso
- **THEN** el contador del día se lee una sola vez y de él salen tanto las repasadas de hoy como la distribución de calificaciones

#### Scenario: Progreso no lee el historial
- **WHEN** el usuario entra a Progreso
- **THEN** no se consulta ningún registro del historial de repasos

#### Scenario: Progreso no lee la racha
- **WHEN** el usuario entra a Progreso
- **THEN** no se leen los indicadores de días anteriores (la racha solo se lee al entrar a Hoy)

#### Scenario: Segunda visita sin cambios
- **WHEN** el usuario entra a Progreso, va a la Biblioteca sin crear ni borrar nada y vuelve a Progreso
- **THEN** "Tu colección" muestra los mismos conteos sin repetir los conteos agregados

#### Scenario: Volver tras repasar
- **WHEN** el usuario califica al menos una tarjeta en una sesión y después entra a Progreso
- **THEN** los conteos agregados se repiten y "Tu colección" refleja el estado nuevo de las tarjetas calificadas

#### Scenario: Volver tras importar o borrar
- **WHEN** el usuario importa tarjetas, o borra una tarjeta, un capítulo o un libro, y después entra a Progreso
- **THEN** los conteos agregados se repiten

#### Scenario: Reintentar repite solo el conteo
- **WHEN** el usuario toca "Reintentar" en la sección "Tu colección"
- **THEN** los conteos agregados se repiten y los paneles del día no se recargan

### Requirement: Sin conexión, Progreso muestra el día y omite la colección
Sin conexión, el sistema SHALL armar "Pendientes hoy", "Repasadas hoy" y "Calificaciones de hoy" con las tarjetas y el contador del día que el dispositivo ya tiene guardados, igual que Hoy. Si hay un conteo de la colección en memoria, la sección "Tu colección" SHALL seguir mostrándolo. Si no lo hay, la sección SHALL mostrar, sin número ni barra, "Necesitas conexión para contar tu colección.", y SHALL NOT mostrarse como error ni como cero; al volver la conexión con Progreso abierta, el sistema SHALL pedir el conteo sin que el usuario recargue. Al volver la conexión en cualquier otra pantalla, el sistema NO SHALL pedir el conteo.

#### Scenario: Sin red con conteo previo
- **WHEN** el usuario ya vio "Tu colección" con conexión y entra a Progreso sin red
- **THEN** los paneles del día salen de lo guardado y "Tu colección" muestra el conteo que tenía

#### Scenario: Progreso sin red
- **WHEN** el usuario entra a Progreso sin red y nunca se contó la colección en esta apertura de la app
- **THEN** los paneles del día salen de lo guardado y la sección dice "Necesitas conexión para contar tu colección."

#### Scenario: Vuelve la red
- **WHEN** vuelve la conexión mientras Progreso muestra "Necesitas conexión para contar tu colección."
- **THEN** la sección pide el conteo y lo muestra sin que el usuario recargue

#### Scenario: Vuelve la red en otra pantalla
- **WHEN** vuelve la conexión mientras el usuario está en el repaso o en la Biblioteca
- **THEN** no se pide ningún conteo de la colección
