# Spec Delta

## ADDED Requirements

### Requirement: Borrar un libro exige confirmación y borra también sus capítulos y tarjetas
El sistema SHALL pedir confirmación antes de borrar un libro en un diálogo "¿Borrar este libro?" que nombra el libro, indica cuántos capítulos y tarjetas se borrarán con él ("Se borrarán N capítulos y M tarjetas. Tu historial de repasos se conserva."), advierte que no se puede deshacer y ofrece "Cancelar" y "Borrar". Al confirmar, el sistema SHALL eliminar las tarjetas y los capítulos del libro y, al final, el propio libro, en lotes de hasta 450 operaciones; el historial de repasos y las estadísticas diarias NO SHALL tocarse. Mientras borra, el botón SHALL mostrar "Borrando…" y el diálogo quedar ocupado. Si el borrado falla, el diálogo SHALL permanecer abierto mostrando "No se pudo borrar el libro. Inténtalo de nuevo." y el libro SHALL seguir en la lista; reintentar borra lo que quede. Si el número de capítulos y tarjetas no se puede obtener, la confirmación SHALL decir "También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva." sin números y sin bloquear el borrado; sin conexión, el sistema NO SHALL pedir esos números.

#### Scenario: Confirmar borrado
- **WHEN** el usuario pulsa "Borrar" en un libro con 3 capítulos y 40 tarjetas y confirma
- **THEN** el libro, sus 3 capítulos y sus 40 tarjetas desaparecen del almacén, el libro sale de la lista y los registros de repaso siguen existiendo

#### Scenario: Conteos en la confirmación
- **WHEN** el usuario pulsa "Borrar" en un libro con 3 capítulos y 40 tarjetas
- **THEN** la confirmación muestra "Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva."

#### Scenario: Cancelar borrado
- **WHEN** el usuario pulsa "Cancelar" en la confirmación
- **THEN** nada se toca y el diálogo se cierra

#### Scenario: Falla el borrado
- **WHEN** el almacén rechaza el borrado
- **THEN** el diálogo sigue abierto con "No se pudo borrar el libro. Inténtalo de nuevo.", el libro sigue en la lista y el usuario puede reintentar o cancelar

#### Scenario: Conteo no disponible
- **WHEN** el conteo de capítulos y tarjetas falla al abrir la confirmación
- **THEN** la confirmación se abre igual y dice "También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva."

### Requirement: Sin conexión, las acciones que guardan libros no se ofrecen
Mientras no haya conexión, el sistema SHALL deshabilitar el botón principal de los diálogos de crear y editar un libro, de sus ajustes y de la confirmación de borrado, y mostrar dentro del diálogo "Necesitas conexión para guardar cambios."; "Cancelar" y Escape SHALL seguir cerrando el diálogo. Al volver la conexión, el botón SHALL habilitarse sin cerrar el diálogo ni perder lo escrito. Ver la Biblioteca ya leída y estudiar NO SHALL depender de la conexión.

#### Scenario: Crear sin conexión
- **WHEN** no hay conexión y el usuario abre "Nuevo libro" y escribe un nombre válido
- **THEN** "Crear libro" está deshabilitado, el diálogo muestra "Necesitas conexión para guardar cambios." y "Cancelar" lo cierra sin crear nada

#### Scenario: Ajustes sin conexión
- **WHEN** no hay conexión y el usuario abre los ajustes de un libro
- **THEN** el botón de guardar está deshabilitado y el diálogo muestra "Necesitas conexión para guardar cambios."

#### Scenario: Borrar sin conexión
- **WHEN** no hay conexión y el usuario pulsa "Borrar" en un libro
- **THEN** la confirmación se abre sin pedir los conteos, dice "También se borrarán sus capítulos y tarjetas…", el botón "Borrar" está deshabilitado y muestra "Necesitas conexión para guardar cambios."

#### Scenario: Vuelve la conexión
- **WHEN** un diálogo de libro está abierto sin conexión con cambios escritos y vuelve la conexión
- **THEN** su botón principal se habilita, lo escrito sigue y el diálogo no se cierra

## MODIFIED Requirements

