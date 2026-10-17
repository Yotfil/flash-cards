# Importación Specification

## Purpose

Permitir que el usuario cargue muchas tarjetas de una vez a partir de texto plano con una convención mínima (una tarjeta por línea, `#` para capítulos), ya sea pegando tarjetas en un capítulo existente o importando un archivo completo como libro nuevo. El usuario nunca guarda a ciegas: el texto se procesa en memoria, se previsualiza con sus líneas problemáticas y solo al confirmar se escribe en el almacén.

## Requirements

### Requirement: Cada línea del texto es un encabezado de capítulo, una tarjeta o una línea en blanco
El sistema SHALL procesar el texto línea por línea, recortando los espacios de cada línea antes de clasificarla. Una línea vacía o de solo espacios SHALL ignorarse sin generar error. Una línea que empieza por `#` SHALL tratarse como encabezado de capítulo. Cualquier otra línea con contenido SHALL tratarse como tarjeta. El sistema SHALL aceptar saltos de línea LF, CRLF y CR. No existe sintaxis de comentarios: una línea como `// nota` es una línea de tarjeta.

#### Scenario: Líneas en blanco y de solo espacios
- **WHEN** el texto es `a | b`, línea vacía, línea de tres espacios, `c | d`
- **THEN** resultan 2 tarjetas válidas y ningún error

#### Scenario: Saltos de línea de Windows
- **WHEN** el texto es `a | b` y `c | d` separados por CRLF
- **THEN** resultan 2 tarjetas válidas y ningún error

#### Scenario: Texto vacío
- **WHEN** el texto es la cadena vacía
- **THEN** no hay capítulos, ni tarjetas, ni errores

#### Scenario: No hay comentarios
- **WHEN** una línea es `// esto es una nota`
- **THEN** se reporta como "Línea sin separador ("|" o tabulador)." y no se importa

### Requirement: Un encabezado `#` abre un capítulo nuevo y uno sin nombre se reporta
El sistema SHALL tomar como nombre del capítulo el texto posterior al `#`, recortado, y SHALL abrir un capítulo nuevo donde caerán las tarjetas siguientes hasta el próximo encabezado. Un `#` cuyo nombre recortado quede vacío SHALL reportarse con el motivo "Encabezado de capítulo sin nombre." y SHALL NOT abrir capítulo: las tarjetas siguientes caen en el capítulo que ya estuviera activo o en el capítulo por defecto. Un encabezado sin tarjetas debajo SHALL producir igualmente un capítulo (vacío).

#### Scenario: Ejemplo completo de la convención
- **WHEN** el texto tiene `# Movement & Direction` con dos tarjetas, una línea en blanco y `# Present Perfect` con dos tarjetas
- **THEN** resultan 2 capítulos con esos nombres, 2 tarjetas cada uno, 4 válidas y 0 errores

#### Scenario: Encabezado sin nombre
- **WHEN** el texto es `#`, `#   `, `a | b`
- **THEN** se reportan 2 errores "Encabezado de capítulo sin nombre." (líneas 1 y 2) y la tarjeta cae en el capítulo por defecto

#### Scenario: Encabezado vacío de tarjetas
- **WHEN** el texto es `# A`, `x | y`, `# B`
- **THEN** resultan 2 capítulos: "A" con una tarjeta y "B" sin tarjetas

### Requirement: Las tarjetas sin capítulo caen en un capítulo por defecto que solo existe si lo necesitan
El sistema SHALL agrupar en un capítulo por defecto las tarjetas que aparecen antes del primer `#` o cuando el texto no tiene ningún `#`. El nombre del capítulo por defecto SHALL ser el nombre del libro al importar un libro y el nombre del capítulo destino al pegar tarjetas en un capítulo. El capítulo por defecto SHALL crearse solo si llega a recibir alguna tarjeta: si el texto arranca con `#`, no se inventa un capítulo vacío.

#### Scenario: Texto sin ningún encabezado
- **WHEN** el texto es `a | b`, `c | d` y el nombre por defecto es "Mi libro"
- **THEN** resulta un único capítulo "Mi libro" con 2 tarjetas

#### Scenario: Tarjetas antes del primer encabezado
- **WHEN** el texto es `suelta | tarjeta`, `# Capítulo 1`, `dentro | del capítulo` y el nombre por defecto es "Defecto"
- **THEN** resultan 2 capítulos: "Defecto" con `suelta | tarjeta` y "Capítulo 1" con la otra

