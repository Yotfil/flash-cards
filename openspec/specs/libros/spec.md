# Libros Specification

## Purpose

Organizar el estudio en "libros": la unidad en la que el usuario agrupa sus tarjetas por tema y a la que pertenecen los topes diarios (`newCardsPerDay`, `maxReviewsPerDay`). Cubre la pantalla Biblioteca (listar, crear, editar, ajustar y borrar libros), la cabecera del detalle de un libro y el disparador para estudiarlo. Qué tarjetas entran en una sesión lo decide la spec de cola diaria; los capítulos tienen su propia spec.

## Requirements

### Requirement: La biblioteca lista los libros del usuario en su orden
El sistema SHALL mostrar en la Biblioteca únicamente los libros del usuario autenticado, ordenados por `order` ascendente. Cada libro SHALL mostrar su nombre, su materia (`subject`) como etiqueta, su número de tarjetas (`cardCount`, o 0 si no tiene valor) y su tanda de nuevas por día (`newCardsPerDay`). Tocar el nombre de un libro SHALL abrir su detalle.

#### Scenario: Orden por `order`
- **WHEN** el usuario tiene libros con `order` 2, 0 y 1
- **THEN** la Biblioteca los presenta en el orden 0, 1, 2

#### Scenario: Libro sin contador guardado
- **WHEN** un libro no tiene `cardCount` almacenado
- **THEN** la Biblioteca muestra "0 tarjetas" para ese libro

#### Scenario: Abrir el detalle
- **WHEN** el usuario toca el nombre de un libro
- **THEN** el sistema navega al detalle de ese libro

#### Scenario: Sin sesión activa
- **WHEN** se intenta cargar o modificar libros sin un usuario autenticado
- **THEN** el sistema falla con un error explícito en vez de operar sobre datos de nadie

### Requirement: La Biblioteca refleja su estado de carga de forma honesta
El sistema SHALL mostrar un estado de carga con placeholders (no un spinner) mientras lee los libros, un estado de error con mensaje y botón "Reintentar" si la lectura falla, un estado vacío con acciones para crear o importar un libro si no hay ninguno, y la lista con las acciones "Importar libro" y "Nuevo libro" en la cabecera cuando hay libros. La Biblioteca SHALL volver a leer los libros cada vez que se abre.

#### Scenario: Cargando
- **WHEN** la lectura de libros está en curso
- **THEN** la Biblioteca muestra placeholders animados marcados como ocupados, sin acciones de cabecera

#### Scenario: Falla la lectura
- **WHEN** la lectura de libros falla
- **THEN** la Biblioteca muestra "No pudimos cargar tus libros" con un mensaje y un botón "Reintentar" que repite la lectura

#### Scenario: Biblioteca vacía
- **WHEN** la lectura termina sin libros
- **THEN** la Biblioteca muestra "Aún no tienes libros" con los botones "Crear libro" e "Importar libro", y sin acciones en la cabecera

#### Scenario: Biblioteca con libros
- **WHEN** la lectura termina con al menos un libro
- **THEN** la cabecera muestra "Importar libro" y "Nuevo libro" y debajo la lista

### Requirement: Cada libro leído del almacén se valida antes de usarse
El sistema SHALL validar cada libro leído del almacén contra su contrato (`name`, `subject`, `studyDirection` en {`forward`, `both`}, `newCardsPerDay`, `maxReviewsPerDay`, `order`, `cardCount` opcional, fechas de creación y actualización) antes de mostrarlo. Si un libro no cumple, la carga completa SHALL fallar de forma visible en vez de mostrar un libro a medio formar.

#### Scenario: Libro corrupto en el almacén
- **WHEN** uno de los libros almacenados carece de un campo obligatorio o tiene un `studyDirection` desconocido
- **THEN** la Biblioteca entra en estado de error y no muestra ningún libro

### Requirement: Crear un libro pide solo su identidad y siembra el resto con valores por defecto
El sistema SHALL ofrecer un diálogo "Nuevo libro" con los campos nombre (obligatorio, máximo 120 caracteres), materia (texto libre, precargado con "general") y dirección de estudio (`forward` "Sólo anverso → reverso" por defecto, o `both` "Ambos sentidos"). Al guardar, el sistema SHALL recortar espacios de nombre y materia, usar "general" si la materia queda vacía, sembrar `newCardsPerDay` con el ajuste global del usuario (`defaultNewCardsPerDay`, o 20 si no hay sesión con ajustes), sembrar `maxReviewsPerDay` con 200, asignar `order` igual al máximo actual más uno (0 si es el primer libro), iniciar `cardCount` en 0 y añadir el libro al final de la lista sin recargarla.

#### Scenario: Siembra de nuevas por día desde los ajustes del usuario
- **WHEN** el usuario tiene `defaultNewCardsPerDay = 7` y crea un libro
- **THEN** el libro se guarda con `newCardsPerDay = 7` y `maxReviewsPerDay = 200`

