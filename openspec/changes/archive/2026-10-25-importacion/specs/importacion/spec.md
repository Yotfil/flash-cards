## ADDED Requirements

### Requirement: Un ` :: ` con espacios separa el ejemplo opcional de la tarjeta
En una línea de tarjeta (no en encabezados), el sistema SHALL buscar el primer ` :: ` rodeado de al menos un espacio a cada lado y SHALL tomar lo posterior, recortado, como el ejemplo de la tarjeta; lo anterior sigue las reglas de cloze y de separador. Un `::` pegado a texto por cualquiera de sus lados SHALL tratarse como contenido. Un ejemplo que quede vacío SHALL omitirse (la tarjeta se guarda sin ejemplo). El ejemplo SHALL respetar el mismo límite que el formulario de tarjeta (2000 caracteres); si lo supera, la línea SHALL omitirse con "El ejemplo supera los 2000 caracteres.". Las tarjetas importadas con ejemplo SHALL conservarlo al guardarse, tanto al importar un libro como al pegar en un capítulo.

#### Scenario: Tarjeta básica con ejemplo
- **WHEN** la línea es `to give up | rendirse :: I gave up smoking last year`
- **THEN** resulta una tarjeta básica con `front = to give up`, `back = rendirse` y `example = I gave up smoking last year`

#### Scenario: Cloze con ejemplo
- **WHEN** la línea es `She {{has lived}} here for 5 years :: present perfect`
- **THEN** resulta una tarjeta cloze con `front = She {{has lived}} here for 5 years`, `back` vacío y `example = present perfect`

#### Scenario: Dos puntos dobles pegados son contenido
- **WHEN** la línea es `std::vector | vector dinámico`
- **THEN** resulta una tarjeta básica con `front = std::vector`, `back = vector dinámico` y sin ejemplo

#### Scenario: Solo el primer separador de ejemplo cuenta
- **WHEN** la línea es `a | b :: primero :: segundo`
- **THEN** `back = b` y `example = primero :: segundo`

#### Scenario: Ejemplo vacío se omite
- **WHEN** la línea es `a | b :: `
- **THEN** resulta una tarjeta válida sin ejemplo y ningún error

#### Scenario: Ejemplo demasiado largo
- **WHEN** la línea tiene `a | b :: ` seguido de 2001 caracteres
- **THEN** la línea se omite con "El ejemplo supera los 2000 caracteres."

#### Scenario: El ejemplo se guarda
- **WHEN** el usuario importa `a | b :: ejemplo` en un capítulo y confirma
- **THEN** la tarjeta creada tiene `example = ejemplo` y aparece con el indicador "Tiene ejemplo" en el listado

### Requirement: Agregar a un capítulo escribe por lotes y no deshace lo ya escrito
Al agregar en un capítulo más tarjetas de las que caben en un lote, el sistema SHALL escribirlas en lotes sucesivos, cada uno con su propia suma al contador del libro. Si un lote falla, las tarjetas de los lotes anteriores SHALL permanecer creadas con el contador correcto, el sistema SHALL mostrar el error de importación y el diálogo SHALL conservar el texto; al reintentar, la previsualización SHALL contar como repetidas las que ya entraron.

#### Scenario: Falla a mitad al agregar
- **WHEN** el usuario agrega 900 tarjetas válidas a un capítulo con `cardCount = 10` y falla el segundo lote
- **THEN** quedan creadas las del primer lote, el contador del libro subió exactamente en ese número, se muestra "No se pudieron importar las tarjetas. Inténtalo de nuevo." y el texto sigue en el diálogo

### Requirement: Sin conexión, la previsualización funciona pero no se confirma
Sin conexión, el sistema SHALL seguir procesando el texto y mostrando la previsualización completa, incluidas las repetidas contra el capítulo destino, y SHALL deshabilitar el botón de confirmar con el texto "Necesitas conexión para guardar cambios." dentro del diálogo o la página. Cancelar y cargar archivo SHALL seguir disponibles. Al volver la conexión, el botón SHALL habilitarse sin perder el texto. Los botones que abren la importación ("Importar libro", "Importar tarjetas") SHALL permanecer activos sin conexión.

#### Scenario: Previsualizar sin red
- **WHEN** no hay conexión y el usuario pega 4 líneas válidas y 1 inválida
- **THEN** la previsualización muestra "4 tarjetas" y "1 línea se omitirá:" y el botón de confirmar está deshabilitado con "Necesitas conexión para guardar cambios."

#### Scenario: Vuelve la red
- **WHEN** vuelve la conexión con texto válido en el área
- **THEN** el botón "Importar 4" se habilita y el texto sigue intacto

