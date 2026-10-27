# Spec Delta

## MODIFIED Requirements

### Requirement: La previsualización es obligatoria, en vivo y sin escribir nada
El sistema SHALL procesar el texto en memoria cada vez que el usuario escribe, pega o carga un archivo, y SHALL mostrar antes de confirmar, con plural real: el número de tarjetas válidas ("1 tarjeta", "4 tarjetas"), el número de capítulos detectados al importar un libro ("1 capítulo", "2 capítulos"), el número de repetidas si es mayor que cero ("1 repetida", "3 repetidas") y la lista de líneas que se omitirán, encabezada por "1 línea se omitirá:" o "N líneas se omitirán:" y con el formato "Línea N: motivo". El conteo de líneas omitidas SHALL ser siempre el total exacto, pero la lista SHALL mostrar como mucho las primeras 100 y, si hay más, una última línea "y N más", para que un archivo equivocado de miles de líneas no congele la pantalla. Las líneas omitidas SHALL distinguirse por icono y texto, nunca solo por color, y SHALL NOT usar el color de la calificación "Otra vez". Al importar un libro, la previsualización SHALL nombrar además cada capítulo detectado con su número de tarjetas ("Unidad 1 · 24"), en orden de aparición y bajo el título "Tarjetas por capítulo"; con más de 5 capítulos esa lista SHALL mostrarse plegada, y el usuario la despliega al tocar el título. Al pegar en un capítulo no se nombran capítulos. El botón de confirmar SHALL mostrar "Importar N" con el número de tarjetas válidas y SHALL permanecer deshabilitado mientras ese número sea 0, salvo al importar un libro cuyo texto tiene capítulos y ninguna tarjeta: entonces SHALL decir "Importar 1 capítulo" o "Importar N capítulos" y SHALL estar habilitado (es el esqueleto de un libro, por ejemplo el que se exporta sin tarjetas). El sistema SHALL NOT escribir nada en el almacén hasta que el usuario confirme.

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

#### Scenario: Un archivo equivocado de miles de líneas
- **WHEN** el usuario carga un archivo con 20000 líneas sin separador
- **THEN** se muestra "20000 líneas se omitirán:", la lista tiene las 100 primeras ("Línea 1: …" a "Línea 100: …") y termina con "y 19900 más"

#### Scenario: Capítulos nombrados con sus tarjetas
- **WHEN** el usuario importa un libro con `# Unidad 1` y dos tarjetas, y `# Unidad 2` sin tarjetas
- **THEN** la previsualización muestra "Tarjetas por capítulo" con "Unidad 1 · 2" y "Unidad 2 · 0"

#### Scenario: Un "#" de más se ve en la lista
- **WHEN** el texto de un libro tiene `# Preprocesador`, `#include | incluye un archivo` y `pragma | directiva`
- **THEN** la previsualización nombra los capítulos "Preprocesador · 0" e "include | incluye un archivo · 1"

#### Scenario: Muchos capítulos, lista plegada
- **WHEN** el texto de un libro tiene 12 capítulos
- **THEN** la lista "Tarjetas por capítulo" aparece plegada y, al desplegarla, nombra los 12

#### Scenario: Libro solo con capítulos
- **WHEN** el usuario importa un libro cuyo texto es `# Unidad 1`, `# Unidad 2` y nada más
- **THEN** la previsualización dice "2 capítulos · 0 tarjetas" y el botón "Importar 2 capítulos" está habilitado

#### Scenario: En un capítulo, los encabezados no cuentan
- **WHEN** el usuario pega solo `# A` y `# B` en el diálogo "Importar tarjetas" de un capítulo
- **THEN** el botón de confirmar está deshabilitado

### Requirement: Importar un archivo crea un libro nuevo con capítulos y tarjetas en estado "nueva"
La página "Importar un libro" SHALL pedir el nombre y una materia opcional con la pista "Si la dejas vacía, será «general»", con las mismas reglas que el diálogo "Nuevo libro". Al confirmar, el sistema SHALL crear un libro con: nombre = el escrito recortado, o "Libro importado" si quedó vacío; `subject` = la materia recortada, o `general` si quedó vacía; `studyDirection = forward`; `newCardsPerDay` = el valor por defecto del usuario en Ajustes (20 si no lo ha cambiado); `maxReviewsPerDay = 200`; `order` = el siguiente al último libro de la biblioteca; `cardCount` = el número de tarjetas válidas. SHALL crear un capítulo por cada capítulo detectado, en orden de aparición (`order` 0, 1, 2…), también los que no tienen tarjetas, y cada tarjeta como `forward`, no suspendida, con `noteId` propio, su ejemplo si lo trae, y programación inicial en estado "nueva". El capítulo por defecto SHALL llevar el nombre del libro.

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

#### Scenario: El esqueleto de un libro
- **WHEN** el usuario importa "Francés A1" con 8 encabezados de capítulo y ninguna tarjeta
- **THEN** se crea el libro con `cardCount = 0` y sus 8 capítulos vacíos en orden, y el usuario ve la pantalla del libro nuevo

### Requirement: La importación no filtra repetidas; el listado las señala después
El sistema SHALL importar todas las tarjetas válidas aunque alguna coincida con una tarjeta ya existente en el capítulo o con otra línea del mismo texto. Antes de confirmar, la previsualización SHALL contar como repetidas las líneas válidas que tienen otra igual (mismo anverso y reverso normalizados) dentro del texto o entre las tarjetas del capítulo destino ya cargadas; al importar un libro, solo dentro de cada capítulo del texto, que es donde el listado las marcará. El contador SHALL ir acompañado de "Se importarán igual. Las verás marcadas como repetidas." y SHALL NOT deshabilitar el botón. Tras importar, las coincidencias SHALL aparecer con el indicador "Repetida" en el listado del capítulo.

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

#### Scenario: La misma línea en dos capítulos del libro
- **WHEN** el usuario importa un libro con `# Unidad 1`, `to get | conseguir`, `# Unidad 5`, `to get | conseguir`
- **THEN** la previsualización no muestra repetidas, porque cada capítulo tiene solo una y el listado no marcará ninguna