#### Scenario: Primer libro
- **WHEN** la biblioteca está vacía y el usuario crea un libro
- **THEN** el libro se guarda con `order = 0` y `cardCount = 0`

#### Scenario: Libro al final
- **WHEN** existen libros con `order` 0 y 5 y el usuario crea otro
- **THEN** el nuevo libro se guarda con `order = 6` y aparece último en la lista

#### Scenario: Materia en blanco
- **WHEN** el usuario escribe solo espacios en materia y guarda
- **THEN** el libro se guarda con `subject = "general"`

#### Scenario: Nombre vacío
- **WHEN** el usuario intenta guardar sin nombre
- **THEN** el botón de guardar está deshabilitado y, si el campo fue tocado, se muestra "El nombre es obligatorio."

#### Scenario: Cancelar
- **WHEN** el usuario pulsa "Cancelar" o la tecla Escape
- **THEN** el diálogo se cierra sin crear nada

### Requirement: Editar un libro cambia su identidad y conserva sus topes
El sistema SHALL abrir el mismo diálogo en modo "Editar libro", precargado con nombre, materia y dirección de estudio del libro. Al guardar, el sistema SHALL conservar los `newCardsPerDay` y `maxReviewsPerDay` que el libro ya tenía, persistir los cambios y reflejarlos en la lista sin recargarla.

#### Scenario: Editar conserva los topes
- **WHEN** un libro tiene `newCardsPerDay = 12` y `maxReviewsPerDay = 150` y el usuario cambia solo su nombre
- **THEN** el libro guarda el nuevo nombre y mantiene `newCardsPerDay = 12` y `maxReviewsPerDay = 150`

#### Scenario: Cambio visible al instante
- **WHEN** el usuario guarda la edición con éxito
- **THEN** el diálogo se cierra y la lista muestra el nuevo nombre sin volver a leer el almacén

### Requirement: Los ajustes por libro controlan la tanda de nuevas y el tope de repasos
El sistema SHALL ofrecer, tanto desde la Biblioteca como desde el detalle del libro, un diálogo "Ajustes de «nombre»" con los campos "Nuevas por día" (`newCardsPerDay`) y "Máx. repasos/día" (`maxReviewsPerDay`), precargados con los valores del libro, ambos obligatorios y mayores o iguales a 0. Al guardar, el sistema SHALL persistir únicamente esos dos campos como números. Un `maxReviewsPerDay` de 0 SHALL significar "sin tope" y el diálogo SHALL explicarlo.

#### Scenario: Precarga de valores
- **WHEN** el usuario abre los ajustes de un libro con `newCardsPerDay = 12` y `maxReviewsPerDay = 150`
- **THEN** los campos muestran 12 y 150

#### Scenario: Guardar solo los topes
- **WHEN** el usuario cambia "Nuevas por día" a 5 y guarda
- **THEN** el sistema persiste `{ newCardsPerDay: 5, maxReviewsPerDay: 150 }` y nada más del libro

#### Scenario: Valor negativo
- **WHEN** el usuario escribe -1 en cualquiera de los dos campos
- **THEN** el botón de guardar queda deshabilitado

#### Scenario: Cero significa sin tope
- **WHEN** el usuario guarda `maxReviewsPerDay = 0`
- **THEN** el sistema lo acepta y el diálogo indica "0 = sin tope"

### Requirement: Borrar un libro exige confirmación y quita solo el libro
El sistema SHALL pedir confirmación antes de borrar un libro, en un diálogo "¿Borrar este libro?" que nombra el libro y advierte que no se puede deshacer, con botones "Cancelar" y "Borrar". Al confirmar, el sistema SHALL eliminar únicamente el registro del libro y quitarlo de la lista; sus capítulos y tarjetas NO se eliminan ni se modifican (quedan huérfanos en el almacén). Si el borrado falla, el sistema SHALL mostrar un mensaje de error en la Biblioteca y el libro SHALL seguir en la lista.

#### Scenario: Confirmar borrado
- **WHEN** el usuario pulsa "Borrar" en un libro y confirma
- **THEN** el libro desaparece de la lista y ya no existe en el almacén

#### Scenario: Cancelar borrado
- **WHEN** el usuario pulsa "Cancelar" en la confirmación
- **THEN** el libro no se toca y el diálogo se cierra

#### Scenario: Capítulos y tarjetas no se borran en cascada
- **WHEN** se borra un libro que tenía capítulos y tarjetas
- **THEN** esos capítulos y tarjetas permanecen en el almacén sin cambios

#### Scenario: Falla el borrado
- **WHEN** el almacén rechaza el borrado
- **THEN** la confirmación se cierra, la Biblioteca muestra "No se pudo borrar el libro. Inténtalo de nuevo." y el libro sigue en la lista

### Requirement: El contador de tarjetas del libro se mantiene al crear y borrar tarjetas
El sistema SHALL mantener `cardCount` como un conteo denormalizado que se incrementa o decrementa de forma atómica cada vez que se crean o borran tarjetas del libro, y SHALL reflejar el cambio en la lista de la Biblioteca sin recargarla. El contador no se recalcula a partir de las tarjetas reales.