### Requirement: La biblioteca lista los libros del usuario en su orden
El sistema SHALL mostrar en la Biblioteca únicamente los libros del usuario autenticado, ordenados por `order` ascendente, cada uno en una tarjeta de acrílico. Cada libro SHALL mostrar su nombre, su materia (`subject`) como etiqueta, su número de tarjetas (`cardCount`, o 0 si no tiene valor, con plural real: "1 tarjeta", "12 tarjetas") y su tanda de nuevas por día (`newCardsPerDay`). Tocar la tarjeta del libro SHALL abrir su detalle.

#### Scenario: Orden por `order`
- **WHEN** el usuario tiene libros con `order` 2, 0 y 1
- **THEN** la Biblioteca los presenta en el orden 0, 1, 2

#### Scenario: Libro sin contador guardado
- **WHEN** un libro no tiene `cardCount` almacenado
- **THEN** la Biblioteca muestra "0 tarjetas" para ese libro

#### Scenario: Abrir el detalle
- **WHEN** el usuario toca la tarjeta de un libro
- **THEN** el sistema navega al detalle de ese libro

#### Scenario: Sin sesión activa
- **WHEN** se intenta cargar o modificar libros sin un usuario autenticado
- **THEN** el sistema falla con un error explícito en vez de operar sobre datos de nadie

### Requirement: La Biblioteca refleja su estado de carga de forma honesta
El sistema SHALL mostrar el esqueleto de carga mientras lee los libros, el estado de error con "No pudimos cargar tus libros" y botón "Reintentar" si la lectura falla, el estado vacío con "Aún no tienes libros", una frase que invita a empezar y los botones "Crear libro" e "Importar libro" si no hay ninguno, y la lista con las acciones "Importar libro" y "Nuevo libro" en la cabecera cuando hay libros. La Biblioteca SHALL volver a leer los libros cada vez que se abre. Un fallo de lectura NUNCA SHALL pintarse como biblioteca vacía.

#### Scenario: Cargando
- **WHEN** la lectura de libros está en curso
- **THEN** la Biblioteca muestra el esqueleto marcado como ocupado, sin acciones de cabecera

#### Scenario: Falla la lectura
- **WHEN** la lectura de libros falla
- **THEN** la Biblioteca muestra "No pudimos cargar tus libros" con un mensaje y un botón "Reintentar" que repite la lectura

#### Scenario: Biblioteca vacía
- **WHEN** la lectura termina sin libros
- **THEN** la Biblioteca muestra "Aún no tienes libros" con los botones "Crear libro" e "Importar libro", y sin acciones en la cabecera

#### Scenario: Biblioteca con libros
- **WHEN** la lectura termina con al menos un libro
- **THEN** la cabecera muestra "Importar libro" y "Nuevo libro" y debajo la lista

### Requirement: Crear un libro pide solo su identidad y siembra el resto con valores por defecto
El sistema SHALL ofrecer un diálogo "Nuevo libro" con los campos nombre (obligatorio tras recortar espacios, máximo 120 caracteres), materia (texto libre opcional, con la pista "Si la dejas vacía, será «general»"). El diálogo NO SHALL ofrecer la dirección de estudio: al crear, el sistema SHALL guardar `studyDirection = forward`; al editar, SHALL conservar la que el libro ya tenga, incluso `both` en libros creados por versiones anteriores (el estudio bidireccional no está implementado y no se promete en la interfaz). Al guardar, el sistema SHALL recortar espacios de nombre y materia, usar "general" si la materia queda vacía, sembrar `newCardsPerDay` con el ajuste global del usuario (`defaultNewCardsPerDay`), sembrar `maxReviewsPerDay` con 200, asignar `order` igual al máximo actual más uno (0 si es el primer libro), iniciar `cardCount` en 0 y añadir el libro al final de la lista sin recargarla.

#### Scenario: Siembra de nuevas por día desde los ajustes del usuario
- **WHEN** el usuario tiene `defaultNewCardsPerDay = 7` y crea un libro
- **THEN** el libro se guarda con `newCardsPerDay = 7` y `maxReviewsPerDay = 200`

#### Scenario: Primer libro
- **WHEN** la biblioteca está vacía y el usuario crea un libro
- **THEN** el libro se guarda con `order = 0`, `cardCount = 0` y `studyDirection = forward`, sin que el diálogo haya mostrado ninguna opción de dirección

