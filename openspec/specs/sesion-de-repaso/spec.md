# Sesión de repaso Specification

## Purpose

Guiar al usuario tarjeta por tarjeta a través de una lista ya armada (la cola de Hoy, o las tarjetas listas de un libro o capítulo): mostrar el anverso, dejar que recuerde, revelar la respuesta y recoger una calificación honesta de 1 a 4 que se persiste de forma íntegra junto con su historial y las estadísticas del día. Es el momento de estudio propiamente dicho; la selección de qué tarjetas entran vive en la spec de cola diaria y el cálculo de intervalos en la spec de programación espaciada.

## Requirements

### Requirement: La sesión ocupa toda la pantalla, sin la navegación principal
El sistema SHALL presentar la sesión de repaso en una pantalla propia, sin las pestañas de navegación (Hoy, Biblioteca, Progreso, Ajustes), accesible solo con sesión iniciada. La pantalla SHALL mostrar únicamente una barra superior discreta de acrílico tenue (barra de progreso, contador "Quedan N" y "Salir") y la tarjeta, que SHALL ser una superficie sólida de alto contraste, sin acrílico. Si se llega a la pantalla sin una lista entregada para estudiar (recarga del navegador, URL directa o botón "atrás"), el sistema SHALL redirigir a Hoy.

#### Scenario: Entrar desde Hoy con tarjetas
- **WHEN** el usuario pulsa empezar en Hoy y la cola tiene al menos una tarjeta
- **THEN** la app abre la pantalla de repaso a pantalla completa, sin navegación, mostrando la primera tarjeta

#### Scenario: Abrir la pantalla sin sesión activa
- **WHEN** el usuario llega a la pantalla de repaso sin una lista entregada (por ejemplo, recargando el navegador en esa ruta)
- **THEN** la app lo redirige a Hoy en vez de mostrar una sesión vacía

#### Scenario: Volver atrás tras terminar
- **WHEN** el usuario terminó una sesión, está en Hoy y pulsa "atrás" en el navegador
- **THEN** la app lo devuelve a Hoy sin mostrar la sesión anterior ni su cierre

### Requirement: Una sesión arranca con una lista ya curada y la recorre en orden
El sistema SHALL iniciar la sesión con la lista de tarjetas entregada por la cola diaria o por "Estudiar este libro" / "Estudiar este capítulo", en ese mismo orden y sin volver a filtrarla. Cada entrada a la pantalla SHALL arrancar una sesión nueva: progreso en cero, sin difíciles, sin avisos; nunca se retoma una sesión anterior. La lista SHALL consumirse al arrancar, de modo que una segunda entrada sin nueva entrega no encuentre nada. Si la lista está vacía, la sesión NO se inicia y la app vuelve a Hoy.

#### Scenario: Lista vacía no entra
- **WHEN** se intenta iniciar una sesión con cero tarjetas
- **THEN** la sesión no arranca y la app muestra Hoy

#### Scenario: Orden respetado
- **WHEN** la lista recibida es A, B, C
- **THEN** la sesión muestra A primero, luego B y luego C

#### Scenario: Siempre nueva
- **WHEN** el usuario termina una sesión con 3 difíciles y arranca otra desde Hoy
- **THEN** la nueva sesión empieza con progreso en cero y ninguna difícil

### Requirement: Cada tarjeta se presenta en dos momentos: pregunta y respuesta
El sistema SHALL mostrar primero solo el anverso de la tarjeta, centrado y grande, con un botón único "Mostrar respuesta". Al revelar, la tarjeta SHALL voltearse en tres dimensiones sobre su eje vertical para mostrar el reverso y, si la tarjeta tiene ejemplo, el ejemplo debajo del reverso; el botón SHALL sustituirse por el componente de calificación, cuyas opciones aparecen en cascada. Antes de revelar NO se muestran opciones de calificación. Con la preferencia de reducir movimiento activa, el cambio SHALL ser inmediato, sin volteo ni cascada.

#### Scenario: Momento pregunta
- **WHEN** se muestra una tarjeta básica
- **THEN** se ve su anverso, el botón "Mostrar respuesta" y ningún cerebro de calificación

