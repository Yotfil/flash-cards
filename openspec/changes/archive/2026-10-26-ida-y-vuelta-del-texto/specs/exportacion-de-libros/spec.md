# Spec Delta

## MODIFIED Requirements

### Requirement: El texto exportado es el inverso exacto de la convención de importación
El sistema SHALL serializar un libro como texto plano con una línea `# nombre` por cada capítulo, en el orden de los capítulos, seguida de una línea por tarjeta: `anverso | reverso` para una básica, `anverso | reverso :: ejemplo` si tiene ejemplo, y la frase con sus huecos `{{…}}` tal cual para una cloze (con ` :: ejemplo` si lo tiene). Los capítulos SHALL separarse con una línea en blanco, el separador de ejemplo SHALL escribirse siempre con un espacio a cada lado y el texto SHALL terminar en salto de línea LF. Todo capítulo SHALL llevar su encabezado, incluido el único capítulo del libro y los capítulos sin tarjetas. Un capítulo sin nombre (los hay de versiones anteriores) SHALL exportarse como `# Capítulo sin nombre`, para que sus tarjetas no se mezclen con las del capítulo anterior al volver. Las tarjetas del libro cuyo capítulo ya no existe SHALL exportarse al final, bajo un capítulo `# Sin capítulo`, y SHALL contarse en el resumen; si no hay ninguna, ese capítulo no aparece. Al importar el texto exportado SHALL obtenerse el mismo contenido: mismos capítulos en el mismo orden, mismas tarjetas con el mismo tipo, anverso, reverso y ejemplo, salvo las tarjetas que el diálogo de exportar señala como que no volverán igual.

#### Scenario: Libro con dos capítulos
- **WHEN** el libro tiene el capítulo "Movement" con `to give up | rendirse` (ejemplo "I gave up smoking") y `to look after | cuidar`, y el capítulo "Grammar" con la cloze `She {{has lived}} here for 5 years`
- **THEN** el texto es `# Movement`, `to give up | rendirse :: I gave up smoking`, `to look after | cuidar`, línea en blanco, `# Grammar`, `She {{has lived}} here for 5 years`, y termina en salto de línea

#### Scenario: Ida y vuelta
- **WHEN** se exporta un libro y el texto resultante se procesa con la importación
- **THEN** el paquete obtenido tiene los mismos capítulos, en el mismo orden, con las mismas tarjetas (tipo, anverso, reverso y ejemplo) y ninguna línea omitida

#### Scenario: Capítulo único y capítulo vacío
- **WHEN** el libro tiene un único capítulo "Básicos" con una tarjeta y otro capítulo "Pendiente" sin tarjetas
- **THEN** el texto contiene `# Básicos` con su tarjeta y `# Pendiente` sin líneas debajo, y al importarlo nacen los dos capítulos

#### Scenario: Libro sin tarjetas
- **WHEN** el libro tiene capítulos pero ninguna tarjeta, o no tiene capítulos
- **THEN** el texto contiene solo los encabezados que haya (o está vacío), la exportación sigue permitiéndose y, si hay encabezados, al importarlo nacen esos capítulos vacíos

#### Scenario: Capítulo sin nombre
- **WHEN** el libro tiene el capítulo "Básicos" con `hello | hola` y un capítulo sin nombre con `bye | adiós`
- **THEN** el texto contiene `# Capítulo sin nombre` sobre `bye | adiós`, y al importarlo resultan 2 capítulos con una tarjeta cada uno

#### Scenario: Tarjetas que perdieron su capítulo
- **WHEN** el libro tiene el capítulo "Básicos" con una tarjeta y otras dos tarjetas cuyo capítulo ya no existe
- **THEN** el texto termina con `# Sin capítulo` seguido de esas dos tarjetas, y el resumen dice "2 capítulos · 3 tarjetas"

### Requirement: Dentro de un capítulo las tarjetas salen en el orden del listado
El sistema SHALL ordenar las tarjetas de cada capítulo igual que el listado del capítulo (anverso normalizado, luego reverso, luego antigüedad y, al final, el texto tal cual), de modo que dos exportaciones del mismo contenido produzcan el mismo texto.

#### Scenario: Orden estable
- **WHEN** el capítulo tiene `banana | fruta`, `Apple | manzana` y `apple | fruta roja`
- **THEN** las líneas salen en el orden `apple | fruta roja`, `Apple | manzana`, `banana | fruta`

