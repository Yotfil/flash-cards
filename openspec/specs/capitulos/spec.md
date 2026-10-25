# Capítulos Specification

## Purpose

Subdividir un libro en "capítulos": la unidad intermedia en la que viven las tarjetas y que el usuario crea, renombra, ordena y borra desde el detalle del libro. Cubre la lista de capítulos de un libro, el diálogo de capítulo, la navegación libro → capítulo, la cabecera del detalle de un capítulo y sus disparadores "Estudiar" y "Practicar". Las tarjetas del capítulo y qué entra en cada sesión las cubren otras specs.

## Requirements

### Requirement: El detalle de un libro lista sus capítulos en su orden
El sistema SHALL mostrar en el detalle de un libro, bajo el título "Capítulos", únicamente los capítulos de ese libro y del usuario autenticado, ordenados por `order` ascendente, cada uno en una tarjeta de acrílico. Cada fila SHALL mostrar su posición en la lista (1, 2, 3…, no el valor de `order`), su nombre y su número de tarjetas con plural real ("1 tarjeta", "42 tarjetas"), contado en el servidor sin descargar las tarjetas. Tocar la fila SHALL abrir el detalle del capítulo. Cada fila SHALL tener los botones de icono "Renombrar" y "Borrar". Sin conexión, o si el conteo falla, la fila SHALL mostrarse sin número de tarjetas, nunca con "0 tarjetas" ni como error. La lista de capítulos SHALL volver a leerse cada vez que se abre el detalle del libro.

#### Scenario: Orden por `order`
- **WHEN** un libro tiene capítulos con `order` 3, 0 y 1
- **THEN** el detalle los presenta en el orden 0, 1, 3

#### Scenario: Solo los del libro abierto
- **WHEN** el usuario tiene capítulos en dos libros distintos
- **THEN** el detalle de un libro muestra solo los capítulos cuyo `bookId` es el de ese libro

#### Scenario: Sin sesión activa
- **WHEN** se intenta cargar o modificar capítulos sin un usuario autenticado
- **THEN** el sistema falla con un error explícito

#### Scenario: Posición en la lista
- **WHEN** un libro tiene capítulos con `order` 0, 3 y 7
- **THEN** las filas muestran las posiciones 1, 2 y 3

#### Scenario: Conteo por capítulo
- **WHEN** un capítulo tiene 42 tarjetas y otro tiene 1
- **THEN** sus filas muestran "42 tarjetas" y "1 tarjeta"

#### Scenario: Conteo no disponible
- **WHEN** no hay conexión o el conteo de un capítulo falla
- **THEN** su fila muestra posición y nombre sin número de tarjetas y sin mensaje de error

#### Scenario: Tocar la fila
- **WHEN** el usuario toca la fila de un capítulo fuera de sus botones de icono
- **THEN** el sistema abre el detalle de ese capítulo

### Requirement: La lista de capítulos refleja su estado de carga de forma honesta
El sistema SHALL mostrar el esqueleto de carga (no un spinner) mientras lee los capítulos, un estado de error "No pudimos cargar los capítulos" con botón "Reintentar" si la lectura falla, y un estado vacío "Este libro aún no tiene capítulos" con la frase "Los capítulos agrupan tus tarjetas. Crea el primero para empezar." y el botón "Crear capítulo" si no hay ninguno. Con al menos un capítulo, el sistema SHALL mostrar al final de la lista la acción "Añadir un capítulo". La acción "Añadir un capítulo" y el botón de estudiar el libro SHALL aparecer solo cuando la lista terminó de cargar. Un fallo de lectura NUNCA SHALL pintarse como libro sin capítulos. La lista SHALL mostrarse únicamente si el libro existe en la biblioteca cargada.

#### Scenario: Cargando
- **WHEN** la lectura de capítulos está en curso
- **THEN** el detalle muestra el esqueleto marcado como ocupado y sin "Añadir un capítulo"

#### Scenario: Falla la lectura
- **WHEN** la lectura de capítulos falla
- **THEN** el detalle muestra "No pudimos cargar los capítulos" con "Reintentar", que repite la lectura, y no muestra el estado vacío

