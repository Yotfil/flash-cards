# Exportación de libros Specification

## Purpose

Permitir que el usuario saque un libro de Cadence como un archivo de texto plano que la propia importación entiende sin cambios: el inverso exacto de la convención de importación (`# Capítulo`, `anverso | reverso :: ejemplo`, líneas cloze). Se exporta el contenido, nunca el progreso: ni programación, ni historial de repasos, ni estado de suspensión. Sirve como respaldo personal y como forma de pasar un libro a otra cuenta o a otra persona, por la hoja de compartir del dispositivo o por descarga.

Capacidad nueva (no existe en v0.1.1), propuesta el 2026-10-22 en el explore de `libros` y diseñada el 2026-10-24 en su propio explore. Se apoya en el "paquete de libro" que produce el parser de `importacion`: el mismo tipo viaja en las dos direcciones, y la prueba de ida y vuelta (exportar → importar → paquete idéntico) protege la gramática común.

## Requirements

### Requirement: El texto exportado es el inverso exacto de la convención de importación
El sistema SHALL serializar un libro como texto plano con una línea `# nombre` por cada capítulo, en el orden de los capítulos, seguida de una línea por tarjeta: `anverso | reverso` para una básica, `anverso | reverso :: ejemplo` si tiene ejemplo, y la frase con sus huecos `{{…}}` tal cual para una cloze (con ` :: ejemplo` si lo tiene). Los capítulos SHALL separarse con una línea en blanco, el separador de ejemplo SHALL escribirse siempre con un espacio a cada lado y el texto SHALL terminar en salto de línea LF. Todo capítulo SHALL llevar su encabezado, incluido el único capítulo del libro y los capítulos sin tarjetas. Las tarjetas del libro cuyo capítulo ya no existe SHALL exportarse al final, bajo un capítulo `# Sin capítulo`, y SHALL contarse en el resumen; si no hay ninguna, ese capítulo no aparece. Al importar el texto exportado SHALL obtenerse el mismo contenido: mismos capítulos en el mismo orden, mismas tarjetas con el mismo tipo, anverso, reverso y ejemplo.

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
- **THEN** el texto contiene solo los encabezados que haya (o está vacío) y la exportación sigue permitiéndose

#### Scenario: Tarjetas que perdieron su capítulo
- **WHEN** el libro tiene el capítulo "Básicos" con una tarjeta y otras dos tarjetas cuyo capítulo ya no existe
- **THEN** el texto termina con `# Sin capítulo` seguido de esas dos tarjetas, y el resumen dice "2 capítulos · 3 tarjetas"

### Requirement: Se exporta el contenido, no el progreso
El texto SHALL contener únicamente nombre de capítulo, tipo, anverso, reverso y ejemplo de cada tarjeta. SHALL NOT contener programación, historial, fechas, identificadores, materia del libro ni el estado de suspensión. Las tarjetas suspendidas SHALL exportarse como las demás. El nombre del libro SHALL viajar en el nombre del archivo, no dentro del texto.

#### Scenario: Suspendidas incluidas
- **WHEN** el libro tiene 3 tarjetas y una está suspendida
- **THEN** el texto tiene las 3 líneas de tarjeta, sin ninguna marca de suspensión

#### Scenario: Sin rastro del progreso
- **WHEN** una tarjeta exportada está en estado "repaso" con 12 repeticiones
- **THEN** su línea es idéntica a la de una tarjeta nueva con el mismo contenido

### Requirement: Dentro de un capítulo las tarjetas salen en el orden del listado
El sistema SHALL ordenar las tarjetas de cada capítulo igual que el listado del capítulo (anverso normalizado, luego reverso), de modo que dos exportaciones del mismo contenido produzcan el mismo texto.

#### Scenario: Orden estable
- **WHEN** el capítulo tiene `banana | fruta`, `Apple | manzana` y `apple | fruta roja`
- **THEN** las líneas salen en el orden `apple | fruta roja`, `Apple | manzana`, `banana | fruta`

### Requirement: Lo que la convención no puede representar se aplana sin inventar sintaxis
Un salto de línea dentro de un anverso, reverso, ejemplo o nombre de capítulo SHALL sustituirse por un espacio. Los campos SHALL recortarse. El sistema SHALL NOT añadir escapes ni marcadores nuevos: un anverso que contenga `|` o una cloze que contenga `|` se escriben tal cual, y es la previsualización de la importación la que señala esas líneas al volver.

#### Scenario: Salto de línea dentro de un campo
- **WHEN** el reverso de una tarjeta es `rendirse` seguido de un salto de línea y `darse por vencido`
- **THEN** la línea exportada es `anverso | rendirse darse por vencido`

#### Scenario: Pipe dentro del anverso
- **WHEN** una tarjeta básica tiene el anverso `a | b` y el reverso `c`
- **THEN** la línea exportada es `a | b | c` y al importarla resulta `front = a` y `back = b | c`

### Requirement: Exportar se ofrece desde el detalle del libro y abre un diálogo con resumen
La cabecera del detalle del libro SHALL mostrar, junto al botón de ajustes, un botón de icono "Exportar" con el nombre accesible "Exportar «nombre del libro»". Al tocarlo, el sistema SHALL abrir el diálogo "Exportar «nombre»", leer todas las tarjetas del libro desde el servidor y mostrar un resumen con plural real ("2 capítulos · 40 tarjetas") antes de ofrecer la entrega. Mientras lee, el resumen SHALL mostrarse como esqueleto y las acciones SHALL estar deshabilitadas. Si la lectura falla, el diálogo SHALL mostrar "No pudimos cargar las tarjetas del libro." con un botón "Reintentar" y sin acciones de entrega. Cancelar SHALL cerrar sin efecto en cualquier estado.