#### Scenario: El texto arranca con encabezado
- **WHEN** el texto es `# Solo este`, `x | y`
- **THEN** resulta un único capítulo "Solo este"; no se crea el capítulo por defecto

### Requirement: Una línea de tarjeta se parte por el primer separador, con prioridad del pipe sobre el tabulador
El sistema SHALL partir la línea por `|` si la línea contiene alguno; si no contiene `|` pero sí un tabulador, SHALL partir por el tabulador. SHALL partirse únicamente en el primer separador: lo anterior es el anverso y todo lo posterior (incluidos otros pipes) es el reverso. Ambos lados SHALL recortarse. Una línea sin `|` ni tabulador SHALL reportarse con "Línea sin separador ("|" o tabulador).". Una línea cuyo anverso o reverso quede vacío SHALL reportarse con "Anverso o reverso vacío.". Las tarjetas así obtenidas son de tipo básica.

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

### Requirement: Una línea con huecos `{{...}}` se importa como tarjeta cloze
El sistema SHALL reconocer como tarjeta cloze toda línea de tarjeta que contenga al menos un hueco válido (`{{contenido}}` con contenido no vacío), antes de buscar separadores. La línea completa recortada SHALL ser el `front` y el `back` SHALL quedar vacío; no se exige separador. Esta detección tiene prioridad sobre el formato `anverso | reverso`.

#### Scenario: Línea cloze
- **WHEN** la línea es `El {{gato}} es {{negro}}`
- **THEN** resulta una tarjeta con `cardType = cloze`, `front = El {{gato}} es {{negro}}`, `back` vacío y sin error

#### Scenario: Marcador vacío no hace cloze
- **WHEN** la línea es `El {{}} es negro`
- **THEN** no se trata como cloze y, al no tener separador, se reporta "Línea sin separador ("|" o tabulador)."

### Requirement: Ninguna línea mala aborta la importación y cada error se reporta con su número de línea
El sistema SHALL procesar todas las líneas válidas aunque otras fallen, y SHALL devolver la lista de errores con el número de línea (empezando en 1, contando las líneas en blanco) y su motivo, junto con el total de tarjetas válidas.

#### Scenario: Mezcla de válidas e inválidas
- **WHEN** el texto tiene 3 líneas válidas y 2 inválidas intercaladas
- **THEN** el resultado tiene 3 tarjetas válidas y 2 errores con sus líneas exactas

#### Scenario: Las líneas en blanco cuentan para la numeración
- **WHEN** la línea 1 es válida, la 2 está en blanco y la 3 no tiene separador
- **THEN** el error se reporta en la línea 3

### Requirement: La previsualización es obligatoria, en vivo y sin escribir nada
El sistema SHALL procesar el texto en memoria cada vez que el usuario escribe, pega o carga un archivo, y SHALL mostrar antes de confirmar: el número de tarjetas válidas, el número de capítulos detectados (al importar un libro) y la lista de líneas que se omitirán con el formato "Línea N: motivo". El botón de confirmar SHALL mostrar el número de tarjetas válidas y SHALL permanecer deshabilitado mientras ese número sea 0. El sistema SHALL NOT escribir nada en el almacén hasta que el usuario confirme.

#### Scenario: Previsualización con errores
- **WHEN** el usuario pega un texto con 4 válidas y 1 línea sin separador
- **THEN** se muestra "4 tarjeta(s) válida(s)" y "1 línea(s) se omitirán:" con "Línea N: Línea sin separador ("|" o tabulador)."

#### Scenario: Nada válido
- **WHEN** el texto solo tiene líneas inválidas o está vacío
- **THEN** el botón de confirmar está deshabilitado

#### Scenario: Nada se guarda antes de confirmar
- **WHEN** el usuario pega texto válido y cierra sin confirmar
- **THEN** no se ha creado ninguna tarjeta ni libro

### Requirement: Cargar un archivo rellena el texto y, al importar un libro, propone su nombre
El sistema SHALL aceptar archivos `.txt`, `.md` o de tipo texto plano, y SHALL reemplazar el contenido del área de texto con el del archivo. El mismo archivo SHALL poder cargarse de nuevo. Al importar un libro, el sistema SHALL proponer como nombre del libro el nombre del archivo sin la extensión `.txt`/`.md`, salvo que el usuario ya haya editado el nombre a mano, en cuyo caso SHALL respetarse lo escrito.