#### Scenario: Libro sin capítulos
- **WHEN** la lectura termina sin capítulos
- **THEN** el detalle muestra "Este libro aún no tiene capítulos", la frase "Los capítulos agrupan tus tarjetas. Crea el primero para empezar." y el botón "Crear capítulo"

#### Scenario: Libro inexistente
- **WHEN** la biblioteca está cargada y el libro de la dirección no existe
- **THEN** el detalle no muestra lista, esqueleto ni acciones de capítulos

#### Scenario: Libro con capítulos
- **WHEN** la lectura termina con al menos un capítulo
- **THEN** la lista termina con la acción "Añadir un capítulo", que abre el diálogo "Nuevo capítulo"

### Requirement: Cada capítulo leído del almacén se valida antes de usarse
El sistema SHALL validar cada capítulo leído del almacén contra su contrato (`bookId`, `name`, `order`, fechas de creación y actualización) antes de mostrarlo. Si un capítulo no cumple, la carga completa de la lista SHALL fallar de forma visible. Un nombre vacío guardado por versiones anteriores SHALL aceptarse y mostrarse como "Capítulo sin nombre".

#### Scenario: Capítulo corrupto
- **WHEN** uno de los capítulos almacenados carece de `order` o de `name`
- **THEN** la lista entra en estado de error y no muestra ningún capítulo

#### Scenario: Nombre vacío heredado
- **WHEN** un capítulo almacenado tiene `name` igual a una cadena vacía
- **THEN** la lista se carga y ese capítulo aparece como "Capítulo sin nombre"

### Requirement: Crear un capítulo pide solo su nombre y lo coloca al final del libro
El sistema SHALL ofrecer un diálogo "Nuevo capítulo" con un único campo nombre (obligatorio tras recortar espacios, máximo 120 caracteres). Al guardar, el sistema SHALL recortar espacios del nombre, asociar el capítulo al libro abierto, asignar `order` igual al máximo actual del libro más uno (0 si es el primero) y añadir el capítulo al final de la lista, con "0 tarjetas", sin recargarla.

#### Scenario: Primer capítulo
- **WHEN** el libro no tiene capítulos y el usuario crea "Básicos"
- **THEN** el capítulo se guarda con `order = 0` y el `bookId` del libro abierto

#### Scenario: Capítulo al final
- **WHEN** existen capítulos con `order` 0 y 3 y el usuario crea otro
- **THEN** el nuevo capítulo se guarda con `order = 4` y aparece último en la lista

#### Scenario: Nombre vacío
- **WHEN** el campo nombre está vacío o tiene solo espacios
- **THEN** el botón "Crear capítulo" está deshabilitado y, si el campo fue tocado, se muestra "El nombre es obligatorio."

#### Scenario: Nombre con espacios alrededor
- **WHEN** el usuario escribe "  Phrasal verbs  " y guarda
- **THEN** el capítulo se guarda como "Phrasal verbs"

#### Scenario: Cancelar
- **WHEN** el usuario pulsa "Cancelar" o Escape
- **THEN** el diálogo se cierra sin crear nada

### Requirement: Renombrar un capítulo cambia solo su nombre
El sistema SHALL abrir el mismo diálogo en modo "Renombrar capítulo", precargado con el nombre actual. Al guardar, el sistema SHALL persistir únicamente el nuevo nombre (recortado), conservar `order` y `bookId`, y reflejar el cambio en la lista sin recargarla.

#### Scenario: Renombrar conserva la posición
- **WHEN** el usuario renombra el capítulo con `order = 2`
- **THEN** el capítulo mantiene `order = 2` y su lugar en la lista, con el nuevo nombre

#### Scenario: Cambio visible al instante
- **WHEN** el renombrado se guarda con éxito
- **THEN** el diálogo se cierra y la lista muestra el nuevo nombre sin volver a leer el almacén

