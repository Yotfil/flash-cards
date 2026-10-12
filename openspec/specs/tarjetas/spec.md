# Tarjetas Specification

## Purpose

Definir qué es una tarjeta y cómo el usuario la crea, edita, borra y revisa dentro de un capítulo. La tarjeta es la unidad mínima de estudio: un anverso y un reverso genéricos (o un texto con huecos, en el caso cloze), con su propio bloque de programación. Esta spec cubre el modelo materia-agnóstico, la sintaxis cloze, el listado del capítulo con detección de repetidas, la selección múltiple con borrado masivo y el feedback honesto de cada acción.

## Requirements

### Requirement: La tarjeta es materia-agnóstica y pertenece a un libro y a un capítulo
El sistema SHALL representar cada tarjeta con un anverso (`front`) y un reverso (`back`) genéricos, nunca como "palabra/traducción". Cada tarjeta SHALL pertenecer a exactamente un libro y un capítulo, SHALL tener una dirección (`direction`) que en el MVP es siempre `forward`, un identificador de nota (`noteId`) propio e independiente, y una bandera `suspended` que arranca en `false`.

#### Scenario: Tarjeta creada desde el formulario
- **WHEN** el usuario crea una tarjeta en un capítulo
- **THEN** la tarjeta queda asociada a ese capítulo y a su libro, con `direction = forward`, `suspended = false` y un `noteId` propio no vacío

#### Scenario: Cada tarjeta es independiente en el MVP
- **WHEN** se crean dos tarjetas en el mismo capítulo
- **THEN** cada una recibe su propio `noteId`; ninguna comparte nota con otra

### Requirement: El modelo reserva campos opcionales futuros sin exponerlos en la UI
El sistema SHALL admitir en la tarjeta los campos opcionales `pronunciation`, `example`, `audioUrl`, `notes` y `tags`. El formulario del MVP SHALL exponer únicamente anverso y reverso (o el texto con huecos). Un campo opcional ausente SHALL omitirse por completo (no se guarda vacío ni nulo) y, si está presente en el almacén, SHALL conservarse al leer la tarjeta.

#### Scenario: Tarjeta nueva sin campos futuros
- **WHEN** el usuario crea una tarjeta desde el formulario
- **THEN** la tarjeta guardada no contiene `pronunciation`, `example`, `audioUrl`, `notes` ni `tags`

#### Scenario: Tarjeta con campos futuros ya presentes
- **WHEN** una tarjeta del almacén trae `example` y `tags`
- **THEN** el sistema los conserva en la tarjeta leída aunque la UI no los muestre

### Requirement: Una tarjeta es básica o cloze, y la ausencia de tipo significa básica
El sistema SHALL distinguir dos tipos de tarjeta mediante `cardType`: `basic` (anverso/reverso) y `cloze` (rellenar el hueco). Una tarjeta sin `cardType` SHALL tratarse como básica. En una tarjeta cloze, `front` SHALL contener el texto plantilla con los huecos y `back` SHALL quedar vacío.

#### Scenario: Tarjeta sin tipo
- **WHEN** se lee una tarjeta que no tiene `cardType`
- **THEN** el sistema la trata y la muestra como básica

#### Scenario: Tarjeta básica guardada
- **WHEN** el usuario crea una tarjeta básica
- **THEN** el sistema no registra ningún `cardType` (ausencia = básica)

#### Scenario: Tarjeta cloze guardada
- **WHEN** el usuario crea una tarjeta cloze con el texto `El {{gato}} es {{negro}}`
- **THEN** la tarjeta queda con `cardType = cloze`, `front = El {{gato}} es {{negro}}` y `back` vacío

### Requirement: La sintaxis cloze marca cada hueco con llaves dobles
El sistema SHALL reconocer como hueco todo fragmento `{{contenido}}` cuyo contenido, tras recortar espacios, no esté vacío. Un texto SHALL contar como cloze si tiene al menos un hueco válido. Un texto puede tener varios huecos y todos SHALL ocultarse juntos (un solo grupo = una tarjeta). No existe numeración de huecos ni pistas. Un marcador vacío (`{{}}` o `{{   }}`) NO es un hueco y SHALL tratarse como texto literal.

