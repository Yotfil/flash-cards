# Capítulos Specification

## Purpose

Subdividir un libro en "capítulos": la unidad intermedia en la que viven las tarjetas y que el usuario crea, renombra, ordena y borra desde el detalle del libro. Cubre la lista de capítulos de un libro, el diálogo de capítulo, la navegación libro → capítulo, la cabecera del detalle de un capítulo y sus disparadores "Estudiar" y "Practicar". Las tarjetas del capítulo y qué entra en cada sesión las cubren otras specs.

## Requirements

### Requirement: El detalle de un libro lista sus capítulos en su orden
El sistema SHALL mostrar en el detalle de un libro únicamente los capítulos de ese libro y del usuario autenticado, ordenados por `order` ascendente. Cada capítulo SHALL mostrar su nombre como enlace a su detalle y los botones "Renombrar" y "Borrar". La lista de capítulos SHALL volver a leerse cada vez que se abre el detalle del libro.

#### Scenario: Orden por `order`
- **WHEN** un libro tiene capítulos con `order` 3, 0 y 1
- **THEN** el detalle los presenta en el orden 0, 1, 3

#### Scenario: Solo los del libro abierto
- **WHEN** el usuario tiene capítulos en dos libros distintos
- **THEN** el detalle de un libro muestra solo los capítulos cuyo `bookId` es el de ese libro

#### Scenario: Sin sesión activa
- **WHEN** se intenta cargar o modificar capítulos sin un usuario autenticado
- **THEN** el sistema falla con un error explícito

### Requirement: La lista de capítulos refleja su estado de carga de forma honesta
El sistema SHALL mostrar placeholders (no un spinner) mientras lee los capítulos, un estado de error "No pudimos cargar los capítulos" con botón "Reintentar" si la lectura falla, y un estado vacío "Este libro no tiene capítulos" con el botón "Crear capítulo" si no hay ninguno. El botón "Nuevo capítulo" de la cabecera y el botón de estudiar el libro SHALL aparecer solo cuando la lista terminó de cargar. La lista SHALL mostrarse únicamente si el libro existe en la biblioteca cargada.

#### Scenario: Cargando
- **WHEN** la lectura de capítulos está en curso
- **THEN** el detalle muestra placeholders animados marcados como ocupados y sin botón "Nuevo capítulo"

#### Scenario: Falla la lectura
- **WHEN** la lectura de capítulos falla
- **THEN** el detalle muestra el estado de error con "Reintentar", que repite la lectura

#### Scenario: Libro sin capítulos
- **WHEN** la lectura termina sin capítulos
- **THEN** el detalle muestra "Este libro no tiene capítulos" con el botón "Crear capítulo"

#### Scenario: Libro inexistente
- **WHEN** la biblioteca está cargada y el libro de la dirección no existe
- **THEN** el detalle no muestra lista, placeholders ni acciones de capítulos

### Requirement: Cada capítulo leído del almacén se valida antes de usarse
El sistema SHALL validar cada capítulo leído del almacén contra su contrato (`bookId`, `name`, `order`, fechas de creación y actualización) antes de mostrarlo. Si un capítulo no cumple, la carga completa de la lista SHALL fallar de forma visible.

#### Scenario: Capítulo corrupto
- **WHEN** uno de los capítulos almacenados carece de `order` o de `name`
- **THEN** la lista entra en estado de error y no muestra ningún capítulo

### Requirement: Crear un capítulo pide solo su nombre y lo coloca al final del libro
El sistema SHALL ofrecer un diálogo "Nuevo capítulo" con un único campo nombre (obligatorio, máximo 120 caracteres). Al guardar, el sistema SHALL recortar espacios del nombre, asociar el capítulo al libro abierto, asignar `order` igual al máximo actual del libro más uno (0 si es el primero) y añadir el capítulo al final de la lista sin recargarla.

#### Scenario: Primer capítulo
- **WHEN** el libro no tiene capítulos y el usuario crea "Básicos"
- **THEN** el capítulo se guarda con `order = 0` y el `bookId` del libro abierto

#### Scenario: Capítulo al final
- **WHEN** existen capítulos con `order` 0 y 3 y el usuario crea otro
- **THEN** el nuevo capítulo se guarda con `order = 4` y aparece último en la lista

#### Scenario: Nombre vacío
- **WHEN** el usuario intenta guardar sin nombre
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

### Requirement: Borrar un capítulo exige confirmación y quita solo el capítulo
El sistema SHALL pedir confirmación en un diálogo "¿Borrar este capítulo?" que nombra el capítulo y advierte que no se puede deshacer, con botones "Cancelar" y "Borrar". Al confirmar, el sistema SHALL eliminar únicamente el registro del capítulo y quitarlo de la lista; sus tarjetas NO se eliminan y el `cardCount` del libro NO cambia. Los valores de `order` de los capítulos restantes SHALL quedar como estaban (no se compactan). Si el borrado falla, el sistema SHALL mostrar un error en el detalle y el capítulo SHALL seguir en la lista.

#### Scenario: Confirmar borrado
- **WHEN** el usuario pulsa "Borrar" en un capítulo y confirma
- **THEN** el capítulo desaparece de la lista y del almacén

#### Scenario: Cancelar borrado
- **WHEN** el usuario pulsa "Cancelar" en la confirmación
- **THEN** el capítulo no se toca y el diálogo se cierra

#### Scenario: Las tarjetas no se borran en cascada
- **WHEN** se borra un capítulo que tenía tarjetas
- **THEN** esas tarjetas permanecen en el almacén y el `cardCount` del libro no cambia

#### Scenario: Huecos en el orden
- **WHEN** se borra el capítulo con `order = 1` de un libro con `order` 0, 1 y 2, y luego se crea otro
- **THEN** el nuevo capítulo recibe `order = 3`

