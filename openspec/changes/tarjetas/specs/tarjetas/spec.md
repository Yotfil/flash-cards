## ADDED Requirements

### Requirement: Una tarjeta se puede suspender y reactivar desde el listado sin perder nada
El sistema SHALL ofrecer en cada tarjeta del listado la acción "Suspender" si está activa y "Reactivar" si está suspendida. La acción SHALL guardarse al tocar, sin confirmación; mientras guarda, la fila SHALL quedar ocupada y sus acciones deshabilitadas; si el guardado falla, la tarjeta SHALL volver a su estado anterior y mostrar junto a la fila, como alerta accesible, "No se pudo guardar. Inténtalo de nuevo.". Una tarjeta suspendida SHALL seguir en su lugar del listado, atenuada y con la etiqueta de texto "Suspendida"; SHALL seguir contando en el número de tarjetas del libro, del capítulo y de los totales; SHALL poder editarse y borrarse; y SHALL conservar intacto su bloque de programación. Suspender solo cambia `suspended` y la fecha de actualización.

#### Scenario: Suspender
- **WHEN** el usuario elige "Suspender" en la tarjeta «to give up»
- **THEN** la tarjeta queda con `suspended = true`, sigue en el listado atenuada con la etiqueta "Suspendida", su acción pasa a "Reactivar" y su programación no cambia

#### Scenario: Reactivar
- **WHEN** el usuario elige "Reactivar" en una tarjeta suspendida
- **THEN** la tarjeta queda con `suspended = false` y la etiqueta desaparece

#### Scenario: Falla al suspender
- **WHEN** la persistencia falla al suspender
- **THEN** la tarjeta vuelve a mostrarse activa y junto a ella aparece "No se pudo guardar. Inténtalo de nuevo."

#### Scenario: Las suspendidas siguen contando
- **WHEN** un capítulo con 42 tarjetas tiene 3 suspendidas
- **THEN** el capítulo sigue mostrando "42 tarjetas" y el `cardCount` del libro no cambia

### Requirement: Al crear, el formulario avisa de una tarjeta repetida sin impedir guardarla
Mientras el usuario escribe en el formulario "Nueva tarjeta", el sistema SHALL comparar anverso y reverso normalizados (recortar, minúsculas, espacios colapsados) con las tarjetas ya cargadas del capítulo abierto y, si existe una igual, SHALL mostrar bajo los campos el aviso "Ya tienes una tarjeta igual en este capítulo." El aviso NO SHALL deshabilitar el botón de guardar ni consultar el almacén. En modo "Editar tarjeta" NO SHALL mostrarse aviso. Las repeticiones en otros capítulos o libros NO se comprueban.

#### Scenario: Repetida al escribir
- **WHEN** el capítulo tiene `to give up | rendirse` y el usuario escribe `To Give Up` y ` rendirse ` en el formulario de crear
- **THEN** aparece "Ya tienes una tarjeta igual en este capítulo." y "Crear tarjeta" sigue habilitado

#### Scenario: Mismo anverso con otro reverso
- **WHEN** el capítulo tiene `get | obtener` y el usuario escribe `get` y `llegar`
- **THEN** no aparece ningún aviso

#### Scenario: Guardar una repetida avisada
- **WHEN** el usuario confirma con el aviso visible
- **THEN** la tarjeta se crea y ambas aparecen en el listado con el indicador "Repetida"

#### Scenario: Sin aviso al editar
- **WHEN** el usuario edita una tarjeta y la deja igual que otra del capítulo
- **THEN** el formulario no muestra el aviso y guarda; el listado marcará a ambas como repetidas