#### Scenario: Un hueco válido
- **WHEN** el texto es `El {{gato}} es negro`
- **THEN** el texto cuenta como cloze

#### Scenario: Sin marcadores
- **WHEN** el texto es `El gato es negro`
- **THEN** el texto no cuenta como cloze

#### Scenario: Marcador vacío no cuenta
- **WHEN** el texto es `El {{}} es negro` o `El {{   }} es negro`
- **THEN** el texto no cuenta como cloze

#### Scenario: Varios huecos
- **WHEN** el texto es `El {{gato}} es {{negro}}`
- **THEN** el texto cuenta como cloze con dos huecos

### Requirement: Un texto cloze se descompone en segmentos literales y ocultos
El sistema SHALL partir un texto cloze en una secuencia de segmentos: los literales tal cual y los huecos con su contenido recortado. El sistema SHALL NOT generar segmentos literales vacíos. Para listados compactos, el sistema SHALL producir una "pregunta" donde cada hueco se reemplaza por `[…]`.

#### Scenario: Segmentos con recorte del contenido
- **WHEN** el texto es `El {{ gato }} es {{negro}}`
- **THEN** los segmentos son: `El ` (literal), `gato` (oculto), ` es ` (literal), `negro` (oculto)

#### Scenario: Texto sin huecos
- **WHEN** el texto es `hola mundo`
- **THEN** hay un único segmento literal `hola mundo`

#### Scenario: Hueco al inicio
- **WHEN** el texto es `{{Hola}} mundo`
- **THEN** los segmentos son `Hola` (oculto) y ` mundo` (literal), sin literal vacío delante

#### Scenario: Pregunta compacta
- **WHEN** el texto es `El {{gato}} es {{negro}}`
- **THEN** la pregunta compacta es `El […] es […]`

### Requirement: El formulario de tarjeta básica exige anverso y reverso
El sistema SHALL ofrecer un diálogo "Nueva tarjeta" con los campos Anverso y Reverso, ambos obligatorios y de hasta 2000 caracteres. El sistema SHALL recortar los espacios de ambos extremos antes de guardar. Mientras el formulario sea inválido, el botón "Crear tarjeta" SHALL permanecer deshabilitado; si el usuario intenta enviar igualmente, SHALL marcarse cada campo con su mensaje ("El anverso es obligatorio." / "El reverso es obligatorio.") sin guardar nada.

#### Scenario: Creación válida con espacios sobrantes
- **WHEN** el usuario escribe `  to give up ` en Anverso y ` rendirse  ` en Reverso y confirma
- **THEN** se crea una tarjeta básica con `front = to give up` y `back = rendirse`

#### Scenario: Reverso vacío
- **WHEN** el usuario deja el Reverso vacío e intenta enviar
- **THEN** no se crea nada y se muestra "El reverso es obligatorio."

#### Scenario: Texto demasiado largo
- **WHEN** el anverso supera los 2000 caracteres
- **THEN** el formulario es inválido y no permite guardar

### Requirement: El formulario permite elegir el tipo cloze al crear
El sistema SHALL mostrar al crear un selector de tipo ("Básica" / "Cloze (rellenar el hueco)"), con Básica por defecto. Al elegir Cloze, el formulario SHALL mostrar un único campo "Texto con huecos" (obligatorio, hasta 2000 caracteres, con al menos un hueco válido) y SHALL dejar de exigir el reverso. Al confirmar una cloze, el sistema SHALL guardar el texto recortado en `front` y un `back` vacío.

#### Scenario: Cloze sin huecos
- **WHEN** el usuario elige Cloze, escribe `El gato es negro` e intenta enviar
- **THEN** no se guarda nada y se muestra "Escribe un texto con al menos un hueco marcado con {{…}}."