#### Scenario: Entrar a importar sin red
- **WHEN** no hay conexión y el usuario toca "Importar libro" en la Biblioteca
- **THEN** la página de importar se abre y permite escribir y previsualizar

## MODIFIED Requirements

### Requirement: Un encabezado `#` abre un capítulo nuevo y uno sin nombre se reporta
El sistema SHALL tomar como nombre del capítulo el texto posterior al `#`, recortado, y SHALL abrir un capítulo nuevo donde caerán las tarjetas siguientes hasta el próximo encabezado. El nombre SHALL cumplir la misma regla que el formulario de capítulo (1 a 120 caracteres). Un `#` cuyo nombre recortado quede vacío SHALL reportarse con el motivo "Encabezado de capítulo sin nombre." y SHALL NOT abrir capítulo; uno cuyo nombre supere los 120 caracteres SHALL reportarse con "El nombre del capítulo supera los 120 caracteres." y SHALL NOT abrir capítulo. En ambos casos las tarjetas siguientes caen en el capítulo que ya estuviera activo o en el capítulo por defecto. Un encabezado sin tarjetas debajo SHALL producir igualmente un capítulo vacío: es la forma de dejar el esquema del libro listo para rellenarlo después, y la previsualización SHALL contarlo entre los capítulos.

#### Scenario: Ejemplo completo de la convención
- **WHEN** el texto tiene `# Movement & Direction` con dos tarjetas, una línea en blanco y `# Present Perfect` con dos tarjetas
- **THEN** resultan 2 capítulos con esos nombres, 2 tarjetas cada uno, 4 válidas y 0 errores

#### Scenario: Encabezado sin nombre
- **WHEN** el texto es `#`, `#   `, `a | b`
- **THEN** se reportan 2 errores "Encabezado de capítulo sin nombre." (líneas 1 y 2) y la tarjeta cae en el capítulo por defecto

#### Scenario: Encabezado vacío de tarjetas
- **WHEN** el texto es `# A`, `x | y`, `# B`
- **THEN** resultan 2 capítulos: "A" con una tarjeta y "B" sin tarjetas, y la previsualización dice "2 capítulos"

#### Scenario: Encabezado demasiado largo
- **WHEN** el texto es `# ` seguido de 121 caracteres, y luego `a | b`
- **THEN** se reporta "El nombre del capítulo supera los 120 caracteres." en la línea 1 y la tarjeta cae en el capítulo por defecto

### Requirement: Una línea de tarjeta se parte por el primer separador, con prioridad del pipe sobre el tabulador
Tras apartar el ejemplo (si lo hay) y descartar que sea cloze, el sistema SHALL partir la línea por `|` si contiene alguno; si no contiene `|` pero sí un tabulador, SHALL partir por el tabulador. SHALL partirse únicamente en el primer separador: lo anterior es el anverso y todo lo posterior (incluidos otros pipes) es el reverso. Ambos lados SHALL recortarse. Una línea sin `|` ni tabulador SHALL reportarse con "Línea sin separador ("|" o tabulador).". Una línea cuyo anverso o reverso quede vacío SHALL reportarse con "Anverso o reverso vacío.". Anverso y reverso SHALL cumplir el mismo límite que el formulario de tarjeta (2000 caracteres); si uno lo supera, la línea SHALL reportarse con "El anverso supera los 2000 caracteres." o "El reverso supera los 2000 caracteres.". Las tarjetas así obtenidas son de tipo básica.

#### Scenario: Separador pipe
- **WHEN** la línea es `to give up | rendirse, darse por vencido`
- **THEN** resulta una tarjeta básica con `front = to give up` y `back = rendirse, darse por vencido`

#### Scenario: Separador tabulador
- **WHEN** la línea es `hola<TAB>world` sin ningún pipe
- **THEN** resulta una tarjeta básica con `front = hola` y `back = world`

#### Scenario: Solo el primer separador cuenta
- **WHEN** la línea es `to look forward to | esperar con ansias | tener ganas de`
- **THEN** `front = to look forward to` y `back = esperar con ansias | tener ganas de`

#### Scenario: Recorte de espacios
- **WHEN** la línea es `   to give up   |   rendirse   `
- **THEN** `front = to give up` y `back = rendirse`

#### Scenario: Línea sin separador
- **WHEN** el texto es `buena | tarjeta`, `línea mala sin separador`, `otra | buena`
- **THEN** resultan 2 válidas y un único error en la línea 2: "Línea sin separador ("|" o tabulador)."

