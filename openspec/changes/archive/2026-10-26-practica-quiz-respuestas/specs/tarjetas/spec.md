# Spec Delta

## MODIFIED Requirements

### Requirement: Las tarjetas repetidas se detectan por anverso y reverso normalizados y se señalan sin bloquear
El sistema SHALL considerar repetidas a las tarjetas que comparten anverso Y reverso tras normalizar. Normalizar SHALL ser: recortar, pasar a minúsculas, colapsar espacios múltiples en uno, tratar los apóstrofos tipográficos (’ ‘ ʼ) como el apóstrofo recto (') y las comillas tipográficas (“ ”) como las rectas ("), y tratar igual una letra con tilde escrita de una pieza o como letra seguida de la tilde aparte. La normalización solo sirve para comparar y ordenar: el texto guardado y el que se muestra NO SHALL cambiar. El sistema SHALL marcar a TODAS las tarjetas del grupo repetido, no solo a las copias. Dos tarjetas con el mismo anverso y distinto reverso NO son repetidas. El sistema SHALL NOT impedir crear ni importar una repetida: la señala en el listado con un indicador accesible ("Tarjeta repetida") cuyo texto "Repetida" se muestra al pasar el cursor o al tocarlo.

#### Scenario: Normalización
- **WHEN** el texto es `  To   Give  Up `
- **THEN** su forma normalizada es `to give up`

#### Scenario: Normalización de apóstrofos y comillas
- **WHEN** el texto es `Don’t say “yes”`
- **THEN** su forma normalizada es `don't say "yes"`, y la tarjeta se sigue mostrando como `Don’t say “yes”`

#### Scenario: Repetidas con distinta capitalización y espacios
- **WHEN** existen `to give up | rendirse` y `To Give Up |   rendirse ` y `to wake up | despertarse`
- **THEN** las dos primeras se marcan como repetidas y la tercera no

#### Scenario: Repetidas con apóstrofo tipográfico
- **WHEN** existen `don’t | no hacer` (copiada de un documento) y `don't | no hacer` (escrita en el teclado)
- **THEN** las dos se marcan como repetidas

#### Scenario: Repetidas con la tilde escrita aparte
- **WHEN** existen `I gave up | me rendí` con la tilde como carácter aparte (copiada de un PDF) y `I gave up | me rendí` tecleada
- **THEN** las dos se marcan como repetidas

#### Scenario: Doble traducción intencional
- **WHEN** existen `get | obtener` y `get | llegar`
- **THEN** ninguna se marca como repetida

#### Scenario: Tres idénticas
- **WHEN** existen tres tarjetas `x | y`
- **THEN** las tres se marcan como repetidas

#### Scenario: Crear una repetida
- **WHEN** el usuario crea una tarjeta idéntica a una existente
- **THEN** la tarjeta se crea igualmente y ambas aparecen con el indicador "Repetida"

### Requirement: Al crear, el formulario avisa de una tarjeta repetida sin impedir guardarla
Mientras el usuario escribe en el formulario "Nueva tarjeta", el sistema SHALL comparar anverso y reverso normalizados (la misma normalización que detecta las repetidas del listado) con las tarjetas ya cargadas del capítulo abierto y, si existe una igual, SHALL mostrar bajo los campos el aviso "Ya tienes una tarjeta igual en este capítulo." El aviso NO SHALL deshabilitar el botón de guardar ni consultar el almacén. En modo "Editar tarjeta" NO SHALL mostrarse aviso. Las repeticiones en otros capítulos o libros NO se comprueban.

#### Scenario: Repetida al escribir
- **WHEN** el capítulo tiene `to give up | rendirse` y el usuario escribe `To Give Up` y ` rendirse ` en el formulario de crear
- **THEN** aparece "Ya tienes una tarjeta igual en este capítulo." y "Crear tarjeta" sigue habilitado

#### Scenario: Repetida con otro apóstrofo
- **WHEN** el capítulo tiene `don’t | no hacer` y el usuario escribe `don't` y `no hacer`
- **THEN** aparece "Ya tienes una tarjeta igual en este capítulo."

#### Scenario: Mismo anverso con otro reverso
- **WHEN** el capítulo tiene `get | obtener` y el usuario escribe `get` y `llegar`
- **THEN** no aparece ningún aviso

#### Scenario: Guardar una repetida avisada
- **WHEN** el usuario confirma con el aviso visible
- **THEN** la tarjeta se crea y ambas aparecen en el listado con el indicador "Repetida"

#### Scenario: Sin aviso al editar
- **WHEN** el usuario edita una tarjeta y la deja igual que otra del capítulo
- **THEN** el formulario no muestra el aviso y guarda; el listado marcará a ambas como repetidas