#### Scenario: Falla el borrado
- **WHEN** el almacén rechaza el borrado
- **THEN** la confirmación se cierra, el detalle muestra "No se pudo borrar el capítulo. Inténtalo de nuevo." y el capítulo sigue en la lista

### Requirement: Del libro se navega al capítulo y de vuelta
El sistema SHALL abrir el detalle de un capítulo al tocar su nombre en la lista del libro, en una dirección que identifica libro y capítulo. El detalle del capítulo SHALL mostrar un enlace "← Volver al libro" que regresa al detalle del libro, y una cabecera con el nombre del capítulo. Al entrar, el sistema SHALL leer los capítulos del libro para resolver ese nombre; mientras no esté resuelto, o si el capítulo no existe, la cabecera SHALL mostrar "Capítulo".

#### Scenario: Entrar al capítulo
- **WHEN** el usuario toca el nombre de un capítulo en el detalle del libro
- **THEN** el sistema navega al detalle de ese capítulo y muestra su nombre en la cabecera

#### Scenario: Volver al libro
- **WHEN** el usuario pulsa "← Volver al libro"
- **THEN** el sistema navega al detalle del libro al que pertenece el capítulo

#### Scenario: Navegación directa a un capítulo
- **WHEN** el usuario abre la dirección del detalle de un capítulo sin pasar por el libro
- **THEN** el sistema lee los capítulos del libro y, al terminar, muestra el nombre del capítulo

#### Scenario: Capítulo inexistente
- **WHEN** ningún capítulo del libro tiene el identificador de la dirección
- **THEN** la cabecera muestra "Capítulo" y el detalle no falla

### Requirement: Estudiar un capítulo arranca una sesión de repaso o avisa que no hay nada
El sistema SHALL mostrar en el detalle del capítulo el botón "Estudiar este capítulo" solo cuando las tarjetas del capítulo terminaron de cargar y hay al menos una. Al pulsarlo, el sistema SHALL deshabilitar el botón mostrando "Preparando…", pedir la sesión del capítulo y, si contiene al menos una tarjeta lista, navegar a la pantalla de repaso; si no, SHALL mostrar "Estás al día con este capítulo. No hay tarjetas para repasar ahora." sin salir del detalle. Qué tarjetas entran lo define la spec de cola diaria.

#### Scenario: Hay tarjetas listas
- **WHEN** el usuario pulsa "Estudiar este capítulo" y hay tarjetas listas
- **THEN** el sistema navega a la sesión de repaso

#### Scenario: Nada que estudiar
- **WHEN** el usuario pulsa "Estudiar este capítulo" y no hay tarjetas listas
- **THEN** el detalle muestra el aviso de que está al día y no navega

#### Scenario: Capítulo sin tarjetas
- **WHEN** el capítulo no tiene tarjetas
- **THEN** los botones "Estudiar este capítulo" y "Practicar" no se muestran

#### Scenario: Doble toque
- **WHEN** el usuario pulsa "Estudiar este capítulo" mientras la sesión aún se prepara
- **THEN** el segundo toque se ignora

### Requirement: Practicar un capítulo arranca un mini-quiz o avisa que faltan tarjetas
El sistema SHALL mostrar, junto a "Estudiar este capítulo", el botón "Practicar". Al pulsarlo, el sistema SHALL deshabilitar el botón mostrando "Preparando…", pedir el quiz del capítulo y, si se pudo armar con al menos una pregunta, navegar a la pantalla de práctica; si no, SHALL mostrar "Necesitas algunas tarjetas básicas en este capítulo para practicar." sin salir del detalle. Cómo se arma el quiz lo define la spec de práctica.

#### Scenario: Quiz disponible
- **WHEN** el usuario pulsa "Practicar" y el capítulo permite armar un quiz
- **THEN** el sistema navega a la pantalla de práctica

#### Scenario: Quiz no disponible
- **WHEN** el usuario pulsa "Practicar" y no se puede armar ninguna pregunta
- **THEN** el detalle muestra el aviso de que faltan tarjetas básicas y no navega

#### Scenario: Doble toque
- **WHEN** el usuario pulsa "Practicar" mientras el quiz aún se prepara
- **THEN** el segundo toque se ignora

### Requirement: Las acciones de capítulo en vuelo bloquean el diálogo y los errores se muestran sin perder el trabajo
Mientras una creación o un renombrado se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el principal, ignorar envíos repetidos y bloquear el cierre con Escape. Mientras un borrado está en curso, el botón SHALL mostrar "Borrando…". Si crear o renombrar falla, el sistema SHALL mostrar en el detalle del libro "No se pudo guardar el capítulo. Inténtalo de nuevo." con rol de alerta y el diálogo SHALL permanecer abierto con lo escrito.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear capítulo" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces antes de que termine la primera escritura
- **THEN** solo se crea un capítulo

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o el renombrado
- **THEN** el diálogo sigue abierto con el nombre escrito y el detalle muestra el mensaje de error con rol de alerta

### Requirement: Los diálogos de capítulos son accesibles
Todo diálogo de capítulos (crear/renombrar, confirmación) SHALL presentarse como diálogo modal con nombre accesible, campo con etiqueta asociada y cierre con Escape cuando no hay acción en vuelo. El botón "Borrar" de cada capítulo SHALL tener una etiqueta accesible que nombre el capítulo.

#### Scenario: Escape cierra
- **WHEN** el usuario pulsa Escape en un diálogo sin acción en vuelo
- **THEN** el diálogo se cierra como si hubiera cancelado

#### Scenario: Botón de borrar nombrado
- **WHEN** un lector de pantalla enfoca el botón de borrar del capítulo "Básicos"
- **THEN** anuncia "Borrar Básicos"