#### Scenario: Lado vacío
- **WHEN** el texto es `to give up |`, `| rendirse`, `ok | bien`
- **THEN** resulta 1 válida y dos errores "Anverso o reverso vacío." en las líneas 1 y 2

#### Scenario: Anverso demasiado largo
- **WHEN** la línea tiene 2001 caracteres antes del `|` y `b` después
- **THEN** la línea se omite con "El anverso supera los 2000 caracteres."

### Requirement: Una línea con huecos `{{...}}` se importa como tarjeta cloze
Tras apartar el ejemplo, el sistema SHALL reconocer como tarjeta cloze toda línea de tarjeta que contenga al menos un hueco válido (`{{contenido}}` con contenido no vacío), antes de buscar separadores. El texto recortado SHALL ser el `front` y el `back` SHALL quedar vacío; no se exige separador. Si la línea cloze contiene además `|` o un tabulador, el sistema SHALL NOT adivinar: SHALL omitirla con el motivo "Una línea con huecos {{…}} no lleva separador.". El `front` de un cloze SHALL cumplir el mismo límite de 2000 caracteres que el formulario; si lo supera, SHALL omitirse con "El anverso supera los 2000 caracteres.".

#### Scenario: Línea cloze
- **WHEN** la línea es `El {{gato}} es {{negro}}`
- **THEN** resulta una tarjeta con `cardType = cloze`, `front = El {{gato}} es {{negro}}`, `back` vacío y sin error

#### Scenario: Marcador vacío no hace cloze
- **WHEN** la línea es `El {{}} es negro`
- **THEN** no se trata como cloze y, al no tener separador, se reporta "Línea sin separador ("|" o tabulador)."

#### Scenario: Cloze con separador se omite
- **WHEN** el texto es `I {{gave up}} | rendirse`, `ok | bien`
- **THEN** resulta 1 válida y un error en la línea 1: "Una línea con huecos {{…}} no lleva separador."

### Requirement: La previsualización es obligatoria, en vivo y sin escribir nada
El sistema SHALL procesar el texto en memoria cada vez que el usuario escribe, pega o carga un archivo, y SHALL mostrar antes de confirmar, con plural real: el número de tarjetas válidas ("1 tarjeta", "4 tarjetas"), el número de capítulos detectados al importar un libro ("1 capítulo", "2 capítulos"), el número de repetidas si es mayor que cero ("1 repetida", "3 repetidas") y la lista de líneas que se omitirán, encabezada por "1 línea se omitirá:" o "N líneas se omitirán:" y con el formato "Línea N: motivo". Las líneas omitidas SHALL distinguirse por icono y texto, nunca solo por color, y SHALL NOT usar el color de la calificación "Otra vez". El botón de confirmar SHALL mostrar "Importar N" con el número de tarjetas válidas y SHALL permanecer deshabilitado mientras ese número sea 0. El sistema SHALL NOT escribir nada en el almacén hasta que el usuario confirme.

#### Scenario: Previsualización con errores
- **WHEN** el usuario pega un texto con 4 válidas y 1 línea sin separador
- **THEN** se muestra "4 tarjetas", "1 línea se omitirá:" con "Línea N: Línea sin separador ("|" o tabulador)." y el botón dice "Importar 4"

#### Scenario: Nada válido
- **WHEN** el texto solo tiene líneas inválidas o está vacío
- **THEN** el botón de confirmar está deshabilitado

#### Scenario: Nada se guarda antes de confirmar
- **WHEN** el usuario pega texto válido y cierra sin confirmar
- **THEN** no se ha creado ninguna tarjeta ni libro

#### Scenario: Plural en singular
- **WHEN** el texto tiene 1 válida, 1 capítulo y 1 línea sin separador
- **THEN** se muestra "1 capítulo", "1 tarjeta", "1 línea se omitirá:" y el botón dice "Importar 1"

### Requirement: Importar un archivo crea un libro nuevo con capítulos y tarjetas en estado "nueva"
La página "Importar un libro" SHALL pedir el nombre y una materia opcional con la pista "Si la dejas vacía, será «general»", con las mismas reglas que el diálogo "Nuevo libro". Al confirmar, el sistema SHALL crear un libro con: nombre = el escrito recortado, o "Libro importado" si quedó vacío; `subject` = la materia recortada, o `general` si quedó vacía; `studyDirection = forward`; `newCardsPerDay` = el valor por defecto del usuario en Ajustes (20 si no lo ha cambiado); `maxReviewsPerDay = 200`; `order` = el siguiente al último libro de la biblioteca; `cardCount` = el número de tarjetas válidas. SHALL crear un capítulo por cada capítulo detectado, en orden de aparición (`order` 0, 1, 2…), y cada tarjeta como `forward`, no suspendida, con `noteId` propio, su ejemplo si lo trae, y programación inicial en estado "nueva". El capítulo por defecto SHALL llevar el nombre del libro.