### Requirement: El formulario ofrece el ejemplo tras "Más opciones" y lo omite si queda vacío
El formulario de tarjeta SHALL mostrar anverso y reverso (o el texto con huecos) como campos protagonistas y, debajo, un botón "Más opciones" que despliega un único campo opcional "Ejemplo" (hasta 2000 caracteres), tanto en tarjetas básicas como cloze. Al editar una tarjeta que ya tiene ejemplo, la sección SHALL aparecer desplegada. Al guardar, el ejemplo SHALL recortarse; si queda vacío, el campo `example` NO SHALL guardarse y, al editar, SHALL eliminarse del documento. En el listado, una tarjeta con ejemplo SHALL mostrar solo un icono con el nombre accesible "Tiene ejemplo", sin el texto del ejemplo.

#### Scenario: Crear con ejemplo
- **WHEN** el usuario despliega "Más opciones", escribe ` She gave up smoking. ` y confirma
- **THEN** la tarjeta se guarda con `example = She gave up smoking.` y su fila muestra el icono "Tiene ejemplo"

#### Scenario: Ejemplo en blanco no se guarda
- **WHEN** el usuario despliega "Más opciones", deja el ejemplo con solo espacios y confirma
- **THEN** la tarjeta guardada no contiene `example` y la fila no muestra el icono

#### Scenario: Vaciar el ejemplo al editar
- **WHEN** el usuario edita una tarjeta con ejemplo, borra el texto del ejemplo y guarda
- **THEN** el documento deja de tener `example`

#### Scenario: Editar una tarjeta con ejemplo
- **WHEN** el usuario abre a editar una tarjeta que tiene ejemplo
- **THEN** la sección "Más opciones" aparece desplegada con el ejemplo precargado

### Requirement: Sin conexión, las acciones que guardan tarjetas no se ofrecen
Mientras no haya conexión, el sistema SHALL deshabilitar "Nueva tarjeta", "Seleccionar", las acciones Editar, Suspender/Reactivar y Borrar de cada fila, y el botón principal de los diálogos de tarjeta abiertos, mostrando dentro del diálogo "Necesitas conexión para guardar cambios."; "Cancelar" y Escape SHALL seguir cerrando. La lista ya leída SHALL seguir visible. Al volver la conexión, todo SHALL habilitarse sin cerrar el diálogo ni perder lo escrito.

#### Scenario: Crear sin conexión
- **WHEN** no hay conexión y el usuario tiene abierto "Nueva tarjeta" con anverso y reverso válidos
- **THEN** "Crear tarjeta" está deshabilitado, el diálogo muestra "Necesitas conexión para guardar cambios." y "Cancelar" lo cierra sin crear nada

#### Scenario: Listado sin conexión
- **WHEN** no hay conexión y el usuario abre el capítulo
- **THEN** la lista ya leída se muestra y "Nueva tarjeta", "Seleccionar" y las acciones de cada fila están deshabilitadas

#### Scenario: Vuelve la conexión
- **WHEN** el diálogo está abierto sin conexión con texto escrito y vuelve la conexión
- **THEN** el botón principal se habilita, el texto sigue y el diálogo no se cierra

## MODIFIED Requirements

### Requirement: El modelo reserva campos opcionales futuros sin exponerlos en la UI
El sistema SHALL admitir en la tarjeta los campos opcionales `pronunciation`, `example`, `audioUrl`, `notes` y `tags`. El formulario SHALL exponer anverso y reverso (o el texto con huecos) y, tras "Más opciones", únicamente `example`; `pronunciation`, `audioUrl`, `notes` y `tags` siguen sin interfaz. Un campo opcional ausente SHALL omitirse por completo (no se guarda vacío ni nulo) y, si está presente en el almacén, SHALL conservarse al leer la tarjeta y al editarla.

#### Scenario: Tarjeta nueva sin campos futuros
- **WHEN** el usuario crea una tarjeta sin desplegar "Más opciones"
- **THEN** la tarjeta guardada no contiene `pronunciation`, `example`, `audioUrl`, `notes` ni `tags`