#### Scenario: Nombre propuesto desde el archivo
- **WHEN** el usuario carga `Phrasal Verbs.txt` sin haber tocado el nombre
- **THEN** el nombre del libro queda "Phrasal Verbs" y el texto del archivo aparece en el área

#### Scenario: El nombre editado se respeta
- **WHEN** el usuario escribe "Mis verbos" en el nombre y luego carga `Phrasal Verbs.txt`
- **THEN** el nombre sigue siendo "Mis verbos"

### Requirement: Importar un archivo crea un libro nuevo con capítulos y tarjetas en estado "nueva"
Al confirmar en "Importar un libro", el sistema SHALL crear un libro con: nombre = el escrito recortado, o "Libro importado" si quedó vacío; `subject = general`; `studyDirection = forward`; `newCardsPerDay` = el valor por defecto del usuario en Ajustes (20 si no lo ha cambiado); `maxReviewsPerDay = 200`; `order` = el siguiente al último libro de la biblioteca; `cardCount` = el número de tarjetas válidas. SHALL crear un capítulo por cada capítulo detectado, en orden de aparición (`order` 0, 1, 2…), y cada tarjeta como `forward`, no suspendida, con `noteId` propio y programación inicial en estado "nueva". El capítulo por defecto SHALL llevar el nombre del libro.

#### Scenario: Libro armado con sus metadatos
- **WHEN** el usuario importa "  Phrasal Verbs  " con 2 capítulos y 3 tarjetas válidas
- **THEN** se crea el libro "Phrasal Verbs" con `subject = general`, `studyDirection = forward`, `cardCount = 3`, y 2 capítulos con `order` 0 y 1

#### Scenario: Nombre vacío
- **WHEN** el usuario confirma con el nombre en blanco
- **THEN** el libro se llama "Libro importado"

#### Scenario: Tarjetas importadas nacen nuevas
- **WHEN** se importa un libro
- **THEN** cada tarjeta queda con `direction = forward`, `suspended = false`, estado "nueva" y `noteId` no vacío

### Requirement: La escritura del libro es consistente y por lotes, y al terminar lleva al libro
El sistema SHALL escribir el libro, sus capítulos y sus tarjetas como una sola operación, agrupada en lotes de como máximo 450 escrituras. Al terminar, el nuevo libro SHALL aparecer en la Biblioteca sin recargar y el usuario SHALL ser llevado a la pantalla del libro creado. Si la escritura falla, el sistema SHALL mostrar "No se pudo importar el libro. Inténtalo de nuevo." y SHALL conservar el nombre y el texto para reintentar.

#### Scenario: Importación exitosa
- **WHEN** la escritura termina bien
- **THEN** el usuario ve la pantalla del libro nuevo y la Biblioteca lo lista

#### Scenario: Falla la escritura
- **WHEN** la escritura del libro falla
- **THEN** aparece el mensaje de error, el botón vuelve a estar disponible y el texto pegado sigue ahí

#### Scenario: Doble clic en importar
- **WHEN** el usuario pulsa "Importar libro" dos veces seguidas
- **THEN** se crea un solo libro; mientras importa, el botón muestra "Importando…" y queda deshabilitado

### Requirement: Pegar tarjetas en un capítulo aplana el texto en ese capítulo
Desde la pantalla de un capítulo, el sistema SHALL ofrecer el diálogo "Importar tarjetas" con la misma convención de texto. Todas las tarjetas válidas, pertenezcan al capítulo que pertenezcan dentro del texto, SHALL caer en el capítulo destino: los encabezados `#` SHALL NOT crear capítulos nuevos. Las tarjetas creadas SHALL nacer `forward`, no suspendidas y en estado "nueva", y el contador del libro SHALL subir en el número creado.

#### Scenario: Encabezados ignorados como capítulos
- **WHEN** el usuario pega `# A`, `a | 1`, `# B`, `b | 2` en el capítulo "Verbos"
- **THEN** "Verbos" recibe las 2 tarjetas y no se crea ningún capítulo "A" ni "B"

#### Scenario: Agregar sube el contador
- **WHEN** el usuario importa 3 tarjetas válidas en un capítulo de un libro con `cardCount = 10`
- **THEN** el libro queda con `cardCount = 13`