#### Scenario: Libro armado con sus metadatos
- **WHEN** el usuario importa "  Phrasal Verbs  " con 2 capítulos y 3 tarjetas válidas
- **THEN** se crea el libro "Phrasal Verbs" con `subject = general`, `studyDirection = forward`, `cardCount = 3`, y 2 capítulos con `order` 0 y 1

#### Scenario: Nombre vacío
- **WHEN** el usuario confirma con el nombre en blanco
- **THEN** el libro se llama "Libro importado"

#### Scenario: Tarjetas importadas nacen nuevas
- **WHEN** se importa un libro
- **THEN** cada tarjeta queda con `direction = forward`, `suspended = false`, estado "nueva" y `noteId` no vacío

#### Scenario: Materia escrita
- **WHEN** el usuario escribe "  Francés  " en la materia y confirma
- **THEN** el libro se crea con `subject = Francés` y la Biblioteca lo muestra con esa etiqueta

### Requirement: La escritura del libro es consistente y por lotes, y al terminar lleva al libro
El sistema SHALL escribir los capítulos y las tarjetas en lotes de como máximo 450 escrituras y SHALL escribir el documento del libro en el último lote, de modo que el libro nunca aparezca en la Biblioteca a medias. Si un lote falla, el sistema SHALL intentar borrar todo lo que ya se había escrito, SHALL registrar el resultado de ese intento y SHALL mostrar "No se pudo importar el libro. Inténtalo de nuevo." conservando el nombre, la materia y el texto para reintentar. Al terminar bien, el nuevo libro SHALL aparecer en la Biblioteca sin recargar y el usuario SHALL ser llevado a la pantalla del libro creado.

#### Scenario: Importación exitosa
- **WHEN** la escritura termina bien
- **THEN** el usuario ve la pantalla del libro nuevo y la Biblioteca lo lista

#### Scenario: Falla la escritura
- **WHEN** la escritura del libro falla
- **THEN** aparece el mensaje de error encima de los botones, el botón vuelve a estar disponible y el nombre, la materia y el texto siguen ahí

#### Scenario: Doble clic en importar
- **WHEN** el usuario pulsa "Importar N" dos veces seguidas
- **THEN** se crea un solo libro; mientras importa, el botón muestra "Importando…" y queda deshabilitado

#### Scenario: Falla a mitad en un libro grande
- **WHEN** se importan 1000 tarjetas y falla el segundo lote
- **THEN** no existe ningún libro nuevo, las tarjetas del primer lote se borran, y se muestra el mensaje de error con el texto intacto

### Requirement: El modo "agregar" es el predeterminado y no toca las tarjetas existentes
El diálogo SHALL preguntar "¿Qué hacemos con las tarjetas que ya tiene el capítulo?" y ofrecer dos modos excluyentes: "Agregar a las que ya existen" (predeterminado) y "Reemplazar todas". En modo agregar, al confirmar el sistema SHALL crear las importadas directamente, sin confirmación adicional, y SHALL dejar intactas las tarjetas actuales y su progreso.

#### Scenario: Agregar emite directo
- **WHEN** el capítulo tiene 5 tarjetas, el usuario pega `to give up | rendirse` y confirma en modo agregar
- **THEN** se crea la tarjeta sin pedir confirmación extra y las 5 anteriores siguen igual

### Requirement: El modo "reemplazar" borra el capítulo entero antes de crear y pide confirmación explícita
En modo reemplazar, si el capítulo tiene tarjetas, el sistema SHALL mostrar una confirmación extra "¿Reemplazar todas las tarjetas?" que advierte que se borrarán las N tarjetas actuales (o "la tarjeta actual" si es 1) junto con su historial y progreso de estudio, y sugiere editar cada tarjeta con "Editar" si se quiere conservar el progreso, con el botón "Reemplazar todo". Solo al confirmar, el sistema SHALL borrar todas las tarjetas actuales del capítulo y crear las importadas, ajustando el contador del libro en la diferencia neta. Cuando borrados, altas y ajuste caben en un lote, la operación SHALL ser una sola: o se reemplaza todo o no cambia nada. Cuando no caben, SHALL hacerse en lotes sucesivos, cada uno con su ajuste del contador, y si uno falla el diálogo SHALL conservar el texto para que un reintento en modo reemplazar deje el capítulo como se quería. Si el capítulo está vacío, SHALL NOT pedirse confirmación extra. Los registros de repaso históricos SHALL NOT borrarse. Cancelar la confirmación SHALL conservar el texto pegado.

