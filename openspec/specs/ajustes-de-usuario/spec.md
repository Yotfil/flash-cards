# Ajustes de usuario Specification

## Purpose

Define los ajustes globales que acompañan al perfil de cada usuario, sus valores por defecto, cómo se editan y se guardan desde la pantalla Ajustes, y qué partes de la app los consumen. Son la perilla del ritmo de estudio (tarjetas nuevas por día), la frontera del día de estudio y las preferencias de la sesión de repaso.

## Requirements

### Requirement: El perfil del usuario tiene un conjunto fijo de ajustes globales con valores por defecto
El sistema SHALL guardar en el perfil del usuario los ajustes `timezone` (zona horaria IANA, por defecto la del dispositivo en el primer acceso), `dayStartHour` (hora de inicio del día de estudio, por defecto 4), `theme` (`light`, `dark` o `system`, por defecto `system`), `defaultNewCardsPerDay` (por defecto 20) y `autoGradeByTime` (por defecto `true`). Los ajustes SHALL crearse con estos valores en el primer acceso del usuario.

#### Scenario: Ajustes del perfil nuevo
- **WHEN** un usuario entra por primera vez desde un dispositivo en la zona `America/Bogota`
- **THEN** su perfil tiene `timezone` `America/Bogota`, `dayStartHour` 4, `theme` `system`, `defaultNewCardsPerDay` 20 y `autoGradeByTime` `true`

#### Scenario: Perfil creado antes de que existieran los ajustes nuevos
- **WHEN** se carga un perfil guardado sin `defaultNewCardsPerDay` ni `autoGradeByTime`
- **THEN** la sesión los expone con 20 y `true`, y quedan persistidos la próxima vez que se guarde cualquier ajuste

### Requirement: La pantalla Ajustes muestra con quién está iniciada la sesión
El sistema SHALL mostrar en `/ajustes`, bajo el rótulo "Sesión iniciada como", el nombre visible y el correo del usuario actual. Sin sesión cargada, la pantalla SHALL seguir mostrándose sin esa tarjeta ni el bloque de estudio.

#### Scenario: Datos de la sesión
- **WHEN** el usuario "Ada" con correo `ada@ejemplo.com` abre Ajustes
- **THEN** ve "Ada" y `ada@ejemplo.com` en la tarjeta de sesión

### Requirement: El usuario puede editar el default global de tarjetas nuevas por día
El sistema SHALL ofrecer en Ajustes un campo numérico "Tarjetas nuevas por día (por defecto)" precargado con el `defaultNewCardsPerDay` del usuario, con una explicación de que es el valor con el que se crea cada libro y de que cada libro puede ajustarlo aparte. El valor SHALL ser obligatorio y estar entre 0 y 999; fuera de ese rango el sistema SHALL mostrar "Escribe un número entre 0 y 999." y NO SHALL guardar.

#### Scenario: Precarga del valor actual
- **WHEN** el usuario tiene `defaultNewCardsPerDay` 15 y abre Ajustes
- **THEN** el campo muestra 15

#### Scenario: Valor fuera de rango
- **WHEN** el usuario escribe 1000 y pulsa "Guardar"
- **THEN** ve "Escribe un número entre 0 y 999." y el ajuste no cambia

#### Scenario: Cero es válido
- **WHEN** el usuario escribe 0 y pulsa "Guardar"
- **THEN** el ajuste se guarda con 0

### Requirement: El default de nuevas se guarda con un botón explícito y da feedback del resultado
El guardado del default de nuevas SHALL requerir pulsar "Guardar". Durante el guardado el botón SHALL mostrar "Guardando…" y quedar deshabilitado, ignorando pulsaciones repetidas. Al terminar con éxito el sistema SHALL mostrar "Guardado."; si falla, SHALL mostrar "No se pudo guardar. Inténtalo de nuevo." y registrar el detalle en la consola. Volver a editar el campo SHALL ocultar el mensaje de resultado anterior.

#### Scenario: Guardado exitoso
- **WHEN** el usuario cambia 15 por 5 y pulsa "Guardar"
- **THEN** el ajuste `defaultNewCardsPerDay` queda en 5 y aparece "Guardado."

#### Scenario: Fallo al guardar
- **WHEN** la persistencia falla al pulsar "Guardar"
- **THEN** aparece "No se pudo guardar. Inténtalo de nuevo." y el ajuste en sesión conserva su valor anterior

#### Scenario: Editar tras guardar
- **WHEN** el usuario ve "Guardado." y vuelve a escribir en el campo
- **THEN** el mensaje "Guardado." desaparece

### Requirement: El usuario puede activar o desactivar la sugerencia de calificación por tiempo
El sistema SHALL ofrecer en Ajustes una casilla "Sugerir calificación por tiempo" que refleja `autoGradeByTime` y explica que, al revelar la respuesta, se resalta un cerebro según la velocidad de recuerdo y que el usuario siempre confirma. Cambiar la casilla SHALL guardar el ajuste de inmediato, sin botón. Mientras se guarda, la casilla SHALL estar deshabilitada. Si el guardado falla, la casilla SHALL volver a reflejar el valor persistido y el detalle SHALL registrarse en la consola.