#### Scenario: Tarjeta con campos futuros ya presentes
- **WHEN** una tarjeta del almacén trae `pronunciation` y `tags` y el usuario edita su reverso
- **THEN** el sistema conserva `pronunciation` y `tags` en la tarjeta leída y en la guardada, aunque la UI no los muestre

### Requirement: El formulario de tarjeta básica exige anverso y reverso
El sistema SHALL ofrecer un diálogo "Nueva tarjeta" con los campos Anverso y Reverso, ambos obligatorios tras recortar espacios y de hasta 2000 caracteres. El sistema SHALL recortar los espacios de ambos extremos antes de guardar. Mientras el formulario sea inválido, el botón "Crear tarjeta" SHALL permanecer deshabilitado y, si un campo fue tocado, SHALL mostrar su mensaje ("El anverso es obligatorio." / "El reverso es obligatorio."). La tarjeta SHALL crearse siempre en el capítulo abierto.

#### Scenario: Creación válida con espacios sobrantes
- **WHEN** el usuario escribe `  to give up ` en Anverso y ` rendirse  ` en Reverso y confirma
- **THEN** se crea una tarjeta básica con `front = to give up` y `back = rendirse` en el capítulo abierto

#### Scenario: Reverso vacío
- **WHEN** el usuario deja el Reverso vacío o con solo espacios y lo abandona
- **THEN** "Crear tarjeta" está deshabilitado y se muestra "El reverso es obligatorio."

#### Scenario: Texto demasiado largo
- **WHEN** el anverso supera los 2000 caracteres
- **THEN** el formulario es inválido y no permite guardar

### Requirement: Editar una tarjeta cambia su contenido, pero no su tipo ni su programación
El sistema SHALL abrir el mismo diálogo en modo "Editar tarjeta" con los campos precargados y el botón "Guardar". En edición el selector de tipo SHALL NOT mostrarse: el tipo de la tarjeta queda fijo. Al guardar, el sistema SHALL actualizar únicamente el contenido (`front`, `back`, `example`) y la fecha de actualización, dejando intactos el bloque de programación, `suspended` y los demás campos, y SHALL reflejar el cambio en la lista sin recargar. Tocar la fila de una tarjeta fuera de su menú SHALL abrir este diálogo.

#### Scenario: Editar una básica
- **WHEN** el usuario edita una tarjeta básica y cambia su reverso
- **THEN** la lista muestra el nuevo reverso y la tarjeta conserva su estado, vencimiento, repeticiones y `suspended`

#### Scenario: Editar una cloze
- **WHEN** el usuario abre a editar una tarjeta cloze
- **THEN** el diálogo muestra el campo "Texto con huecos" precargado y no ofrece cambiar el tipo

#### Scenario: Tocar la fila
- **WHEN** el usuario toca la fila de una tarjeta fuera de su menú de acciones
- **THEN** se abre "Editar tarjeta" con esa tarjeta precargada

### Requirement: Borrar una tarjeta pide confirmación y descuenta el contador del libro
El sistema SHALL pedir confirmación antes de borrar en un diálogo "¿Borrar esta tarjeta?" que muestra el anverso (o la pregunta compacta si es cloze) y dice "Se pierde su progreso de estudio. No se puede deshacer.", con "Cancelar" y "Borrar". Al confirmar, la tarjeta SHALL desaparecer de la lista y el contador de tarjetas del libro SHALL bajar en 1 en la misma escritura. Mientras borra, el botón SHALL mostrar "Borrando…". Si el borrado falla, el diálogo SHALL permanecer abierto mostrando "No se pudo borrar la tarjeta. Inténtalo de nuevo." y la tarjeta SHALL seguir en la lista. Al cancelar, nada cambia. Los registros de repaso NO SHALL tocarse.

#### Scenario: Borrado confirmado
- **WHEN** el usuario confirma el borrado de «to give up»
- **THEN** la tarjeta ya no aparece en el capítulo, el `cardCount` del libro baja en 1 y sus registros de repaso siguen existiendo

