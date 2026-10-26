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