#### Scenario: Desactivar la sugerencia
- **WHEN** el usuario desmarca la casilla
- **THEN** `autoGradeByTime` queda en `false` y la casilla permanece desmarcada

#### Scenario: Fallo al guardar la casilla
- **WHEN** la persistencia falla al cambiar la casilla
- **THEN** la casilla vuelve al valor que tenía y el error queda en la consola

### Requirement: Guardar un ajuste fusiona el cambio sobre los ajustes actuales y actualiza la sesión
El sistema SHALL aplicar cada cambio como una actualización parcial sobre los ajustes vigentes (sin tocar los demás), persistir el perfil completo y reflejar el nuevo valor en la sesión en cuanto el guardado termine, de modo que el resto de la app lo vea sin recargar. Sin sesión activa, la actualización SHALL fallar con un error explícito.

#### Scenario: Cambiar un ajuste no toca los otros
- **WHEN** el usuario guarda `defaultNewCardsPerDay` 5
- **THEN** `timezone`, `dayStartHour`, `theme` y `autoGradeByTime` conservan sus valores

#### Scenario: La sesión refleja el cambio al instante
- **WHEN** el guardado de `autoGradeByTime` termina con éxito
- **THEN** la próxima sesión de repaso usa ya el nuevo valor sin recargar la app

### Requirement: Los ajustes sin interfaz existen pero no se editan todavía
`timezone`, `dayStartHour` y `theme` SHALL guardarse en el perfil y conservarse en cada guardado, pero la pantalla Ajustes NO SHALL exponer controles para editarlos. La pantalla SHALL indicar que más ajustes (tema claro/oscuro, día de estudio, importación) llegarán después. `theme` SHALL guardarse aunque ninguna parte de la app lo aplique aún.

#### Scenario: Sin controles para el día de estudio
- **WHEN** el usuario abre Ajustes
- **THEN** no encuentra forma de cambiar `dayStartHour`, `timezone` ni `theme`, y ve el aviso de que llegarán pronto

### Requirement: El default de nuevas siembra los libros nuevos y la importación
El sistema SHALL usar `defaultNewCardsPerDay` del usuario como valor inicial de `newCardsPerDay` al abrir el formulario de crear libro y al crear un libro desde la importación. Al editar un libro existente SHALL mostrarse el valor propio del libro, no el default. Si la sesión aún no está cargada, el valor usado SHALL ser 20.

#### Scenario: Crear libro
- **WHEN** el usuario con `defaultNewCardsPerDay` 10 abre el formulario de nuevo libro
- **THEN** el campo de nuevas por día arranca en 10

#### Scenario: Editar libro
- **WHEN** el usuario con `defaultNewCardsPerDay` 10 edita un libro que tiene `newCardsPerDay` 30
- **THEN** el campo muestra 30

#### Scenario: Cambiar el default no altera libros existentes
- **WHEN** el usuario cambia `defaultNewCardsPerDay` de 20 a 5
- **THEN** los libros ya creados conservan su `newCardsPerDay`

### Requirement: La sugerencia de calificación por tiempo se aplica en el repaso
Cuando `autoGradeByTime` es `true`, al revelar la respuesta la sesión de repaso SHALL calcular un grado sugerido según el tiempo transcurrido desde que se mostró la tarjeta. Cuando es `false`, o no hay sesión cargada, NO SHALL haber sugerencia. El detalle de cómo se muestra y confirma la sugerencia pertenece a la especificación del repaso.

#### Scenario: Sugerencia activa
- **WHEN** el usuario tiene `autoGradeByTime` `true` y revela una respuesta
- **THEN** la sesión propone un grado sugerido

#### Scenario: Sugerencia desactivada
- **WHEN** el usuario tiene `autoGradeByTime` `false` y revela una respuesta
- **THEN** no hay grado sugerido

### Requirement: La zona horaria y la hora de inicio definen el día de estudio
El sistema SHALL usar `timezone` y `dayStartHour` del usuario para calcular la identidad del día de estudio y su fin, tanto al armar la cola diaria como al registrar estadísticas del día. El detalle del cálculo pertenece a la especificación de la cola diaria.

#### Scenario: Estadísticas del día correcto
- **WHEN** el usuario con `dayStartHour` 4 califica a la 01:00 local del día 15
- **THEN** la calificación se contabiliza en las estadísticas del día 14

### Requirement: El usuario puede cerrar sesión desde Ajustes
El sistema SHALL ofrecer en Ajustes un botón "Cerrar sesión" que, mientras se procesa, muestra "Cerrando sesión…" y queda deshabilitado, y que al terminar lleva a `/login`.

#### Scenario: Cerrar sesión
- **WHEN** el usuario pulsa "Cerrar sesión" en Ajustes
- **THEN** la sesión termina y es llevado a `/login`