#### Scenario: Borrado cancelado
- **WHEN** el usuario cancela la confirmación
- **THEN** la tarjeta sigue en el capítulo y el contador no cambia

#### Scenario: Falla el borrado
- **WHEN** el almacén rechaza el borrado
- **THEN** el diálogo sigue abierto con "No se pudo borrar la tarjeta. Inténtalo de nuevo." y el usuario puede reintentar o cancelar

### Requirement: El contador de tarjetas del libro se ajusta de forma relativa en cada alta y baja
El sistema SHALL mantener en el libro un `cardCount` denormalizado que sube en 1 al crear una tarjeta, baja en 1 al borrarla, sube en N al crear N de golpe y baja en N al borrar N de golpe. El ajuste SHALL ser relativo (incremento) y no una reescritura del total, para que escrituras concurrentes no se pisen, y SHALL ir en la misma escritura atómica que las tarjetas; en operaciones por lotes, cada lote SHALL llevar exactamente el ajuste de las tarjetas que contiene. La Biblioteca SHALL reflejar el cambio sin recargar, y la siguiente lectura de la Biblioteca SHALL corregir cualquier desfase del valor mostrado.

#### Scenario: Alta individual
- **WHEN** el usuario crea una tarjeta en un libro con `cardCount = 10`
- **THEN** el libro pasa a `cardCount = 11`

#### Scenario: Alta masiva
- **WHEN** se crean 3 tarjetas de golpe
- **THEN** el contador del libro sube exactamente 3

#### Scenario: Baja masiva
- **WHEN** se borran 2 tarjetas seleccionadas
- **THEN** el contador del libro baja exactamente 2

#### Scenario: Lista vacía no toca el contador
- **WHEN** se pide crear o borrar una lista vacía de tarjetas
- **THEN** no se escribe nada y el contador no cambia

#### Scenario: Fallo a mitad de un borrado masivo
- **WHEN** el borrado de 900 tarjetas falla después del primer lote de 448
- **THEN** el libro ha bajado exactamente 448 y las 452 restantes siguen existiendo; reintentar borra lo que quede

### Requirement: El listado del capítulo agrupa por anverso y muestra cada tipo a su manera
El sistema SHALL listar las tarjetas del capítulo, cada una en una fila de acrílico, ordenadas por anverso normalizado, luego por reverso normalizado y, en empate, por antigüedad (la más vieja primero), sin alterar el orden interno de los datos. Una tarjeta básica SHALL mostrarse como `anverso → reverso`; una cloze SHALL mostrarse con la etiqueta "cloze" y su pregunta compacta (huecos como `[…]`). Cada fila SHALL llevar un menú de acciones con nombre accesible "Acciones de «anverso»" (o de la pregunta compacta) y las opciones Editar, Suspender o Reactivar, y Borrar. Una suspendida SHALL verse atenuada y con la etiqueta "Suspendida"; una con ejemplo SHALL mostrar el icono "Tiene ejemplo".

#### Scenario: Orden alfabético agrupando la misma palabra
- **WHEN** el capítulo tiene `banana | fruta`, `Apple | manzana` y `apple | fruta roja`
- **THEN** el orden mostrado es `apple | fruta roja`, `Apple | manzana`, `banana | fruta`

#### Scenario: Desempate por antigüedad
- **WHEN** dos tarjetas tienen el mismo anverso y reverso
- **THEN** la creada antes se muestra primero

#### Scenario: Vista de una cloze
- **WHEN** una tarjeta cloze tiene `front = El {{gato}} es {{negro}}`
- **THEN** el listado muestra la etiqueta "cloze" y el texto `El […] es […]`

#### Scenario: Menú de acciones nombrado
- **WHEN** un lector de pantalla enfoca el menú de la tarjeta «to give up»
- **THEN** anuncia "Acciones de «to give up»" y, al abrirlo, ofrece Editar, Suspender y Borrar