#### Scenario: Momento respuesta
- **WHEN** el usuario revela la tarjeta
- **THEN** la tarjeta se voltea, se ven anverso y reverso, desaparece "Mostrar respuesta" y aparecen los cuatro cerebros

#### Scenario: Tarjeta con ejemplo
- **WHEN** el usuario revela una tarjeta que tiene ejemplo
- **THEN** el ejemplo se lee debajo del reverso, diferenciado tipográficamente

#### Scenario: Reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento y revela
- **THEN** el reverso y los cerebros aparecen de inmediato, sin volteo ni cascada

### Requirement: Revelar se puede hacer con un toque, con el botón o con la barra espaciadora
El sistema SHALL revelar la respuesta al tocar en cualquier parte del área de la tarjeta, al pulsar "Mostrar respuesta" o al pulsar Espacio con la tarjeta sin revelar. Revelar SHALL ser idempotente: una segunda acción de revelar no cambia nada (ni recalcula la sugerencia).

#### Scenario: Toque sobre la tarjeta
- **WHEN** el usuario toca el área del anverso sin haber revelado
- **THEN** la respuesta se revela

#### Scenario: Espacio antes de revelar
- **WHEN** la tarjeta no está revelada y el usuario pulsa Espacio
- **THEN** la respuesta se revela y la página no se desplaza

#### Scenario: Volver a tocar ya revelada
- **WHEN** la tarjeta ya está revelada y el usuario vuelve a tocar el área de la tarjeta
- **THEN** no ocurre nada

### Requirement: Las tarjetas cloze se muestran como un solo texto con huecos
Para una tarjeta de tipo cloze, el sistema SHALL mostrar el texto del anverso con cada hueco marcado (`{{...}}` con contenido no vacío) sustituido por "[…]" antes de revelar, y con el contenido del hueco resaltado en el color de acento al revelar. Un marcador vacío (`{{}}` o solo espacios) SHALL tratarse como texto literal. Todos los huecos de la tarjeta se ocultan y revelan a la vez. El reverso de una cloze no se muestra.

#### Scenario: Cloze sin revelar
- **WHEN** se muestra la tarjeta cloze "El {{gato}} es {{negro}}"
- **THEN** se lee "El […] es […]"

#### Scenario: Cloze revelada
- **WHEN** el usuario revela esa tarjeta
- **THEN** se lee "El gato es negro" con "gato" y "negro" resaltados en acento, y los espacios interiores del marcador recortados

#### Scenario: Marcador vacío
- **WHEN** el anverso contiene "{{}}" o "{{   }}"
- **THEN** ese fragmento se muestra tal cual, sin convertirse en hueco

### Requirement: La dirección de la tarjeta no altera qué lado se muestra
El sistema SHALL mostrar siempre el campo anverso como pregunta y el campo reverso como respuesta, con independencia de la dirección de la tarjeta o de la dirección de estudio del libro.

#### Scenario: Libro configurado en ambas direcciones
- **WHEN** un libro tiene dirección de estudio "ambas" y se repasa una de sus tarjetas
- **THEN** la sesión muestra el anverso y, al revelar, el reverso, igual que en un libro de una sola dirección

### Requirement: La calificación se hace con cuatro cerebros en fila, un toque cada uno
El sistema SHALL presentar, tras revelar, el microcopy "¿Qué tan bien la recordaste?" y cuatro opciones en fila: "Otra vez" (1, rojo), "Difícil" (2, naranja), "Bien" (3, amarillo) y "Fácil" (4, verde). Cada opción SHALL ser un botón independiente y amplio que emite su grado. La opción N SHALL mostrar cuatro cerebros dibujados como trazos propios (no emoji), grandes y con relleno vivo, con exactamente N activos en su color y el resto apagados, para que el conteo diferencie sin depender del color. En escritorio la fila SHALL tener un ancho máximo de lectura. Al tocar una opción, esta SHALL confirmar el toque con un breve realce en su color. La escala rojo→verde SHALL reservarse a este componente.

#### Scenario: Orden y conteo
- **WHEN** se muestran las opciones de calificación
- **THEN** de izquierda a derecha se ven 1, 2, 3 y 4 cerebros activos con las etiquetas "Otra vez", "Difícil", "Bien" y "Fácil"

