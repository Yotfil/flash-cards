# Spec Delta

## MODIFIED Requirements

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