### Requirement: El usuario puede seleccionar varias tarjetas y borrarlas de golpe
El sistema SHALL ofrecer el botón "Seleccionar" solo cuando el capítulo tiene tarjetas. En modo selección SHALL mostrarse una casilla por tarjeta, una casilla "Seleccionar todas", un contador con plural real ("1 seleccionada", "3 seleccionadas") y un botón "Eliminar" deshabilitado mientras no haya nada marcado; el menú de acciones de cada fila, "Importar tarjetas" y "Nueva tarjeta" SHALL ocultarse y tocar la fila SHALL alternar su casilla en vez de editar. "Seleccionar todas" SHALL alternar entre marcar todas y desmarcar todas. "Cancelar selección" SHALL salir del modo y limpiar lo marcado; salir de la pantalla también SHALL limpiar la selección.

#### Scenario: Entrar al modo selección
- **WHEN** el usuario pulsa "Seleccionar" en un capítulo con tarjetas
- **THEN** aparecen las casillas y la barra de acciones, y desaparecen los menús de fila, "Importar tarjetas" y "Nueva tarjeta"

#### Scenario: Seleccionar todas y volver atrás
- **WHEN** el usuario marca "Seleccionar todas" con 5 tarjetas y vuelve a pulsarla
- **THEN** primero quedan 5 seleccionadas y luego 0

#### Scenario: Cancelar limpia la selección
- **WHEN** el usuario tiene 3 marcadas y pulsa "Cancelar selección"
- **THEN** se sale del modo selección y, al volver a entrar, no hay ninguna marcada

#### Scenario: Salir de la pantalla limpia la selección
- **WHEN** el usuario tiene 3 marcadas y navega al libro
- **THEN** al volver al capítulo el modo selección está cerrado y no hay ninguna marcada

### Requirement: El borrado masivo pide confirmación y escribe por lotes
El sistema SHALL pedir confirmación ("¿Borrar las tarjetas seleccionadas?") con un mensaje que indica cuántas tarjetas se eliminarán, que se pierde su progreso de estudio y que no se puede deshacer, con el botón "Borrar N". Al confirmar, el sistema SHALL borrar todas las seleccionadas en lotes de como máximo 450 escrituras, cada lote con su propio descuento del contador del libro, quitarlas de la lista y salir del modo selección. Mientras borra, el botón SHALL mostrar "Borrando…". Si el borrado falla, el diálogo SHALL permanecer abierto mostrando "No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo.", las tarjetas que no se borraron SHALL seguir en la lista y la selección SHALL seguir activa; reintentar borra lo que quede. Los registros de repaso históricos SHALL NOT tocarse.

#### Scenario: Mensaje en singular
- **WHEN** hay 1 tarjeta seleccionada
- **THEN** el mensaje dice "Se eliminará 1 tarjeta de este capítulo, con su progreso de estudio. No se puede deshacer."

#### Scenario: Mensaje en plural
- **WHEN** hay 4 tarjetas seleccionadas
- **THEN** el mensaje dice "Se eliminarán 4 tarjetas de este capítulo, con su progreso de estudio. No se puede deshacer." y el botón dice "Borrar 4"

#### Scenario: Borrado confirmado
- **WHEN** el usuario confirma con las tarjetas 1 y 3 de 3 seleccionadas
- **THEN** solo queda la tarjeta 2, el contador del libro baja en 2 y el modo selección se cierra

#### Scenario: Más de un lote
- **WHEN** el usuario confirma el borrado de 1000 tarjetas
- **THEN** el sistema las borra en tandas de hasta 450 hasta completar las 1000 y el contador del libro baja exactamente 1000