#### Scenario: Un toque califica
- **WHEN** el usuario toca la opción con tres cerebros
- **THEN** se emite el grado 3 y la tarjeta se califica como "Bien"

### Requirement: Cada opción muestra cuándo volvería la tarjeta
El sistema SHALL mostrar en cada opción el intervalo de retorno previsto si se eligiera ese grado, en formato humano con minutos, horas, días, meses y años (ver spec de programación espaciada), tanto visible como en la etiqueta accesible del botón ("<etiqueta>, vuelve en <intervalo>"). Las previsualizaciones SHALL calcularse al mostrar la tarjeta, a partir de su estado de programación actual, y son informativas: lo que se guarda se calcula en el instante de la calificación (ver spec de programación espaciada).

#### Scenario: Intervalos visibles por opción
- **WHEN** la previsualización indica vencimientos en 1 minuto, 6 minutos, 10 minutos y 8 días para los grados 1 a 4
- **THEN** las opciones muestran "1 min", "6 min", "10 min" y "8 días"

#### Scenario: Etiqueta accesible
- **WHEN** un lector de pantalla enfoca la opción "Bien" con intervalo de 3 días
- **THEN** anuncia "Bien, vuelve en 3 días"

#### Scenario: Lo guardado se calcula al tocar
- **WHEN** la tarjeta se mostró a las 10:00:00 y el usuario toca "Bien" a las 10:00:40
- **THEN** la programación guardada tiene como último repaso las 10:00:40, no las 10:00:00

### Requirement: Atajos de teclado 1-4 para calificar, solo con la respuesta revelada
El sistema SHALL calificar con las teclas 1, 2, 3 y 4 únicamente cuando la tarjeta está revelada y la sesión activa. En dispositivos con teclado, cada opción SHALL mostrar su número como pista de atajo; en pantallas táctiles sin teclado la pista SHALL ocultarse. Antes de revelar, esas teclas NO tienen efecto.

#### Scenario: Tecla con respuesta revelada
- **WHEN** la tarjeta está revelada y el usuario pulsa "4"
- **THEN** la tarjeta se califica como "Fácil"

#### Scenario: Tecla sin revelar
- **WHEN** la tarjeta no está revelada y el usuario pulsa "2"
- **THEN** no ocurre nada

#### Scenario: Pista oculta en táctil
- **WHEN** la sesión se usa en un teléfono sin teclado
- **THEN** las opciones no muestran los números de atajo

### Requirement: Sugerencia de calificación por velocidad de recuerdo, opcional y nunca automática
Con el ajuste "Sugerir calificación por tiempo" activo (por defecto lo está), el sistema SHALL medir la **latencia de recuerdo** (desde mostrar el anverso hasta revelar) y proponer: hasta 1500 ms → "Fácil" (4); de 1501 a 7000 ms → "Bien" (3); más de 7000 ms → "Difícil" (2). NUNCA sugiere "Otra vez" (1). La sugerencia solo resalta la opción (anillo de acento, insignia "sugerido" y "(sugerido)" en la etiqueta accesible); el usuario decide. Con el ajuste apagado no hay sugerencia. El sistema SHALL leer el ajuste tal como está guardado en el perfil, sin un valor de respaldo distinto del de su única fuente. La latencia de recuerdo NO se guarda.

#### Scenario: Recuerdo instantáneo
- **WHEN** el usuario revela a los 1500 ms o antes
- **THEN** se resalta "Fácil"

#### Scenario: Recuerdo normal
- **WHEN** el usuario revela entre 1501 y 7000 ms
- **THEN** se resalta "Bien"

#### Scenario: Recuerdo lento
- **WHEN** el usuario revela después de 7000 ms
- **THEN** se resalta "Difícil", nunca "Otra vez"

#### Scenario: Ajuste apagado
- **WHEN** el usuario desactivó la sugerencia en Ajustes
- **THEN** ninguna opción aparece resaltada al revelar

### Requirement: La sugerencia se confirma con Enter o Espacio, o se ignora eligiendo otra opción
Con la tarjeta revelada, el sistema SHALL calificar con el grado sugerido al pulsar Enter o Espacio. Si no hay sugerencia, Enter y Espacio NO califican. Tocar otra opción o pulsar otro número SHALL calificar con ese grado, ignorando la sugerencia.

