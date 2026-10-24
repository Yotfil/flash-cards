# Spec Delta

## ADDED Requirements

### Requirement: Los controles de elección guardan al tocar y los de texto con un botón
En Ajustes, todo control de elección (casilla, selector, tema) SHALL guardar su valor en cuanto el usuario lo cambia, sin botón; mientras guarda SHALL quedar deshabilitado; si el guardado falla, SHALL volver al valor persistido y mostrar junto al control, como alerta accesible, "No se pudo guardar. Inténtalo de nuevo.", registrando el detalle en el registro de errores de la app. Todo campo de texto numérico SHALL guardar con un botón "Guardar" propio, deshabilitado mientras guarda y cuando el valor no difiere del persistido.

#### Scenario: Elección guardada al tocar
- **WHEN** el usuario cambia un selector de Ajustes
- **THEN** el selector queda deshabilitado hasta que termina el guardado y después muestra el valor nuevo sin pulsar ningún botón

#### Scenario: Elección que no se pudo guardar
- **WHEN** la persistencia falla al cambiar un control de elección
- **THEN** el control vuelve al valor anterior y junto a él aparece "No se pudo guardar. Inténtalo de nuevo."

#### Scenario: Botón Guardar sin cambios
- **WHEN** el campo numérico muestra el mismo valor que está guardado
- **THEN** el botón "Guardar" está deshabilitado

### Requirement: El tema se elige en Ajustes y se aplica al instante
El sistema SHALL ofrecer en la sección "Apariencia" un selector de tema con tres opciones, "Oscuro", "Claro" y "Sistema", que refleja `theme`. Al tocar una opción el documento SHALL cambiar de tema de inmediato y el valor SHALL persistirse en el perfil; si el guardado falla, el documento y el selector SHALL volver al tema anterior. Al cargar la sesión, el tema del perfil SHALL aplicarse al documento y prevalecer sobre cualquier preferencia recordada en el navegador.

#### Scenario: Cambiar a claro
- **WHEN** el usuario con `theme` `system` toca "Claro"
- **THEN** la app se pinta en claro en ese momento y `theme` queda guardado como `light`

#### Scenario: El perfil manda al cargar
- **WHEN** el navegador recuerda `dark` pero el perfil del usuario tiene `theme` `light`
- **THEN** al cargar la sesión la app se pinta en claro

#### Scenario: Fallo al guardar el tema
- **WHEN** la persistencia falla al tocar "Oscuro" desde "Sistema"
- **THEN** la app vuelve a seguir al sistema, el selector marca "Sistema" y aparece el error junto al selector

### Requirement: La zona horaria se elige de la lista de zonas y se avisa si el dispositivo está en otra
El sistema SHALL ofrecer en la sección "Día de estudio" un selector "Zona horaria" con todas las zonas horarias IANA que conoce el dispositivo, que refleja `timezone` y guarda al tocar. Si la zona del dispositivo difiere de la guardada, la pantalla SHALL mostrar "Tu dispositivo está en {zona}." con una acción "Usar esta zona" que guarda la del dispositivo. El sistema NUNCA SHALL cambiar la zona guardada por su cuenta.

#### Scenario: Elegir otra zona
- **WHEN** el usuario elige `Europe/Madrid` en el selector
- **THEN** `timezone` queda guardado como `Europe/Madrid`

#### Scenario: Dispositivo en otra zona
- **WHEN** el perfil tiene `America/Bogota` y el dispositivo está en `America/Mexico_City`
- **THEN** la pantalla muestra "Tu dispositivo está en America/Mexico_City." con la acción "Usar esta zona", y `timezone` sigue siendo `America/Bogota` hasta que el usuario la toque

#### Scenario: Dispositivo en la misma zona
- **WHEN** el perfil y el dispositivo coinciden en la zona
- **THEN** no se muestra ningún aviso

### Requirement: La hora de inicio del día se elige entre las 24 horas
El sistema SHALL ofrecer en la sección "Día de estudio" un selector "El día empieza a las" con las 24 horas en formato `HH:00`, que refleja `dayStartHour`, guarda al tocar y explica que lo que se estudie antes de esa hora cuenta para el día anterior.

#### Scenario: Cambiar la hora de inicio
- **WHEN** el usuario elige "02:00"
- **THEN** `dayStartHour` queda guardado como 2

### Requirement: El pie de versión cierra la pantalla de Ajustes
El sistema SHALL mostrar al final de Ajustes, debajo de "Cerrar sesión", el pie de versión en texto tenue; es la única pantalla que lo muestra.

#### Scenario: Versión visible en Ajustes
- **WHEN** el usuario baja hasta el final de Ajustes
- **THEN** ve `v{versión} · {commit}` y la fecha del build en una línea tenue

### Requirement: Sin conexión, los ajustes no se guardan
Mientras no haya conexión, el sistema SHALL deshabilitar los controles de elección de Ajustes (casilla, selectores de zona y de hora, tema y la acción "Usar esta zona") y el botón "Guardar" del campo numérico, y mostrar una sola vez, al principio de la pantalla, "Necesitas conexión para guardar cambios."; los valores guardados SHALL seguir visibles y el campo numérico SHALL seguir editable. "Cerrar sesión" SHALL seguir disponible. Al volver la conexión, los controles SHALL habilitarse sin perder lo escrito.

#### Scenario: Ajustes sin conexión
- **WHEN** no hay conexión y el usuario abre Ajustes
- **THEN** la casilla, los selectores, el tema y "Guardar" están deshabilitados, arriba se lee "Necesitas conexión para guardar cambios." y los valores guardados siguen a la vista

#### Scenario: Escribir sin conexión
- **WHEN** no hay conexión y el usuario escribe 5 en el campo numérico
- **THEN** el campo acepta el valor y "Guardar" sigue deshabilitado