### Requirement: Del libro se navega al capítulo y de vuelta
El sistema SHALL abrir el detalle de un capítulo al tocar su fila en la lista del libro, en una dirección que identifica libro y capítulo. El detalle del capítulo SHALL mostrar un enlace con el nombre del libro (en una línea, recortado con puntos suspensivos si no cabe), cuyo nombre accesible es "Volver a {nombre del libro}" y que regresa al detalle del libro, y una cabecera con el nombre del capítulo. Al entrar, el sistema SHALL resolver el libro y los capítulos del libro, leyéndolos solo si no están ya cargados; mientras resuelve, SHALL mostrar el esqueleto. Si la lectura falla, el detalle SHALL mostrar el estado de error con "Reintentar". Si el libro no existe, SHALL mostrar "Libro no encontrado" con un enlace a la Biblioteca. Si el capítulo no existe, SHALL mostrar "Capítulo no encontrado" con un enlace al libro. En esos tres casos el detalle NO SHALL mostrar las tarjetas del capítulo ni ninguna acción sobre ellas.

#### Scenario: Entrar al capítulo
- **WHEN** el usuario toca la fila de un capítulo en el detalle del libro
- **THEN** el sistema navega al detalle de ese capítulo y muestra su nombre en la cabecera sin volver a leer libros ni capítulos

#### Scenario: Volver al libro
- **WHEN** el usuario pulsa el enlace con el nombre del libro
- **THEN** el sistema navega al detalle del libro al que pertenece el capítulo

#### Scenario: Navegación directa a un capítulo
- **WHEN** el usuario abre la dirección del detalle de un capítulo sin pasar por el libro
- **THEN** el sistema muestra el esqueleto, lee la biblioteca y los capítulos del libro y, al terminar, muestra el enlace con el nombre del libro y el nombre del capítulo

#### Scenario: Capítulo inexistente
- **WHEN** el libro existe y ninguno de sus capítulos tiene el identificador de la dirección
- **THEN** el detalle muestra "Capítulo no encontrado" con un enlace al libro, sin tarjetas ni acciones

#### Scenario: Libro inexistente
- **WHEN** la biblioteca está cargada y ningún libro tiene el identificador de la dirección
- **THEN** el detalle muestra "Libro no encontrado" con un enlace a la Biblioteca, sin tarjetas ni acciones

#### Scenario: Falla la lectura
- **WHEN** la lectura de la biblioteca o de los capítulos falla al entrar al detalle
- **THEN** el detalle muestra el estado de error con "Reintentar", que repite la lectura fallida, sin tarjetas ni acciones

#### Scenario: Enlace de vuelta nombrado
- **WHEN** un lector de pantalla enfoca el enlace de vuelta en un capítulo del libro "Phrasal Verbs"
- **THEN** anuncia "Volver a Phrasal Verbs"

### Requirement: Estudiar un capítulo arranca una sesión de repaso o avisa que no hay nada
El sistema SHALL mostrar en el detalle del capítulo el botón "Estudiar este capítulo" solo cuando las tarjetas del capítulo terminaron de cargar y hay al menos una. Al pulsarlo, el sistema SHALL deshabilitar el botón mostrando "Preparando…", pedir la sesión del capítulo y, si contiene al menos una tarjeta lista, navegar a la pantalla de repaso; si no, SHALL mostrar "Estás al día con este capítulo. No hay tarjetas para repasar ahora." sin salir del detalle. Si la preparación falla, el sistema SHALL mostrar un error con "Reintentar" y NUNCA el aviso de "al día". Estudiar SHALL funcionar sin conexión con las tarjetas disponibles en el dispositivo. Qué tarjetas entran lo define la spec de cola diaria.

#### Scenario: Hay tarjetas listas
- **WHEN** el usuario pulsa "Estudiar este capítulo" y hay tarjetas listas
- **THEN** el sistema navega a la sesión de repaso

#### Scenario: Nada que estudiar
- **WHEN** el usuario pulsa "Estudiar este capítulo" y no hay tarjetas listas
- **THEN** el detalle muestra el aviso de que está al día y no navega

#### Scenario: Capítulo sin tarjetas
- **WHEN** el capítulo no tiene tarjetas
- **THEN** el botón "Estudiar este capítulo" no se muestra