#### Scenario: Confirmar con Enter
- **WHEN** la sugerencia es "Bien" y el usuario pulsa Enter
- **THEN** la tarjeta se califica como "Bien"

#### Scenario: Enter sin sugerencia
- **WHEN** el ajuste está apagado, la tarjeta está revelada y el usuario pulsa Enter
- **THEN** no ocurre nada

#### Scenario: Elegir distinto a lo sugerido
- **WHEN** la sugerencia es "Fácil" y el usuario toca "Otra vez"
- **THEN** la tarjeta se califica como "Otra vez"

### Requirement: Se mide el tiempo de respuesta de cada tarjeta
El sistema SHALL registrar, con cada calificación, la **duración del repaso** en milisegundos: desde que se mostró el anverso de esa aparición hasta el primer toque de calificación de esa aparición. Cada aparición de una tarjeta reencolada SHALL medir su propia duración y escribir su propio registro. La duración NO SHALL incluir tiempo de red ni tener tope. SHALL guardarse en el historial del repaso aunque hoy no se use para otra cosa.

#### Scenario: Duración registrada
- **WHEN** una tarjeta se muestra, se revela a los 3 s y se califica a los 8 s
- **THEN** el historial guarda una duración de aproximadamente 8000 ms

#### Scenario: Dos apariciones, dos duraciones
- **WHEN** una tarjeta se califica "Otra vez" a los 9 s, vuelve al final y se califica "Bien" a los 1,5 s
- **THEN** el historial tiene dos registros, con duraciones de aproximadamente 9000 ms y 1500 ms

### Requirement: Calificar persiste todo o nada: tarjeta, historial y estadísticas del día
Al calificar, el sistema SHALL calcular la nueva programación con el instante de la calificación y guardar en una sola operación indivisible: (a) el nuevo estado de programación de la tarjeta (y su fecha de actualización); (b) un registro nuevo e inmutable en el historial de repasos; y (c) los incrementos de las estadísticas del día de estudio. Si cualquiera de las tres partes no puede guardarse, NO se guarda ninguna. La sesión NO SHALL esperar la confirmación del servidor para avanzar: la operación queda guardada en el dispositivo y se envía cuando hay conexión.

#### Scenario: Todo queda guardado
- **WHEN** la calificación se guarda con éxito
- **THEN** la tarjeta tiene su nueva programación, existe un registro nuevo en el historial y las estadísticas del día reflejan el repaso

#### Scenario: Nada queda a medias
- **WHEN** la operación de guardado falla
- **THEN** la tarjeta conserva su programación anterior, no hay registro nuevo y las estadísticas del día no cambian

#### Scenario: Avanza sin esperar
- **WHEN** el usuario califica y el servidor tarda tres segundos en confirmar
- **THEN** la siguiente tarjeta aparece de inmediato, sin esperar esos tres segundos

### Requirement: El registro del historial captura el repaso tal como ocurrió
Cada registro del historial SHALL incluir: identificador de la tarjeta, libro, grado (1-4), estado de la tarjeta ANTES del repaso, los valores de programación previos que entrega el algoritmo (vencimiento, estabilidad, dificultad, días transcurridos, días transcurridos del repaso anterior, días programados), el instante del repaso y la duración en ms. El historial SHALL ser solo de añadido: un registro nunca se modifica ni se borra.

#### Scenario: Registro de una tarjeta nueva
- **WHEN** se califica con "Bien" una tarjeta que estaba en estado "nueva"
- **THEN** el registro guarda grado 3, estado "nueva", el instante de la calificación y la duración

### Requirement: Las estadísticas del día se acreditan al día de estudio del usuario
El sistema SHALL acreditar cada calificación al día de estudio calculado con la zona horaria y la hora de inicio del día del usuario (ver spec de cola diaria), e incrementar: repasos completados (+1 siempre), el conteo del grado elegido (+1 en "otra vez", "difícil", "bien" o "fácil") y, según el estado previo de la tarjeta: si era "nueva", las nuevas introducidas de su libro (+1); si no, los repasos completados de su libro (+1). Los contadores no tocados se consideran cero.