#### Scenario: Vuelve la conexión
- **WHEN** Ajustes está abierto sin conexión con 5 escrito en el campo y vuelve la conexión
- **THEN** los controles se habilitan, el campo conserva el 5 y "Guardar" queda habilitado

#### Scenario: Cerrar sesión sin conexión
- **WHEN** no hay conexión y el usuario pulsa "Cerrar sesión"
- **THEN** la sesión se cierra igual que con conexión

## MODIFIED Requirements

### Requirement: La pantalla Ajustes muestra con quién está iniciada la sesión
El sistema SHALL organizar `/ajustes` en secciones, en este orden: "Sesión", "Estudio", "Día de estudio", "Apariencia", el botón "Cerrar sesión" y el pie de versión. La sección "Sesión" SHALL mostrar, bajo el rótulo "Sesión iniciada como", el nombre visible y el correo del usuario actual. La pantalla solo se muestra con sesión activa (la protege la spec de autenticación).

#### Scenario: Datos de la sesión
- **WHEN** el usuario "Ada" con correo `ada@ejemplo.com` abre Ajustes
- **THEN** ve "Ada" y `ada@ejemplo.com` en la sección "Sesión"

#### Scenario: Orden de las secciones
- **WHEN** el usuario abre Ajustes
- **THEN** encuentra las secciones Sesión, Estudio, Día de estudio y Apariencia en ese orden, y al final Cerrar sesión y la versión

### Requirement: El usuario puede editar el default global de tarjetas nuevas por día
El sistema SHALL ofrecer en la sección "Estudio" un campo numérico "Tarjetas nuevas por día (por defecto)" precargado con el `defaultNewCardsPerDay` del usuario, con una explicación de que es el valor con el que se crea cada libro y de que cada libro puede ajustarlo aparte. El valor SHALL ser obligatorio, entero y estar entre 0 y 999; si no cumple, el sistema SHALL mostrar "Escribe un número entre 0 y 999." y NO SHALL guardar.

#### Scenario: Precarga del valor actual
- **WHEN** el usuario tiene `defaultNewCardsPerDay` 15 y abre Ajustes
- **THEN** el campo muestra 15

#### Scenario: Valor fuera de rango
- **WHEN** el usuario escribe 1000 y pulsa "Guardar"
- **THEN** ve "Escribe un número entre 0 y 999." y el ajuste no cambia

#### Scenario: Valor con decimales
- **WHEN** el usuario escribe 2.5 y pulsa "Guardar"
- **THEN** ve "Escribe un número entre 0 y 999." y el ajuste no cambia

#### Scenario: Cero es válido
- **WHEN** el usuario escribe 0 y pulsa "Guardar"
- **THEN** el ajuste se guarda con 0

### Requirement: El default de nuevas se guarda con un botón explícito y da feedback del resultado
El guardado del default de nuevas SHALL requerir pulsar "Guardar". El botón SHALL estar deshabilitado mientras guarda y cuando el valor del campo es igual al persistido. Durante el guardado SHALL mostrar "Guardando…" e ignorar pulsaciones repetidas. Al terminar con éxito el sistema SHALL mostrar "Guardado."; si falla, SHALL mostrar "No se pudo guardar. Inténtalo de nuevo." como alerta accesible y registrar el detalle en el registro de errores de la app. Volver a editar el campo SHALL ocultar el mensaje de resultado anterior.

#### Scenario: Guardado exitoso
- **WHEN** el usuario cambia 15 por 5 y pulsa "Guardar"
- **THEN** el ajuste `defaultNewCardsPerDay` queda en 5, aparece "Guardado." y el botón vuelve a quedar deshabilitado porque ya no hay cambios

#### Scenario: Fallo al guardar
- **WHEN** la persistencia falla al pulsar "Guardar"
- **THEN** aparece "No se pudo guardar. Inténtalo de nuevo." y el ajuste en sesión conserva su valor anterior

#### Scenario: Editar tras guardar
- **WHEN** el usuario ve "Guardado." y vuelve a escribir en el campo
- **THEN** el mensaje "Guardado." desaparece

### Requirement: El usuario puede activar o desactivar la sugerencia de calificación por tiempo
El sistema SHALL ofrecer en la sección "Estudio" una casilla "Sugerir calificación por tiempo" que refleja `autoGradeByTime` y explica que, al revelar la respuesta, se resalta un cerebro según la velocidad de recuerdo y que el usuario siempre confirma. Cambiar la casilla SHALL guardar el ajuste de inmediato, sin botón. Mientras se guarda, la casilla SHALL estar deshabilitada. Si el guardado falla, la casilla SHALL volver a reflejar el valor persistido, SHALL mostrarse junto a ella "No se pudo guardar. Inténtalo de nuevo." y el detalle SHALL registrarse en el registro de errores de la app. El valor por defecto de este ajuste SHALL tener una única fuente, la misma que usa la creación del perfil y la lectura de perfiles antiguos.

#### Scenario: Desactivar la sugerencia
- **WHEN** el usuario desmarca la casilla
- **THEN** `autoGradeByTime` queda en `false` y la casilla permanece desmarcada

#### Scenario: Fallo al guardar la casilla
- **WHEN** la persistencia falla al cambiar la casilla
- **THEN** la casilla vuelve al valor que tenía, aparece el error junto a ella y el detalle queda registrado

## REMOVED Requirements

### Requirement: Los ajustes sin interfaz existen pero no se editan todavía
**Reason**: El rediseño Cadence hace editables tema, zona horaria y hora de inicio del día en esta misma pantalla; el aviso de "llegarán pronto" desaparece.
**Migration**: Ninguna en datos: los tres campos ya existían en el perfil con sus valores por defecto.
