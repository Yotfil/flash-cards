# Spec Delta

## MODIFIED Requirements

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