#### Scenario: Primera vista de una nueva
- **WHEN** se califica una tarjeta en estado "nueva" del libro L
- **THEN** repasos completados +1, el conteo del grado +1, nuevas introducidas de L +1 y los repasos completados de L sin cambio

#### Scenario: Repaso de una vencida
- **WHEN** se califica una tarjeta en repaso del libro L
- **THEN** repasos completados +1, el conteo del grado +1, repasos completados de L +1 y las nuevas introducidas de L sin cambio

#### Scenario: Madrugada
- **WHEN** el usuario califica a la 01:30 local con hora de inicio del día 4
- **THEN** la estadística se acredita al día anterior

### Requirement: El progreso de la sesión se muestra de forma discreta
El sistema SHALL mostrar en la barra superior el contador "Quedan N", donde N es cuántas apariciones faltan en la cola de la sesión (contando las tarjetas reencoladas), y una barra de progreso tenue cuyo ancho es el porcentaje de tarjetas que ya salieron de la sesión sobre las tarjetas distintas con que arrancó. Una tarjeta devuelta por un rechazo SHALL hacer retroceder la barra.

#### Scenario: Primera tarjeta de cinco
- **WHEN** empieza una sesión de cinco tarjetas
- **THEN** el contador muestra "Quedan 5" y la barra está en 0 %

#### Scenario: Tras calificar dos
- **WHEN** el usuario ha calificado dos de cinco tarjetas y ambas salieron de la sesión
- **THEN** el contador muestra "Quedan 3" y la barra está al 40 %

#### Scenario: Una vuelve
- **WHEN** en una sesión de cinco el usuario califica la primera y esta sigue lista para hoy
- **THEN** el contador sigue en "Quedan 5" y la barra sigue en 0 %

#### Scenario: Queda una
- **WHEN** falta una sola aparición
- **THEN** el contador muestra "Queda 1"

### Requirement: La sesión termina con un cierre breve y satisfactorio
Al salir de la sesión la última tarjeta, el sistema SHALL mostrar una pantalla de cierre con un anillo que se completa en el color de acento seguido de una marca de verificación, el título "Sesión terminada", "Repasaste N tarjetas." con plural real y N igual a las tarjetas distintas de la sesión, el conteo por calificación (otra vez, difícil, bien, fácil; cuenta calificaciones, con sus marcas de color y el número visible), la nota "Las que más te costaron volverán antes.", un espacio reservado para el bloque de práctica con IA (ver spec de práctica con IA) y el botón "Volver a Hoy", que lleva a Hoy. El número SHALL subir de 0 al total mientras el anillo se completa; con reducir movimiento SHALL mostrarse directo. Al terminar SHALL dejar de mostrar previsualizaciones y sugerencias.

#### Scenario: Fin de sesión
- **WHEN** el usuario califica la última tarjeta, esta sale de la sesión y el guardado se acepta
- **THEN** se ve "Sesión terminada", "Repasaste 20 tarjetas." y el desglose por calificación, y "Volver a Hoy" lleva a Hoy

#### Scenario: Una sola tarjeta
- **WHEN** la sesión tenía una tarjeta distinta, calificada dos veces (Otra vez y Bien)
- **THEN** el cierre dice "Repasaste 1 tarjeta." y el desglose muestra 1 en "Otra vez" y 1 en "Bien"

#### Scenario: Cierre con reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento
- **THEN** el anillo, la marca y el número aparecen completos de inmediato

### Requirement: La sesión recuerda sus tarjetas difíciles y las entrega a la práctica con IA
El sistema SHALL conservar, durante la sesión, la lista de tarjetas cuya calificación guardada con éxito fue "Otra vez" (1) o "Difícil" (2), en orden de calificación y sin repetir una tarjeta. Al mostrar la pantalla de cierre y al pulsar "Salir", el sistema SHALL entregar esa lista a la práctica con IA (ver spec de práctica con IA), y la pantalla de cierre SHALL mostrar debajo del resumen el bloque "Práctica con IA". Al iniciar una sesión nueva la lista SHALL empezar vacía.