#### Scenario: Cloze válida
- **WHEN** el usuario elige Cloze, escribe `El {{gato}} es {{negro}}` y confirma
- **THEN** se crea una tarjeta con `cardType = cloze` y `back` vacío

#### Scenario: Volver a Básica reactiva el reverso
- **WHEN** el usuario pasa de Cloze a Básica
- **THEN** el reverso vuelve a ser obligatorio y el anverso deja de exigir huecos

### Requirement: Editar una tarjeta cambia su contenido, pero no su tipo ni su programación
El sistema SHALL abrir el mismo diálogo en modo "Editar tarjeta" con los campos precargados y el botón "Guardar". En edición el selector de tipo SHALL NOT mostrarse: el tipo de la tarjeta queda fijo. Al guardar, el sistema SHALL actualizar únicamente el contenido (`front`, `back`, `cardType`) y la fecha de actualización, dejando intacto el bloque de programación, y SHALL reflejar el cambio en la lista sin recargar.

#### Scenario: Editar una básica
- **WHEN** el usuario edita una tarjeta básica y cambia su reverso
- **THEN** la lista muestra el nuevo reverso y la tarjeta conserva su estado, vencimiento y repeticiones

#### Scenario: Editar una cloze
- **WHEN** el usuario abre a editar una tarjeta cloze
- **THEN** el diálogo muestra el campo "Texto con huecos" precargado y no ofrece cambiar el tipo

### Requirement: Borrar una tarjeta pide confirmación y descuenta el contador del libro
El sistema SHALL pedir confirmación antes de borrar ("¿Borrar esta tarjeta?") mostrando el anverso y avisando que no se puede deshacer. Al confirmar, la tarjeta SHALL desaparecer de la lista y el contador de tarjetas del libro SHALL bajar en 1. Al cancelar, nada cambia.

#### Scenario: Borrado confirmado
- **WHEN** el usuario confirma el borrado de «to give up»
- **THEN** la tarjeta ya no aparece en el capítulo y el `cardCount` del libro baja en 1

#### Scenario: Borrado cancelado
- **WHEN** el usuario cancela la confirmación
- **THEN** la tarjeta sigue en el capítulo y el contador no cambia

### Requirement: Una tarjeta recién creada nace en estado "nueva" y lista para estudiarse
El sistema SHALL asignar a toda tarjeta creada (a mano o importada) un bloque de programación inicial con estado "nueva", cero repeticiones, cero lapsos, sin último repaso y con vencimiento en el momento de creación, de modo que entre de inmediato como candidata "nueva" de la cola diaria.

#### Scenario: Programación inicial
- **WHEN** se crea una tarjeta
- **THEN** su estado es "nueva", `reps = 0`, `lapses = 0`, `lastReview` es nulo y su vencimiento no es posterior al momento de creación

### Requirement: El contador de tarjetas del libro se ajusta de forma relativa en cada alta y baja
El sistema SHALL mantener en el libro un `cardCount` denormalizado que sube en 1 al crear una tarjeta, baja en 1 al borrarla, sube en N al crear N de golpe y baja en N al borrar N de golpe. El ajuste SHALL ser relativo (incremento) y no una reescritura del total, para que escrituras concurrentes no se pisen, y SHALL reflejarse en la Biblioteca sin recargar.

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

### Requirement: El listado del capítulo agrupa por anverso y muestra cada tipo a su manera
El sistema SHALL listar las tarjetas del capítulo ordenadas por anverso normalizado, luego por reverso normalizado y, en empate, por antigüedad (la más vieja primero), sin alterar el orden interno de los datos. Una tarjeta básica SHALL mostrarse como `anverso → reverso`; una cloze SHALL mostrarse con la etiqueta "cloze" y su pregunta compacta (huecos como `[…]`).

#### Scenario: Orden alfabético agrupando la misma palabra
- **WHEN** el capítulo tiene `banana | fruta`, `Apple | manzana` y `apple | fruta roja`
- **THEN** el orden mostrado es `apple | fruta roja`, `Apple | manzana`, `banana | fruta`