#### Scenario: Libro heredado con ambos sentidos
- **WHEN** el usuario edita el nombre de un libro guardado con `studyDirection = both`
- **THEN** el diálogo se abre sin opción de dirección, el guardado conserva `both` y la Biblioteca lo muestra igual que a los demás

#### Scenario: Libro al final
- **WHEN** existen libros con `order` 0 y 5 y el usuario crea otro
- **THEN** el nuevo libro se guarda con `order = 6` y aparece último en la lista

#### Scenario: Materia en blanco
- **WHEN** el usuario deja la materia vacía o escribe solo espacios y guarda
- **THEN** el libro se guarda con `subject = "general"` y el botón de guardar nunca se bloqueó por la materia

#### Scenario: Nombre vacío
- **WHEN** el usuario intenta guardar sin nombre o con solo espacios
- **THEN** el botón de guardar está deshabilitado y, si el campo fue tocado, se muestra "El nombre es obligatorio."

#### Scenario: Cancelar
- **WHEN** el usuario pulsa "Cancelar" o la tecla Escape
- **THEN** el diálogo se cierra sin crear nada

### Requirement: Los ajustes por libro controlan la tanda de nuevas y el tope de repasos
El sistema SHALL ofrecer, tanto desde la Biblioteca como desde el detalle del libro, un diálogo "Ajustes de «nombre»" con los campos "Nuevas por día" (`newCardsPerDay`, entero entre 0 y 999) y "Máx. repasos/día" (`maxReviewsPerDay`, entero entre 0 y 9999), precargados con los valores del libro y ambos obligatorios. Un valor fuera de rango o con decimales SHALL mostrar "Escribe un número entero entre 0 y 999." o "…entre 0 y 9999." y deshabilitar el botón de guardar. Al guardar, el sistema SHALL persistir únicamente esos dos campos como números. Un `maxReviewsPerDay` de 0 SHALL significar "sin tope" y el diálogo SHALL explicarlo.

#### Scenario: Precarga de valores
- **WHEN** el usuario abre los ajustes de un libro con `newCardsPerDay = 12` y `maxReviewsPerDay = 150`
- **THEN** los campos muestran 12 y 150

#### Scenario: Guardar solo los topes
- **WHEN** el usuario cambia "Nuevas por día" a 5 y guarda
- **THEN** el sistema persiste `{ newCardsPerDay: 5, maxReviewsPerDay: 150 }` y nada más del libro

#### Scenario: Valor negativo
- **WHEN** el usuario escribe -1 en cualquiera de los dos campos
- **THEN** el botón de guardar queda deshabilitado y se muestra el mensaje de rango

#### Scenario: Valor con decimales
- **WHEN** el usuario escribe 2.5 en "Nuevas por día"
- **THEN** el botón de guardar queda deshabilitado y se muestra "Escribe un número entero entre 0 y 999."

#### Scenario: Cero significa sin tope
- **WHEN** el usuario guarda `maxReviewsPerDay = 0`
- **THEN** el sistema lo acepta y el diálogo indica "0 = sin tope"

### Requirement: El detalle de un libro muestra su cabecera y maneja el libro inexistente
El sistema SHALL mostrar en el detalle del libro un enlace "← Biblioteca", el nombre del libro, su materia como etiqueta, los totales de tarjetas por estado ("dominadas" = en repaso, "en aprendizaje" = aprendiendo y reaprendiendo, "nuevas"), contados en el servidor sin leer las tarjetas, y un botón de ajustes del libro. Si se llega al detalle por navegación directa sin haber cargado la Biblioteca, el sistema SHALL cargarla. Si la carga de la Biblioteca falla, el detalle SHALL mostrar el estado de error con "Reintentar". Si la Biblioteca ya está cargada y el libro no existe, el sistema SHALL mostrar "Libro no encontrado" con la sugerencia de volver a la Biblioteca. Sin conexión, o si el conteo falla, la cabecera SHALL omitir los totales, nunca mostrarlos con 0 ni como error.