#### Scenario: Difíciles de la sesión
- **WHEN** en una sesión se califican con éxito tarjetas con grados 1, 3, 2 y 4
- **THEN** la lista de difíciles contiene la primera y la tercera, en ese orden

#### Scenario: Calificación fallida no entra
- **WHEN** una tarjeta se califica "Otra vez", el guardado falla, y el reintento con "Bien" tiene éxito
- **THEN** la tarjeta no está en la lista de difíciles

#### Scenario: Sesión nueva arranca limpia
- **WHEN** termina una sesión con difíciles y el usuario inicia otra
- **THEN** la lista de difíciles de la nueva sesión está vacía

### Requirement: Salir en cualquier momento conserva lo ya calificado
El sistema SHALL ofrecer "Salir" en la barra superior durante toda la sesión. Salir SHALL llevar a Hoy de inmediato, sin pantalla de cierre ni confirmación, y SHALL vaciar la sesión. Lo ya calificado queda guardado (en el dispositivo y, con conexión, en el servidor) y las tarjetas no calificadas o que seguían listas siguen pendientes; Hoy las vuelve a mostrar al llegar.

#### Scenario: Salida anticipada
- **WHEN** el usuario califica tres tarjetas de diez y pulsa "Salir"
- **THEN** vuelve a Hoy sin confirmación; las tres calificadas quedan reprogramadas y Hoy muestra las siete restantes como listas

#### Scenario: Salir justo después de calificar
- **WHEN** el usuario califica una tarjeta y pulsa "Salir" antes de que el servidor confirme
- **THEN** vuelve a Hoy de inmediato y la calificación se envía igual cuando el servidor responde

### Requirement: Una tarjeta que sigue lista para hoy vuelve al final de la sesión
Tras guardar una calificación, el sistema SHALL comprobar si la tarjeta sigue lista para hoy con la misma definición de la cola diaria (no suspendida y nuevo vencimiento menor o igual al fin del día de estudio). Si sigue lista, la tarjeta SHALL volver al final de la sesión, cualquiera que sea el grado; si no, SHALL salir de la sesión. La sesión SHALL mostrar la tarjeta cuando le toque en la cola, sin esperar a que llegue su vencimiento. La sesión SHALL terminar solo cuando no quede ninguna tarjeta lista para hoy. Una tarjeta reencolada SHALL presentarse como una aparición nueva: sin revelar, con su previsualización recalculada y sus relojes en cero.

#### Scenario: Otra vez en medio de la sesión
- **WHEN** el usuario califica "Otra vez" la tarjeta 2 de 3 y su nuevo vencimiento es dentro de un minuto
- **THEN** la sesión pasa a la tarjeta 3 y después vuelve a mostrar la 2

#### Scenario: Nueva con Bien vuelve una vez
- **WHEN** una tarjeta nueva se califica "Bien" (vence en 10 minutos) y, al volver, se califica "Bien" otra vez (vence en un día o más)
- **THEN** tras la primera calificación vuelve al final de la sesión y tras la segunda sale

#### Scenario: Tarjeta que gradúa sale
- **WHEN** una tarjeta nueva se califica "Fácil" y su nuevo vencimiento es dentro de ocho días
- **THEN** la tarjeta sale de la sesión y no vuelve a mostrarse

#### Scenario: Vencimiento más tarde hoy
- **WHEN** una tarjeta se califica a las 23:50 y su nuevo vencimiento es dentro de diez minutos, antes del fin del día de estudio (04:00)
- **THEN** la tarjeta vuelve al final de la sesión

#### Scenario: Vencimiento pasado el fin del día
- **WHEN** una tarjeta se califica a las 03:55 con fin del día a las 04:00 y su nuevo vencimiento es dentro de diez minutos
- **THEN** la tarjeta sale de la sesión

#### Scenario: La sesión termina cuando nada sigue listo
- **WHEN** la última tarjeta de la cola se califica y no sigue lista
- **THEN** la sesión termina y se muestra el cierre