#### Scenario: Reemplazar pide confirmación
- **WHEN** el capítulo tiene 5 tarjetas y el usuario confirma en modo reemplazar
- **THEN** no se escribe nada todavía y aparece la confirmación que menciona el progreso y el botón "Editar"

#### Scenario: Reemplazo confirmado
- **WHEN** el capítulo tiene 2 tarjetas, el usuario importa 3 en modo reemplazar y confirma "Reemplazar todo"
- **THEN** quedan solo las 3 importadas y el contador del libro sube exactamente 1 en la misma operación

#### Scenario: Capítulo vacío no pide confirmación
- **WHEN** el capítulo no tiene tarjetas y el usuario confirma en modo reemplazar
- **THEN** las importadas se crean directamente, sin borrar nada ni restar al contador

#### Scenario: Cancelar la confirmación
- **WHEN** el usuario cancela la confirmación de reemplazo
- **THEN** no se borra ni crea nada y el texto pegado sigue en el diálogo

#### Scenario: Aviso en singular
- **WHEN** el capítulo tiene exactamente 1 tarjeta
- **THEN** el aviso empieza por "Se borrará la tarjeta actual del capítulo"

#### Scenario: Reemplazo que falla no deja el capítulo vacío
- **WHEN** el capítulo tiene 2 tarjetas, el usuario reemplaza por 3 y la escritura falla
- **THEN** las 2 tarjetas siguen en el capítulo, el contador no cambió y la confirmación muestra el error con el texto conservado

### Requirement: La importación no filtra repetidas; el listado las señala después
El sistema SHALL importar todas las tarjetas válidas aunque alguna coincida con una tarjeta ya existente en el capítulo o con otra línea del mismo texto. Antes de confirmar, la previsualización SHALL contar como repetidas las líneas válidas que tienen otra igual (mismo anverso y reverso normalizados) dentro del texto o entre las tarjetas del capítulo destino ya cargadas; al importar un libro, solo dentro del texto. El contador SHALL ir acompañado de "Se importarán igual. Las verás marcadas como repetidas." y SHALL NOT deshabilitar el botón. Tras importar, las coincidencias SHALL aparecer con el indicador "Repetida" en el listado del capítulo.

#### Scenario: Repetida contra una existente
- **WHEN** el capítulo ya tiene `to give up | rendirse` y el usuario importa esa misma línea en modo agregar
- **THEN** la previsualización muestra "1 repetida", y tras confirmar quedan dos tarjetas idénticas y ambas se marcan como repetidas

#### Scenario: Repetida dentro del mismo texto
- **WHEN** el texto pegado trae dos líneas `x | y`
- **THEN** la previsualización muestra "2 repetidas", se crean las dos y ambas se marcan como repetidas

#### Scenario: Sin repetidas no hay contador
- **WHEN** ninguna línea válida coincide con otra ni con el capítulo
- **THEN** la previsualización no muestra la línea de repetidas

#### Scenario: Repetidas al importar un libro
- **WHEN** el usuario importa un libro cuyo texto trae `x | y` dos veces y `To Give Up | rendirse` una vez, y existe otro libro con `to give up | rendirse`
- **THEN** la previsualización muestra "2 repetidas" (las de `x | y`; el otro libro no se consulta)

### Requirement: La importación en un capítulo comunica su progreso y sus fallos
Mientras importa, el diálogo SHALL mostrar "Importando…" (o "Reemplazando…" en la confirmación de reemplazo), deshabilitar sus botones, ignorar reenvíos y bloquear el cierre con Escape. Si todo va bien, el diálogo SHALL cerrarse y las tarjetas nuevas SHALL aparecer en la lista sin recargar. Si falla, el diálogo SHALL permanecer abierto con el texto y mostrar dentro, encima de los botones, "No se pudieron importar las tarjetas. Inténtalo de nuevo."; el error de una confirmación de reemplazo SHALL mostrarse dentro de esa confirmación. Cancelar SHALL seguir disponible tras un fallo.

#### Scenario: Importación exitosa
- **WHEN** la creación de las tarjetas termina bien
- **THEN** el diálogo se cierra y las tarjetas se ven en el capítulo

#### Scenario: Falla la importación
- **WHEN** la escritura falla
- **THEN** el mensaje de error aparece dentro del diálogo, el diálogo sigue abierto con el texto pegado y el botón vuelve a estar disponible