#### Scenario: Navegación directa
- **WHEN** el usuario abre la dirección del detalle de un libro sin pasar por la Biblioteca
- **THEN** el sistema carga la biblioteca y muestra la cabecera del libro

#### Scenario: Totales por estado
- **WHEN** un libro tiene 12 tarjetas en repaso, 3 aprendiendo, 1 reaprendiendo y 20 nuevas
- **THEN** la cabecera muestra 12 dominadas, 4 en aprendizaje y 20 nuevas, sin descargar las tarjetas

#### Scenario: Totales no disponibles
- **WHEN** no hay conexión o el conteo por estado falla
- **THEN** la cabecera muestra nombre, materia y botón de ajustes, sin los totales y sin mensaje de error

#### Scenario: Falla la carga de la biblioteca
- **WHEN** el usuario abre el detalle y la lectura de libros falla
- **THEN** el detalle muestra el estado de error con "Reintentar" en lugar de quedar vacío

#### Scenario: Libro borrado o ajeno
- **WHEN** la biblioteca está cargada y ningún libro tiene el identificador de la dirección
- **THEN** el detalle muestra "Libro no encontrado" y no muestra capítulos ni botón de estudiar

#### Scenario: Ajustes desde el detalle
- **WHEN** el usuario pulsa el botón de ajustes en la cabecera del detalle
- **THEN** se abre el mismo diálogo de ajustes del libro que en la Biblioteca

### Requirement: Estudiar un libro desde su detalle arranca una sesión o avisa que no hay nada
El sistema SHALL mostrar en el detalle del libro, una vez cargados sus capítulos, el botón "Estudiar este libro". Al pulsarlo, el sistema SHALL deshabilitar el botón mostrando "Preparando…", pedir la sesión del libro completo y, si contiene al menos una tarjeta lista, navegar a la pantalla de repaso; si no contiene ninguna, SHALL mostrar "Estás al día con este libro. No hay tarjetas para repasar ahora." sin salir del detalle. Si la preparación falla, el sistema SHALL mostrar un error con "Reintentar" y NUNCA el aviso de "al día". Qué tarjetas entran lo define la spec de cola diaria.

#### Scenario: Hay tarjetas listas
- **WHEN** el usuario pulsa "Estudiar este libro" y el libro tiene tarjetas listas
- **THEN** el sistema navega a la sesión de repaso

#### Scenario: Nada que estudiar
- **WHEN** el usuario pulsa "Estudiar este libro" y no hay tarjetas listas
- **THEN** el detalle muestra el aviso de que está al día y no navega

#### Scenario: Falla la preparación
- **WHEN** el usuario pulsa "Estudiar este libro" y la lectura de tarjetas falla
- **THEN** el detalle muestra un error con "Reintentar" y no dice que está al día

#### Scenario: Doble toque
- **WHEN** el usuario pulsa "Estudiar este libro" mientras la sesión aún se está preparando
- **THEN** el segundo toque se ignora

### Requirement: Las acciones en vuelo bloquean los diálogos y los errores se muestran sin perder el trabajo
Mientras una creación, edición o ajuste se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el botón principal, ignorar envíos repetidos y bloquear el cierre con Escape. Si la acción falla, el diálogo SHALL permanecer abierto con lo escrito y mostrar dentro, con rol de alerta, "No se pudo guardar el libro. Inténtalo de nuevo." o "No se pudieron guardar los ajustes. Inténtalo de nuevo."; el diálogo solo se cierra cuando la acción termina con éxito o el usuario cancela.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear libro" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces seguidas antes de que termine la primera escritura
- **THEN** solo se crea un libro

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o edición
- **THEN** el diálogo sigue abierto con los valores escritos y muestra dentro el mensaje de error con rol de alerta

#### Scenario: Éxito limpia el error anterior
- **WHEN** una acción falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra

## REMOVED Requirements

### Requirement: Borrar un libro exige confirmación y quita solo el libro
**Reason**: Dejar capítulos y tarjetas huérfanos era el hallazgo 1 de prioridad A. Sustituido por "Borrar un libro exige confirmación y borra también sus capítulos y tarjetas".
**Migration**: Ninguna en datos. Los huérfanos que ya existan en producción no se tocan; no son visibles.