### Requirement: Toda acción en vuelo bloquea reenvíos y comunica su progreso
Mientras se guarda o borra, el sistema SHALL deshabilitar los botones del diálogo, cambiar la etiqueta del botón principal ("Guardando…", "Borrando…"), ignorar nuevos envíos y bloquear el cierre con Escape. Si la acción falla, el diálogo SHALL permanecer abierto con lo escrito o lo seleccionado y mostrar dentro, con rol de alerta, el mensaje correspondiente ("No se pudo guardar la tarjeta. Inténtalo de nuevo.", "No se pudo borrar la tarjeta. Inténtalo de nuevo.", "No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo."); el diálogo solo se cierra cuando la acción termina con éxito o el usuario cancela.

#### Scenario: Doble clic al guardar
- **WHEN** el usuario pulsa "Crear tarjeta" dos veces seguidas
- **THEN** se crea una sola tarjeta

#### Scenario: Falla el guardado
- **WHEN** la escritura de la tarjeta falla
- **THEN** el diálogo sigue abierto con el texto del usuario y muestra dentro "No se pudo guardar la tarjeta. Inténtalo de nuevo." con rol de alerta

#### Scenario: Falla el borrado masivo
- **WHEN** el borrado de las seleccionadas falla
- **THEN** la confirmación sigue abierta con el mensaje de error, la selección sigue activa y el usuario puede reintentar o cancelar

#### Scenario: Éxito limpia el error anterior
- **WHEN** un guardado falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra

### Requirement: La pantalla del capítulo refleja carga, error y vacío de forma honesta
El sistema SHALL mostrar en la región "Tarjetas" del detalle del capítulo el esqueleto de carga (marcado como ocupado) mientras lee las tarjetas; el estado de error "No pudimos cargar las tarjetas" con "Reintentar" si la lectura falla; y el estado vacío "Este capítulo aún no tiene tarjetas" con la frase "Escribe una o pega varias de golpe." y los botones "Crear tarjeta" e "Importar tarjetas" si no hay ninguna. Las acciones de cabecera ("Seleccionar", "Importar tarjetas", "Nueva tarjeta") SHALL aparecer solo cuando la lista está lista, y "Seleccionar" solo cuando hay tarjetas. Un fallo de lectura NUNCA SHALL pintarse como capítulo vacío. La región SHALL mostrarse únicamente cuando libro y capítulo existen.

#### Scenario: Carga en curso
- **WHEN** se están leyendo las tarjetas
- **THEN** se ve el esqueleto marcado como ocupado y no se ofrecen acciones de cabecera

#### Scenario: Falla la carga
- **WHEN** la lectura de tarjetas falla
- **THEN** se muestra "No pudimos cargar las tarjetas" con "Reintentar" en vez de fingir un capítulo vacío

#### Scenario: Capítulo vacío
- **WHEN** la lectura termina sin tarjetas
- **THEN** se muestra "Este capítulo aún no tiene tarjetas", la frase y los botones "Crear tarjeta" e "Importar tarjetas", y no se ofrece "Seleccionar"

### Requirement: Las tarjetas del almacén se validan antes de usarse
El sistema SHALL validar cada tarjeta leída del almacén contra el contrato del modelo antes de usarla. Si alguna no cumple, la carga del capítulo SHALL fallar de forma explícita (estado de error) en vez de mostrar una tarjeta a medias. Para compatibilidad con tarjetas antiguas, un bloque de programación sin `learningSteps` SHALL leerse como `learningSteps = 0`, una tarjeta sin `cardType` como básica y una sin `suspended` como no suspendida. Los campos opcionales presentes SHALL conservarse.

#### Scenario: Registro corrupto
- **WHEN** una tarjeta del almacén no tiene `front` o tiene un estado de programación fuera de 0..3
- **THEN** la carga del capítulo termina en estado de error

#### Scenario: Tarjeta anterior a los pasos de aprendizaje
- **WHEN** una tarjeta del almacén no trae `learningSteps`
- **THEN** se lee con `learningSteps = 0` sin error

#### Scenario: Tarjeta sin bandera de suspensión
- **WHEN** una tarjeta del almacén no trae `suspended`
- **THEN** se lee como no suspendida sin error