### Requirement: El modo "agregar" es el predeterminado y no toca las tarjetas existentes
El diálogo SHALL ofrecer dos modos excluyentes: "Agregar a las que ya existen" (predeterminado) y "Reemplazar todas las tarjetas del capítulo". En modo agregar, al confirmar el sistema SHALL crear las importadas directamente, sin confirmación adicional, y SHALL dejar intactas las tarjetas actuales y su progreso.

#### Scenario: Agregar emite directo
- **WHEN** el capítulo tiene 5 tarjetas, el usuario pega `to give up | rendirse` y confirma en modo agregar
- **THEN** se crea la tarjeta sin pedir confirmación extra y las 5 anteriores siguen igual

### Requirement: El modo "reemplazar" borra el capítulo entero antes de crear y pide confirmación explícita
En modo reemplazar, si el capítulo tiene tarjetas, el sistema SHALL mostrar una confirmación extra "¿Reemplazar todas las tarjetas?" que advierte que se borrarán las N tarjetas actuales (o "la tarjeta actual" si es 1) junto con su historial y progreso de estudio, y sugiere editar cada tarjeta con "Editar" si se quiere conservar el progreso, con el botón "Reemplazar todo". Solo al confirmar, el sistema SHALL borrar primero todas las tarjetas actuales del capítulo (en lotes de hasta 450), bajar el contador del libro en esa cantidad, y después crear las importadas y subir el contador en lo creado. Si el capítulo está vacío, SHALL NOT pedirse confirmación extra. Los registros de repaso históricos SHALL NOT borrarse. Cancelar la confirmación SHALL conservar el texto pegado.

#### Scenario: Reemplazar pide confirmación
- **WHEN** el capítulo tiene 5 tarjetas y el usuario confirma en modo reemplazar
- **THEN** no se escribe nada todavía y aparece la confirmación que menciona el progreso y el botón "Editar"

#### Scenario: Reemplazo confirmado
- **WHEN** el capítulo tiene 2 tarjetas, el usuario importa 3 en modo reemplazar y confirma "Reemplazar todo"
- **THEN** quedan solo las 3 importadas y el contador del libro recibe -2 y luego +3

#### Scenario: Capítulo vacío no pide confirmación
- **WHEN** el capítulo no tiene tarjetas y el usuario confirma en modo reemplazar
- **THEN** las importadas se crean directamente, sin borrar nada ni restar al contador

#### Scenario: Cancelar la confirmación
- **WHEN** el usuario cancela la confirmación de reemplazo
- **THEN** no se borra ni crea nada y el texto pegado sigue en el diálogo

#### Scenario: Aviso en singular
- **WHEN** el capítulo tiene exactamente 1 tarjeta
- **THEN** el aviso empieza por "Se borrará la tarjeta actual del capítulo"

### Requirement: La importación no filtra repetidas; el listado las señala después
El sistema SHALL importar todas las tarjetas válidas aunque alguna coincida con una tarjeta ya existente en el capítulo o con otra línea del mismo texto. Tras importar, las coincidencias (mismo anverso y reverso normalizados) SHALL aparecer con el indicador "Repetida" en el listado del capítulo.

#### Scenario: Repetida contra una existente
- **WHEN** el capítulo ya tiene `to give up | rendirse` y el usuario importa esa misma línea en modo agregar
- **THEN** quedan dos tarjetas idénticas y ambas se marcan como repetidas

#### Scenario: Repetida dentro del mismo texto
- **WHEN** el texto pegado trae dos líneas `x | y`
- **THEN** se crean las dos y ambas se marcan como repetidas

### Requirement: La importación en un capítulo comunica su progreso y sus fallos
Mientras importa, el diálogo SHALL mostrar "Importando…" (o "Reemplazando…" en la confirmación de reemplazo), deshabilitar sus botones, ignorar reenvíos y bloquear el cierre con Escape. Si todo va bien, el diálogo SHALL cerrarse y las tarjetas nuevas SHALL aparecer en la lista sin recargar. Si falla, el sistema SHALL mostrar en la pantalla del capítulo "No se pudieron importar las tarjetas. Inténtalo de nuevo." y el diálogo SHALL permanecer abierto con el texto.

#### Scenario: Importación exitosa
- **WHEN** la creación de las tarjetas termina bien
- **THEN** el diálogo se cierra y las tarjetas se ven en el capítulo

#### Scenario: Falla la importación
- **WHEN** la escritura falla
- **THEN** aparece el mensaje de error y el diálogo sigue abierto con el texto pegado
