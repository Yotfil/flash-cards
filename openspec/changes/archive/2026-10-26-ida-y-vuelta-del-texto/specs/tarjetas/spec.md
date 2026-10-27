# Spec Delta

## MODIFIED Requirements

### Requirement: El listado del capítulo agrupa por anverso y muestra cada tipo a su manera
El sistema SHALL listar las tarjetas del capítulo, cada una en una fila de acrílico, ordenadas por anverso normalizado, luego por reverso normalizado, en empate por antigüedad (la más vieja primero) y, si aún empatan, por el anverso y el reverso tal cual están escritos, de modo que el orden no dependa de cómo el almacén devuelve las tarjetas. El orden SHALL NOT alterar el orden interno de los datos. Una tarjeta básica SHALL mostrarse como `anverso → reverso`; una cloze SHALL mostrarse con la etiqueta "cloze" y su pregunta compacta (huecos como `[…]`). Cada fila SHALL llevar un menú de acciones con nombre accesible "Acciones de «anverso»" (o de la pregunta compacta) y las opciones Editar, Suspender o Reactivar, y Borrar. Una suspendida SHALL verse atenuada y con la etiqueta "Suspendida"; una con ejemplo SHALL mostrar el icono "Tiene ejemplo".

#### Scenario: Orden alfabético agrupando la misma palabra
- **WHEN** el capítulo tiene `banana | fruta`, `Apple | manzana` y `apple | fruta roja`
- **THEN** el orden mostrado es `apple | fruta roja`, `Apple | manzana`, `banana | fruta`

#### Scenario: Desempate por antigüedad
- **WHEN** dos tarjetas tienen el mismo anverso y reverso
- **THEN** la creada antes se muestra primero

#### Scenario: Desempate final por el texto
- **WHEN** `Apple | manzana` y `apple | manzana` se crearon en el mismo instante
- **THEN** salen siempre en el mismo orden, venga como venga del almacén

#### Scenario: Vista de una cloze
- **WHEN** una tarjeta cloze tiene `front = El {{gato}} es {{negro}}`
- **THEN** el listado muestra la etiqueta "cloze" y el texto `El […] es […]`

#### Scenario: Menú de acciones nombrado
- **WHEN** un lector de pantalla enfoca el menú de la tarjeta «to give up»
- **THEN** anuncia "Acciones de «to give up»" y, al abrirlo, ofrece Editar, Suspender y Borrar