#### Scenario: Doble toque
- **WHEN** el usuario pulsa "Estudiar este capítulo" mientras la sesión aún se prepara
- **THEN** el segundo toque se ignora

#### Scenario: Falla la preparación
- **WHEN** el usuario pulsa "Estudiar este capítulo" y la lectura de tarjetas falla
- **THEN** el detalle muestra un error con "Reintentar" y no dice que está al día

### Requirement: Las acciones de capítulo en vuelo bloquean el diálogo y los errores se muestran sin perder el trabajo
Mientras una creación o un renombrado se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el principal, ignorar envíos repetidos y bloquear el cierre con Escape. Si crear o renombrar falla, el diálogo SHALL permanecer abierto con lo escrito y mostrar dentro, con rol de alerta, "No se pudo guardar el capítulo. Inténtalo de nuevo."; el diálogo solo se cierra cuando la acción termina con éxito o el usuario cancela.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear capítulo" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces antes de que termine la primera escritura
- **THEN** solo se crea un capítulo

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o el renombrado
- **THEN** el diálogo sigue abierto con el nombre escrito y muestra dentro "No se pudo guardar el capítulo. Inténtalo de nuevo." con rol de alerta

#### Scenario: Éxito limpia el error anterior
- **WHEN** un guardado falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra

### Requirement: Los diálogos de capítulos son accesibles
Todo diálogo de capítulos (crear/renombrar, confirmación) SHALL presentarse como diálogo modal con nombre accesible, campo con etiqueta asociada y cierre con Escape cuando no hay acción en vuelo. Los botones de icono "Renombrar" y "Borrar" de cada capítulo SHALL tener etiquetas accesibles que nombren el capítulo.

#### Scenario: Escape cierra
- **WHEN** el usuario pulsa Escape en un diálogo sin acción en vuelo
- **THEN** el diálogo se cierra como si hubiera cancelado

#### Scenario: Botón de borrar nombrado
- **WHEN** un lector de pantalla enfoca el botón de borrar del capítulo "Básicos"
- **THEN** anuncia "Borrar Básicos"

#### Scenario: Botón de renombrar nombrado
- **WHEN** un lector de pantalla enfoca el botón de renombrar del capítulo "Básicos"
- **THEN** anuncia "Renombrar Básicos"

### Requirement: Borrar un capítulo exige confirmación y borra también sus tarjetas
El sistema SHALL pedir confirmación antes de borrar un capítulo en un diálogo "¿Borrar este capítulo?" que nombra el capítulo, dice cuántas tarjetas se borrarán con él con el verbo y el sustantivo concordados ("Se borrarán 42 tarjetas.", "Se borrará 1 tarjeta."), aclara "Tu historial de repasos se conserva.", advierte "No se puede deshacer." y ofrece "Cancelar" y "Borrar". Si el capítulo no tiene tarjetas, el diálogo SHALL decir solo "No se puede deshacer."; si el número de tarjetas no se puede obtener, SHALL decir "También se borrarán sus tarjetas." sin número, sin bloquear el borrado. Al confirmar, el sistema SHALL eliminar las tarjetas del capítulo y, al final, el propio capítulo, en lotes de hasta 450 operaciones; cada lote SHALL descontar del número de tarjetas del libro exactamente las tarjetas que borra, de modo que un fallo a mitad no deje ese número desfasado. El historial de repasos y las estadísticas diarias NO SHALL tocarse. Mientras borra, el botón SHALL mostrar "Borrando…" y el diálogo quedar ocupado. Si el borrado falla, el diálogo SHALL permanecer abierto mostrando "No se pudo borrar el capítulo. Inténtalo de nuevo." y el capítulo SHALL seguir en la lista; reintentar borra lo que quede. Los valores de `order` de los capítulos restantes SHALL quedar como estaban.

#### Scenario: Confirmar borrado
- **WHEN** el usuario pulsa "Borrar" en un capítulo con 42 tarjetas de un libro que tiene 100, y confirma
- **THEN** el capítulo y sus 42 tarjetas desaparecen del almacén, el capítulo sale de la lista, el libro pasa a tener 58 tarjetas, los totales de su cabecera se actualizan y los registros de repaso siguen existiendo