#### Scenario: Desempate por antigüedad
- **WHEN** dos tarjetas tienen el mismo anverso y reverso
- **THEN** la creada antes se muestra primero

#### Scenario: Vista de una cloze
- **WHEN** una tarjeta cloze tiene `front = El {{gato}} es {{negro}}`
- **THEN** el listado muestra la etiqueta "cloze" y el texto `El […] es […]`

### Requirement: Las tarjetas repetidas se detectan por anverso y reverso normalizados y se señalan sin bloquear
El sistema SHALL considerar repetidas a las tarjetas que comparten anverso Y reverso tras normalizar (recortar, pasar a minúsculas y colapsar espacios múltiples en uno). El sistema SHALL marcar a TODAS las tarjetas del grupo repetido, no solo a las copias. Dos tarjetas con el mismo anverso y distinto reverso NO son repetidas. El sistema SHALL NOT impedir crear ni importar una repetida: la señala en el listado con un indicador accesible ("Tarjeta repetida") cuyo texto "Repetida" se muestra al pasar el cursor o al tocarlo.

#### Scenario: Normalización
- **WHEN** el texto es `  To   Give  Up `
- **THEN** su forma normalizada es `to give up`

#### Scenario: Repetidas con distinta capitalización y espacios
- **WHEN** existen `to give up | rendirse` y `To Give Up |   rendirse ` y `to wake up | despertarse`
- **THEN** las dos primeras se marcan como repetidas y la tercera no

#### Scenario: Doble traducción intencional
- **WHEN** existen `get | obtener` y `get | llegar`
- **THEN** ninguna se marca como repetida

#### Scenario: Tres idénticas
- **WHEN** existen tres tarjetas `x | y`
- **THEN** las tres se marcan como repetidas

#### Scenario: Crear una repetida
- **WHEN** el usuario crea una tarjeta idéntica a una existente
- **THEN** la tarjeta se crea igualmente y ambas aparecen con el indicador "Repetida"

### Requirement: El usuario puede seleccionar varias tarjetas y borrarlas de golpe
El sistema SHALL ofrecer el botón "Seleccionar" solo cuando el capítulo tiene tarjetas. En modo selección SHALL mostrarse una casilla por tarjeta, una casilla "Seleccionar todas", un contador "N seleccionada(s)" y un botón "Eliminar" deshabilitado mientras no haya nada marcado; los botones Editar, Borrar, Importar y Nueva tarjeta SHALL ocultarse. "Seleccionar todas" SHALL alternar entre marcar todas y desmarcar todas. "Cancelar selección" SHALL salir del modo y limpiar lo marcado.

#### Scenario: Entrar al modo selección
- **WHEN** el usuario pulsa "Seleccionar" en un capítulo con tarjetas
- **THEN** aparecen las casillas y la barra de acciones, y desaparecen Editar/Borrar/Importar/Nueva tarjeta

#### Scenario: Seleccionar todas y volver atrás
- **WHEN** el usuario marca "Seleccionar todas" con 5 tarjetas y vuelve a pulsarla
- **THEN** primero quedan 5 seleccionadas y luego 0

#### Scenario: Cancelar limpia la selección
- **WHEN** el usuario tiene 3 marcadas y pulsa "Cancelar selección"
- **THEN** se sale del modo selección y, al volver a entrar, no hay ninguna marcada

### Requirement: El borrado masivo pide confirmación y escribe por lotes
El sistema SHALL pedir confirmación ("¿Borrar las tarjetas seleccionadas?") con un mensaje que indica cuántas tarjetas se eliminarán, que se pierde su progreso de estudio y que no se puede deshacer, con el botón "Borrar N". Al confirmar, el sistema SHALL borrar todas las seleccionadas en lotes de como máximo 450 escrituras, quitarlas de la lista, bajar el contador del libro en N y salir del modo selección. Los registros de repaso históricos SHALL NOT tocarse.

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
- **THEN** el sistema las borra en tandas de hasta 450 hasta completar las 1000