### Requirement: Un guardado rechazado devuelve la tarjeta a la sesión con aviso
El sistema SHALL seguir el resultado de cada guardado en segundo plano. Si el almacén rechaza un guardado (por ejemplo, por permisos), el sistema SHALL devolver esa tarjeta al final de la sesión como una aparición nueva, descontarla del progreso, no contarla entre las difíciles por esa calificación, y mostrar como alerta accesible "No se guardó tu calificación de «{anverso}». Vuelve a calificarla.". Si la sesión ya terminó cuando llega el rechazo, la pantalla de cierre SHALL mostrar "N calificaciones no se guardaron. Esas tarjetas siguen pendientes." con plural real. El rechazo NO SHALL dejar nada a medias en el almacén: la tarjeta conserva su programación anterior, no hay registro nuevo y los indicadores no cambian.

#### Scenario: Rechazo durante la sesión
- **WHEN** el usuario califica "Bien" la tarjeta «to give up», la sesión avanza y segundos después el almacén rechaza el guardado
- **THEN** aparece la alerta con «to give up», la barra retrocede y la tarjeta vuelve a mostrarse al final de la sesión sin revelar

#### Scenario: Rechazo tras el cierre
- **WHEN** la sesión terminó y el almacén rechaza una calificación pendiente
- **THEN** el cierre muestra "1 calificación no se guardó. Esa tarjeta sigue pendiente." y el resumen sigue visible

#### Scenario: Nada queda a medias
- **WHEN** el almacén rechaza el guardado de una calificación
- **THEN** la tarjeta conserva su programación anterior, no existe un registro nuevo en el historial y los indicadores del día no cambian

#### Scenario: Reintento tras el rechazo
- **WHEN** la tarjeta devuelta vuelve a mostrarse y el usuario la califica de nuevo con éxito
- **THEN** la alerta desaparece, el guardado se acepta y la tarjeta sigue la regla de reencolado normal

### Requirement: No se puede calificar dos veces la misma aparición ni sin revelar
El sistema SHALL ignorar toda calificación (toque o tecla) mientras la tarjeta actual no está revelada, mientras la tarjeta transiciona a la siguiente tras una calificación, y cuando la sesión no está activa. Esta regla SHALL cumplirse en la lógica de la sesión, no solo en la pantalla.

#### Scenario: Doble toque
- **WHEN** el usuario toca dos veces seguidas una opción durante la transición a la siguiente tarjeta
- **THEN** se guarda una sola calificación y la sesión avanza una sola aparición

#### Scenario: Calificar sin revelar desde la lógica
- **WHEN** se pide a la sesión calificar con grado 3 una tarjeta que no está revelada
- **THEN** la sesión no guarda nada, no avanza y la tarjeta sigue sin revelar

#### Scenario: Sesión terminada
- **WHEN** la sesión ya terminó y llega una tecla "4"
- **THEN** no ocurre nada

### Requirement: Sin conexión, la sesión sigue y lo avisa
El sistema SHALL permitir estudiar sin conexión con las mismas acciones y la misma velocidad: revelar, calificar y avanzar no esperan al servidor. Mientras no haya conexión, la pantalla de repaso SHALL mostrar el mismo indicador discreto del caparazón ("Sin conexión. Tus repasos se guardan aquí y se sincronizan al volver."), anunciado como estado, sin bloquear nada. Las calificaciones hechas sin conexión SHALL quedar guardadas en el dispositivo, sobrevivir a cerrar la aplicación y enviarse en orden cuando vuelva la conexión.

#### Scenario: Calificar sin red
- **WHEN** el usuario califica cinco tarjetas sin conexión
- **THEN** la sesión avanza con cada toque, el indicador sigue visible y las cinco calificaciones quedan pendientes de envío en el dispositivo

#### Scenario: Vuelve la conexión
- **WHEN** la conexión vuelve después de calificar sin red
- **THEN** las calificaciones pendientes se envían en el orden en que se hicieron y el indicador desaparece

### Requirement: El cierre recibe el foco
Al mostrarse la pantalla de cierre de la sesión, el sistema SHALL mover el foco a su título, para que un lector de pantalla anuncie el cierre y Tab siga por sus controles en orden, en lugar de quedar perdido en el documento.

#### Scenario: Cierre con teclado
- **WHEN** el usuario califica con el teclado la última tarjeta y aparece el cierre
- **THEN** el foco está en el título "Sesión terminada" y Tab lleva a los controles del cierre hasta "Volver a Hoy"