#### Scenario: Repetidas creadas en el mismo instante
- **WHEN** el capítulo tiene `Apple | manzana` y `apple | manzana` con la misma fecha de creación, y el almacén las devuelve una vez en un orden y otra vez en el contrario
- **THEN** las dos exportaciones dan exactamente el mismo texto

### Requirement: Lo que la convención no puede representar se aplana sin inventar sintaxis
Un salto de línea dentro de un anverso, reverso, ejemplo o nombre de capítulo SHALL sustituirse por un espacio. Los campos SHALL recortarse. El sistema SHALL NOT añadir escapes ni marcadores nuevos: un anverso que contenga `|` o una cloze que contenga `|` se escriben tal cual, y es el diálogo de exportar el que señala esas tarjetas antes de entregar el archivo.

#### Scenario: Salto de línea dentro de un campo
- **WHEN** el reverso de una tarjeta es `rendirse` seguido de un salto de línea y `darse por vencido`
- **THEN** la línea exportada es `anverso | rendirse darse por vencido`

#### Scenario: Pipe dentro del anverso
- **WHEN** una tarjeta básica tiene el anverso `a | b` y el reverso `c`
- **THEN** la línea exportada es `a | b | c` y al importarla resulta `front = a` y `back = b | c`

## ADDED Requirements

### Requirement: Antes de entregar, la exportación comprueba su ida y vuelta y nombra lo que no volverá igual
Al preparar la exportación, el sistema SHALL volver a leer el texto exportado con las mismas reglas de la importación y SHALL compararlo con el contenido del libro tal como se escribe (con los saltos de línea ya aplanados, que no cuentan como cambio). Una tarjeta no vuelve igual si al importar su línea se omitiría, cambiaría de anverso, reverso, ejemplo o tipo, se volvería un encabezado de capítulo, o caería en otro capítulo (porque una línea anterior del suyo abre un capítulo nuevo, o porque el encabezado de su capítulo no se puede leer). Si hay alguna, el diálogo SHALL mostrar bajo el resumen "1 tarjeta no volverá igual al importarla:" o "N tarjetas no volverán igual al importarlas:" seguido de la lista de sus anversos, en el orden del texto, con un icono y texto (no solo color) y sin el color de error. La lista SHALL mostrar como mucho las primeras 100 y, si hay más, una última línea "y N más". El aviso SHALL NOT impedir compartir, descargar ni copiar. Si todas vuelven igual, no SHALL mostrarse nada.

#### Scenario: Todo vuelve igual
- **WHEN** el libro solo tiene tarjetas como `to give up | rendirse :: I gave up smoking` y `std::vector | vector dinámico`
- **THEN** el diálogo muestra el resumen y ningún aviso

#### Scenario: Un " :: " dentro del reverso
- **WHEN** el libro tiene `map | map :: (a -> b) -> [a] -> [b]` como anverso y reverso
- **THEN** el diálogo dice "1 tarjeta no volverá igual al importarla:" y la lista nombra "map"

#### Scenario: Tarjetas que empiezan por "#"
- **WHEN** el capítulo "Preprocesador" tiene `#define | define una macro`, `#include | incluye un archivo` y `pragma | directiva del compilador`
- **THEN** el diálogo dice "3 tarjetas no volverán igual al importarlas:" y nombra "#define", "#include" y "pragma" (las dos primeras se volverían capítulos y la tercera caería en uno de ellos)

#### Scenario: Un pipe en el anverso
- **WHEN** el libro tiene una básica con anverso `ls | grep` y reverso `filtra la salida`
- **THEN** el diálogo nombra "ls | grep" entre las que no volverán igual

#### Scenario: Los saltos de línea no cuentan
- **WHEN** la única tarjeta del libro tiene el reverso `rendirse` seguido de un salto de línea y `darse por vencido`
- **THEN** el diálogo no muestra ningún aviso

#### Scenario: El aviso no impide entregar
- **WHEN** el diálogo muestra el aviso y el usuario toca "Descargar .txt"
- **THEN** se descarga el archivo con todas las tarjetas, igual que sin aviso

#### Scenario: Muchas tarjetas que no vuelven
- **WHEN** 150 tarjetas del libro no volverán igual
- **THEN** el aviso dice "150 tarjetas no volverán igual al importarlas:", la lista nombra las primeras 100 y termina con "y 50 más"