#### Scenario: Crear tarjetas suma
- **WHEN** se crean 3 tarjetas en un libro con `cardCount = 10`
- **THEN** el libro pasa a `cardCount = 13` en el almacén y en la Biblioteca

#### Scenario: Borrar tarjetas resta
- **WHEN** se borran 2 tarjetas de un libro con `cardCount = 13`
- **THEN** el libro pasa a `cardCount = 11`

#### Scenario: Libro añadido por importación
- **WHEN** un libro se crea fuera del diálogo (por ejemplo, al importar) y la Biblioteca ya está cargada
- **THEN** el libro aparece al final de la lista sin volver a leer el almacén

### Requirement: El detalle de un libro muestra su cabecera y maneja el libro inexistente
El sistema SHALL mostrar en el detalle del libro un enlace "← Biblioteca", el nombre del libro, su materia como etiqueta y un botón de ajustes del libro. Si se llega al detalle por navegación directa sin haber cargado la Biblioteca, el sistema SHALL cargarla. Si la Biblioteca ya está cargada y el libro no existe, el sistema SHALL mostrar "Libro no encontrado" con la sugerencia de volver a la Biblioteca.

#### Scenario: Navegación directa
- **WHEN** el usuario abre la dirección del detalle de un libro sin pasar por la Biblioteca
- **THEN** el sistema carga la biblioteca y muestra la cabecera del libro

#### Scenario: Libro borrado o ajeno
- **WHEN** la biblioteca está cargada y ningún libro tiene el identificador de la dirección
- **THEN** el detalle muestra "Libro no encontrado" y no muestra capítulos ni botón de estudiar

#### Scenario: Ajustes desde el detalle
- **WHEN** el usuario pulsa el botón de ajustes en la cabecera del detalle
- **THEN** se abre el mismo diálogo de ajustes del libro que en la Biblioteca

### Requirement: Estudiar un libro desde su detalle arranca una sesión o avisa que no hay nada
El sistema SHALL mostrar en el detalle del libro, una vez cargados sus capítulos, el botón "Estudiar este libro". Al pulsarlo, el sistema SHALL deshabilitar el botón mostrando "Preparando…", pedir la sesión del libro completo y, si contiene al menos una tarjeta lista, navegar a la pantalla de repaso; si no contiene ninguna, SHALL mostrar "Estás al día con este libro. No hay tarjetas para repasar ahora." sin salir del detalle. Qué tarjetas entran lo define la spec de cola diaria.

#### Scenario: Hay tarjetas listas
- **WHEN** el usuario pulsa "Estudiar este libro" y el libro tiene tarjetas listas
- **THEN** el sistema navega a la sesión de repaso

#### Scenario: Nada que estudiar
- **WHEN** el usuario pulsa "Estudiar este libro" y no hay tarjetas listas
- **THEN** el detalle muestra el aviso de que está al día y no navega

#### Scenario: Doble toque
- **WHEN** el usuario pulsa "Estudiar este libro" mientras la sesión aún se está preparando
- **THEN** el segundo toque se ignora

### Requirement: Las acciones en vuelo bloquean los diálogos y los errores se muestran sin perder el trabajo
Mientras una creación, edición o ajuste se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el botón principal, ignorar envíos repetidos y bloquear el cierre con Escape. Mientras un borrado está en curso, el botón SHALL mostrar "Borrando…". Si la acción falla, el sistema SHALL mostrar en la pantalla un mensaje de error con rol de alerta ("No se pudo guardar el libro. Inténtalo de nuevo." o "No se pudieron guardar los ajustes. Inténtalo de nuevo.") y el diálogo de creación/edición/ajustes SHALL permanecer abierto con lo escrito.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear libro" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces seguidas antes de que termine la primera escritura
- **THEN** solo se crea un libro

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o edición
- **THEN** el diálogo sigue abierto con los valores escritos y la Biblioteca muestra el mensaje de error con rol de alerta

#### Scenario: Éxito limpia el error anterior
- **WHEN** una acción falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra

### Requirement: Los diálogos de libros son accesibles
Todo diálogo de libros (crear/editar, ajustes, confirmación) SHALL presentarse como diálogo modal con nombre accesible, campos con etiquetas asociadas, cierre con Escape cuando no hay acción en vuelo, y los botones de icono (ajustes, borrar) SHALL tener etiqueta accesible que nombre el libro.

#### Scenario: Escape cierra
- **WHEN** el usuario pulsa Escape en un diálogo sin acción en vuelo
- **THEN** el diálogo se cierra como si hubiera cancelado

#### Scenario: Botón de ajustes nombrado
- **WHEN** un lector de pantalla enfoca el botón de ajustes del libro "Inglés"
- **THEN** anuncia "Ajustes de Inglés"