#### Scenario: Abrir el diálogo
- **WHEN** el usuario toca "Exportar" en un libro con 2 capítulos y 40 tarjetas
- **THEN** se abre "Exportar «Phrasal Verbs»", muestra "2 capítulos · 40 tarjetas" y las acciones de entrega

#### Scenario: Falla la lectura
- **WHEN** la lectura de las tarjetas falla
- **THEN** el diálogo muestra "No pudimos cargar las tarjetas del libro." y "Reintentar", sin botón de compartir, descargar ni copiar

#### Scenario: Reintentar tras el fallo
- **WHEN** el usuario toca "Reintentar" y la lectura termina bien
- **THEN** aparece el resumen y las acciones de entrega

#### Scenario: Resumen en singular
- **WHEN** el libro tiene 1 capítulo y 1 tarjeta
- **THEN** el resumen dice "1 capítulo · 1 tarjeta"

### Requirement: La entrega principal es compartir cuando el dispositivo puede, y descargar cuando no
El diálogo SHALL ofrecer una única acción principal: "Compartir", si el navegador puede compartir archivos, que abre la hoja de compartir del sistema con el archivo `nombre del libro.txt` (texto plano UTF-8); o "Descargar .txt", si no puede, que descarga ese mismo archivo. Cuando la principal es "Compartir", "Descargar .txt" SHALL ofrecerse además como acción secundaria, para guardar el archivo en el dispositivo (en el escritorio, la hoja de compartir no guarda en el disco). Si el usuario cierra la hoja de compartir sin elegir destino, el sistema SHALL NOT tratarlo como error: el diálogo sigue abierto, sin mensaje. Si compartir o descargar fallan por otra causa, el diálogo SHALL mostrar "No se pudo exportar el libro. Inténtalo de nuevo." y SHALL permanecer abierto. Tras una entrega con éxito el diálogo SHALL cerrarse.

#### Scenario: Compartir en un dispositivo que puede
- **WHEN** el navegador puede compartir archivos y el usuario toca "Compartir"
- **THEN** se abre la hoja de compartir del sistema con un archivo "Phrasal Verbs.txt" cuyo contenido es el texto exportado, y al completarse el diálogo se cierra

#### Scenario: Descargar también donde se puede compartir
- **WHEN** el navegador puede compartir archivos y el usuario toca "Descargar .txt"
- **THEN** se descarga "Phrasal Verbs.txt" con el texto exportado y el diálogo se cierra

#### Scenario: Descargar donde no se puede compartir
- **WHEN** el navegador no puede compartir archivos
- **THEN** la acción principal es "Descargar .txt", no se ofrece "Compartir", y al tocarla se descarga "Phrasal Verbs.txt" con el texto exportado y el diálogo se cierra

#### Scenario: El usuario cancela la hoja de compartir
- **WHEN** el usuario cierra la hoja de compartir sin elegir destino
- **THEN** el diálogo sigue abierto, sin mensaje de error

#### Scenario: Falla la entrega
- **WHEN** compartir falla por una causa distinta a la cancelación
- **THEN** aparece "No se pudo exportar el libro. Inténtalo de nuevo." dentro del diálogo y las acciones vuelven a estar disponibles

#### Scenario: Nombre de archivo seguro
- **WHEN** el libro se llama `Verbos: básicos / avanzados`
- **THEN** el archivo se llama `Verbos básicos avanzados.txt` (sin los caracteres que un sistema de archivos rechaza) y el nombre dentro de la app no cambia

### Requirement: "Copiar texto" deja el texto exportado en el portapapeles
El diálogo SHALL ofrecer como acción secundaria "Copiar texto", que copia el texto exportado completo al portapapeles y confirma con "Copiado" en la misma línea durante unos segundos, sin cerrar el diálogo. Si el portapapeles no está disponible, el sistema SHALL mostrar "No se pudo copiar. Usa «Descargar .txt»." dentro del diálogo.

#### Scenario: Copiar
- **WHEN** el usuario toca "Copiar texto"
- **THEN** el portapapeles contiene el texto exportado, aparece "Copiado" y el diálogo sigue abierto

#### Scenario: Portapapeles no disponible
- **WHEN** el navegador rechaza la escritura en el portapapeles
- **THEN** aparece "No se pudo copiar. Usa «Descargar .txt»." y el diálogo sigue abierto

### Requirement: Exportar necesita conexión porque lee el libro completo del servidor
La lectura de las tarjetas para exportar SHALL ir siempre al servidor y SHALL NOT aceptar como respuesta la caché local, porque la caché puede tener solo parte del libro y un archivo incompleto que parece completo es peor que ninguno. Sin conexión, el botón "Exportar" de la cabecera SHALL estar deshabilitado con el texto "Necesitas conexión para exportar." y SHALL habilitarse al volver la conexión. Si la conexión se pierde con el diálogo abierto antes de leer, la lectura SHALL fallar con el mismo estado de error que cualquier otro fallo de lectura.

#### Scenario: Sin conexión
- **WHEN** no hay conexión y el usuario está en el detalle del libro
- **THEN** el botón "Exportar" está deshabilitado y muestra "Necesitas conexión para exportar."

#### Scenario: Vuelve la conexión
- **WHEN** vuelve la conexión
- **THEN** el botón "Exportar" se habilita sin recargar

#### Scenario: La caché no basta
- **WHEN** el dispositivo tiene en caché 30 de las 40 tarjetas del libro y hay conexión
- **THEN** el texto exportado tiene las 40 tarjetas