#### Scenario: Conteo en la confirmación
- **WHEN** el usuario pulsa "Borrar" en el capítulo "Básicos", que tiene 42 tarjetas
- **THEN** la confirmación nombra "Básicos" y muestra "Se borrarán 42 tarjetas. Tu historial de repasos se conserva. No se puede deshacer."

#### Scenario: Capítulo con una tarjeta
- **WHEN** el usuario pulsa "Borrar" en un capítulo con 1 tarjeta
- **THEN** la confirmación muestra "Se borrará 1 tarjeta. Tu historial de repasos se conserva. No se puede deshacer."

#### Scenario: Capítulo sin tarjetas
- **WHEN** el usuario pulsa "Borrar" en un capítulo sin tarjetas
- **THEN** la confirmación muestra solo "No se puede deshacer." y al confirmar el número de tarjetas del libro no cambia

#### Scenario: Conteo no disponible
- **WHEN** el conteo de tarjetas del capítulo falla al abrir la confirmación
- **THEN** la confirmación se abre igual y dice "También se borrarán sus tarjetas. Tu historial de repasos se conserva. No se puede deshacer."

#### Scenario: Cancelar borrado
- **WHEN** el usuario pulsa "Cancelar" en la confirmación
- **THEN** el capítulo y sus tarjetas no se tocan y el diálogo se cierra

#### Scenario: Huecos en el orden
- **WHEN** se borra el capítulo con `order = 1` de un libro con `order` 0, 1 y 2, y luego se crea otro
- **THEN** el nuevo capítulo recibe `order = 3`

#### Scenario: Capítulo grande
- **WHEN** se borra un capítulo con 900 tarjetas
- **THEN** el borrado usa varios lotes y al terminar no queda ninguna de sus tarjetas y el número de tarjetas del libro bajó exactamente 900

#### Scenario: Falla el borrado
- **WHEN** el almacén rechaza el borrado
- **THEN** el diálogo sigue abierto con "No se pudo borrar el capítulo. Inténtalo de nuevo.", el capítulo sigue en la lista y el usuario puede reintentar o cancelar

### Requirement: Sin conexión, las acciones que guardan capítulos no se ofrecen
Mientras no haya conexión, el sistema SHALL deshabilitar el botón principal de los diálogos de crear, renombrar y borrar capítulos ("Crear capítulo", "Guardar", "Borrar") y mostrar dentro del diálogo "Necesitas conexión para guardar cambios."; "Cancelar" y Escape SHALL seguir cerrando el diálogo. Al volver la conexión, el botón SHALL habilitarse sin cerrar el diálogo ni perder lo escrito. Sin conexión, la confirmación de borrado NO SHALL pedir el número de tarjetas y SHALL usar el texto sin número. Ver la lista de capítulos ya leída y estudiar NO SHALL depender de la conexión.

#### Scenario: Crear sin conexión
- **WHEN** no hay conexión y el usuario abre "Nuevo capítulo" y escribe un nombre válido
- **THEN** "Crear capítulo" está deshabilitado, el diálogo muestra "Necesitas conexión para guardar cambios." y "Cancelar" lo cierra sin crear nada

#### Scenario: Renombrar sin conexión
- **WHEN** no hay conexión y el usuario abre "Renombrar capítulo"
- **THEN** "Guardar" está deshabilitado y el diálogo muestra "Necesitas conexión para guardar cambios."

#### Scenario: Borrar sin conexión
- **WHEN** no hay conexión y el usuario pulsa "Borrar" en un capítulo
- **THEN** la confirmación se abre sin pedir el conteo, dice "También se borrarán sus tarjetas…", el botón "Borrar" está deshabilitado y muestra "Necesitas conexión para guardar cambios."

#### Scenario: Vuelve la conexión
- **WHEN** el diálogo de crear está abierto sin conexión con un nombre escrito y vuelve la conexión
- **THEN** "Crear capítulo" se habilita, el nombre sigue escrito y el diálogo no se cierra