### Requirement: Toda acción en vuelo bloquea reenvíos y comunica su progreso
Mientras se guarda, borra o importa, el sistema SHALL deshabilitar los botones del diálogo, cambiar la etiqueta del botón principal ("Guardando…", "Borrando…", "Importando…"), ignorar nuevos envíos y bloquear el cierre con Escape. Si la acción falla, el sistema SHALL mostrar en la pantalla del capítulo un mensaje visible y accesible ("No se pudo guardar la tarjeta. Inténtalo de nuevo.", "No se pudo borrar la tarjeta. Inténtalo de nuevo.", "No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo."). Al fallar un guardado, el formulario SHALL permanecer abierto con lo escrito; al fallar un borrado individual o masivo, el diálogo de confirmación SHALL cerrarse.

#### Scenario: Doble clic al guardar
- **WHEN** el usuario pulsa "Crear tarjeta" dos veces seguidas
- **THEN** se crea una sola tarjeta

#### Scenario: Falla el guardado
- **WHEN** la escritura de la tarjeta falla
- **THEN** aparece "No se pudo guardar la tarjeta. Inténtalo de nuevo." y el formulario sigue abierto con el texto del usuario

#### Scenario: Falla el borrado masivo
- **WHEN** el borrado de las seleccionadas falla
- **THEN** aparece el mensaje de error, la confirmación se cierra y la selección sigue activa para reintentar

### Requirement: La pantalla del capítulo refleja carga, error y vacío de forma honesta
El sistema SHALL mostrar un esqueleto de carga (marcado como ocupado para tecnologías de asistencia) mientras lee las tarjetas; un estado de error "No pudimos cargar las tarjetas" con opción de reintentar si la lectura falla; y un estado vacío "Este capítulo no tiene tarjetas" con un botón "Crear tarjeta" si no hay ninguna. Las acciones de cabecera (Seleccionar, Importar, Nueva tarjeta) SHALL aparecer solo cuando la lista está lista, y los botones de estudiar/practicar solo cuando hay tarjetas.

#### Scenario: Carga en curso
- **WHEN** se están leyendo las tarjetas
- **THEN** se ven placeholders animados y no se ofrecen acciones de cabecera

#### Scenario: Falla la carga
- **WHEN** la lectura de tarjetas falla
- **THEN** se muestra el estado de error con "Reintentar" en vez de fingir un capítulo vacío

#### Scenario: Capítulo vacío
- **WHEN** la lectura termina sin tarjetas
- **THEN** se muestra el estado vacío con "Crear tarjeta" y no se ofrece "Seleccionar"

### Requirement: Las tarjetas del almacén se validan antes de usarse
El sistema SHALL validar cada tarjeta leída del almacén contra el contrato del modelo antes de usarla. Si alguna no cumple, la carga del capítulo SHALL fallar de forma explícita (estado de error) en vez de mostrar una tarjeta a medias. Para compatibilidad con tarjetas antiguas, un bloque de programación sin `learningSteps` SHALL leerse como `learningSteps = 0` y una tarjeta sin `cardType` como básica.

#### Scenario: Registro corrupto
- **WHEN** una tarjeta del almacén no tiene `front` o tiene un estado de programación fuera de 0..3
- **THEN** la carga del capítulo termina en estado de error

#### Scenario: Tarjeta anterior a los pasos de aprendizaje
- **WHEN** una tarjeta del almacén no trae `learningSteps`
- **THEN** se lee con `learningSteps = 0` sin error

### Requirement: Operar sobre tarjetas requiere una sesión activa
El sistema SHALL rechazar con un error explícito ("No hay una sesión activa.") cualquier lectura o escritura de tarjetas sin usuario autenticado, en lugar de fallar en silencio.

#### Scenario: Sin sesión
- **WHEN** se intenta cargar o crear tarjetas sin usuario autenticado
- **THEN** la operación falla con "No hay una sesión activa."
