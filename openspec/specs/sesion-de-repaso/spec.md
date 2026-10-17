# Sesión de repaso Specification

## Purpose

Guiar al usuario tarjeta por tarjeta a través de una lista ya armada (la cola de Hoy, o las tarjetas listas de un libro o capítulo): mostrar el anverso, dejar que recuerde, revelar la respuesta y recoger una calificación honesta de 1 a 4 que se persiste de forma íntegra junto con su historial y las estadísticas del día. Es el momento de estudio propiamente dicho; la selección de qué tarjetas entran vive en la spec de cola diaria y el cálculo de intervalos en la spec de programación espaciada.

## Requirements

### Requirement: La sesión ocupa toda la pantalla, sin la navegación principal
El sistema SHALL presentar la sesión de repaso en una pantalla propia, sin las pestañas de navegación (Hoy, Biblioteca, Progreso, Ajustes), accesible solo con sesión iniciada. La pantalla SHALL mostrar únicamente una barra superior discreta (progreso, contador y "Salir") y la tarjeta.

#### Scenario: Entrar desde Hoy con tarjetas
- **WHEN** el usuario pulsa empezar en Hoy y la cola tiene al menos una tarjeta
- **THEN** la app abre la pantalla de repaso a pantalla completa, sin navegación, mostrando la primera tarjeta

#### Scenario: Abrir la pantalla sin sesión activa
- **WHEN** el usuario llega a la pantalla de repaso sin una sesión en curso (por ejemplo, recargando el navegador en esa ruta)
- **THEN** la app lo redirige a Biblioteca en vez de mostrar una sesión vacía

### Requirement: Una sesión arranca con una lista ya curada y la recorre en orden
El sistema SHALL iniciar la sesión con la lista de tarjetas que recibe, en ese mismo orden y sin volver a filtrarla cuando proviene de la cola diaria. Al arrancar, el progreso (repasadas y conteo por calificación) SHALL empezar en cero. Si la lista está vacía, la sesión NO se inicia.

#### Scenario: Lista vacía no entra
- **WHEN** se intenta iniciar una sesión con cero tarjetas
- **THEN** el sistema informa que no hay nada que estudiar y no cambia de pantalla

#### Scenario: Orden respetado
- **WHEN** la lista recibida es A, B, C
- **THEN** la sesión muestra A primero, luego B y luego C

### Requirement: Iniciar desde un libro o capítulo filtra solo las tarjetas listas en este instante
Cuando la sesión se inicia desde un libro o un capítulo, el sistema SHALL cargar sus tarjetas y conservar únicamente las nuevas (estado "nueva") o las vencidas con fecha de vencimiento menor o igual al instante actual. Si la carga falla, el sistema SHALL registrar un mensaje de error y responder como si no hubiera tarjetas listas.

#### Scenario: Se descartan las que vencen en el futuro
- **WHEN** un libro tiene una tarjeta nueva, una vencida ayer y una en repaso que vence en una semana
- **THEN** la sesión contiene dos tarjetas (la nueva y la vencida)

#### Scenario: Nada listo en el libro
- **WHEN** todas las tarjetas del libro vencen en el futuro
- **THEN** la sesión no se inicia y el libro muestra "Estás al día con este libro. No hay tarjetas para repasar ahora."

### Requirement: Cada tarjeta se presenta en dos momentos: pregunta y respuesta
El sistema SHALL mostrar primero solo el anverso de la tarjeta, centrado y grande, con un botón único "Mostrar respuesta". Al revelar, SHALL mostrar el reverso debajo del anverso y sustituir el botón por el componente de calificación. Antes de revelar NO se muestran opciones de calificación.

#### Scenario: Momento pregunta
- **WHEN** se muestra una tarjeta básica
- **THEN** se ve su anverso, el botón "Mostrar respuesta" y ningún cerebro de calificación

#### Scenario: Momento respuesta
- **WHEN** el usuario revela la tarjeta
- **THEN** se ven anverso y reverso, desaparece "Mostrar respuesta" y aparecen los cuatro cerebros

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
El sistema SHALL presentar, tras revelar, el microcopy "¿Qué tan bien la recordaste?" y cuatro opciones en fila: "Otra vez" (1, rojo), "Difícil" (2, naranja), "Bien" (3, amarillo) y "Fácil" (4, verde). Cada opción SHALL ser un botón independiente y amplio que emite su grado. La opción N SHALL mostrar cuatro cerebros con exactamente N activos en su color y el resto apagados, para que el conteo diferencie sin depender del color. La escala rojo→verde SHALL reservarse a este componente.

#### Scenario: Orden y conteo
- **WHEN** se muestran las opciones de calificación
- **THEN** de izquierda a derecha se ven 1, 2, 3 y 4 cerebros activos con las etiquetas "Otra vez", "Difícil", "Bien" y "Fácil"

#### Scenario: Un toque califica
- **WHEN** el usuario toca la opción con tres cerebros
- **THEN** se emite el grado 3 y la tarjeta se califica como "Bien"

### Requirement: Cada opción muestra cuándo volvería la tarjeta
El sistema SHALL mostrar en cada opción el intervalo de retorno previsto si se eligiera ese grado, en formato humano (ver spec de programación espaciada), tanto visible como en la etiqueta accesible del botón ("<etiqueta>, vuelve en <intervalo>"). Las previsualizaciones SHALL calcularse al mostrar la tarjeta, a partir de su estado de programación actual.

#### Scenario: Intervalos visibles por opción
- **WHEN** la previsualización indica 0, 1, 3 y 7 días para los grados 1 a 4
- **THEN** las opciones muestran "<1 día", "1 día", "3 días" y "7 días"

#### Scenario: Etiqueta accesible
- **WHEN** un lector de pantalla enfoca la opción "Bien" con intervalo de 3 días
- **THEN** anuncia "Bien, vuelve en 3 días"

### Requirement: Atajos de teclado 1-4 para calificar, solo con la respuesta revelada
El sistema SHALL calificar con las teclas 1, 2, 3 y 4 únicamente cuando la tarjeta está revelada y la sesión activa. Cada opción SHALL mostrar su número como pista de atajo. Antes de revelar, esas teclas NO tienen efecto.

#### Scenario: Tecla con respuesta revelada
- **WHEN** la tarjeta está revelada y el usuario pulsa "4"
- **THEN** la tarjeta se califica como "Fácil"

#### Scenario: Tecla sin revelar
- **WHEN** la tarjeta no está revelada y el usuario pulsa "2"
- **THEN** no ocurre nada

### Requirement: Sugerencia de calificación por velocidad de recuerdo, opcional y nunca automática
Con el ajuste "Sugerir calificación por tiempo" activo (por defecto lo está), el sistema SHALL medir el tiempo desde mostrar el anverso hasta revelar y proponer: hasta 1500 ms → "Fácil" (4); de 1501 a 7000 ms → "Bien" (3); más de 7000 ms → "Difícil" (2). NUNCA sugiere "Otra vez" (1). La sugerencia solo resalta la opción (anillo de acento, insignia "sugerido" y "(sugerido)" en la etiqueta accesible); el usuario decide. Con el ajuste apagado no hay sugerencia.

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

### Requirement: Se puede apagar y encender la sugerencia desde Ajustes
El sistema SHALL ofrecer en Ajustes la casilla "Sugerir calificación por tiempo" con la explicación de que solo resalta un cerebro y nunca califica sola. El cambio SHALL guardarse en las preferencias del usuario; si el guardado falla, la casilla SHALL volver a reflejar el valor guardado.

#### Scenario: Apagar la sugerencia
- **WHEN** el usuario desmarca la casilla y el guardado tiene éxito
- **THEN** en la siguiente tarjeta revelada no hay sugerencia

#### Scenario: Falla el guardado
- **WHEN** el guardado de la preferencia falla
- **THEN** la casilla muestra el valor anterior

### Requirement: Se mide el tiempo de respuesta de cada tarjeta
El sistema SHALL registrar, con cada calificación, la duración en milisegundos desde que se mostró el anverso de la tarjeta hasta que se emitió el grado, y SHALL guardarla en el historial del repaso aunque hoy no se use para otra cosa.

#### Scenario: Duración registrada
- **WHEN** una tarjeta se muestra, se revela a los 3 s y se califica a los 8 s
- **THEN** el historial guarda una duración de aproximadamente 8000 ms

### Requirement: Calificar persiste todo o nada: tarjeta, historial y estadísticas del día
Al calificar, el sistema SHALL guardar en una sola operación indivisible: (a) el nuevo estado de programación de la tarjeta (y su fecha de actualización); (b) un registro nuevo e inmutable en el historial de repasos; y (c) los incrementos de las estadísticas del día de estudio. Si cualquiera de las tres partes no puede guardarse, NO se guarda ninguna.

#### Scenario: Todo queda guardado
- **WHEN** la calificación se guarda con éxito
- **THEN** la tarjeta tiene su nueva programación, existe un registro nuevo en el historial y las estadísticas del día reflejan el repaso

#### Scenario: Nada queda a medias
- **WHEN** la operación de guardado falla
- **THEN** la tarjeta conserva su programación anterior, no hay registro nuevo y las estadísticas del día no cambian

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

### Requirement: Si falla el guardado, la sesión no avanza y permite reintentar
Cuando el guardado de una calificación falla, el sistema SHALL mostrar el mensaje "No se pudo guardar la calificación. Inténtalo de nuevo." como alerta, mantener la misma tarjeta revelada con sus opciones, y NO contar el repaso en el progreso. Una nueva calificación de la misma tarjeta que tenga éxito SHALL limpiar el mensaje y avanzar.

#### Scenario: Fallo de guardado
- **WHEN** el usuario califica y el guardado falla
- **THEN** se ve el mensaje de error, la tarjeta sigue siendo la misma y el contador de repasadas no cambia

#### Scenario: Reintento exitoso
- **WHEN** tras el fallo el usuario vuelve a calificar y el guardado tiene éxito
- **THEN** el mensaje desaparece, el repaso cuenta y la sesión pasa a la siguiente tarjeta

### Requirement: No se puede calificar dos veces la misma tarjeta mientras se guarda
El sistema SHALL ignorar cualquier calificación adicional (toque o tecla) mientras una calificación de la tarjeta actual está guardándose, y también cuando la sesión no está activa.

#### Scenario: Doble toque
- **WHEN** el usuario toca dos veces seguidas una opción antes de que termine el guardado
- **THEN** se guarda una sola calificación y la sesión avanza una sola tarjeta

### Requirement: El progreso de la sesión se muestra de forma discreta
El sistema SHALL mostrar en la barra superior el contador "posición / total" (posición = índice de la tarjeta actual empezando en 1, sin superar el total) y una barra de progreso tenue cuyo ancho es el porcentaje de tarjetas ya calificadas sobre el total.

#### Scenario: Primera tarjeta de cinco
- **WHEN** empieza una sesión de cinco tarjetas
- **THEN** el contador muestra "1 / 5" y la barra está en 0 %

#### Scenario: Tras calificar dos
- **WHEN** el usuario ha calificado dos de cinco tarjetas
- **THEN** el contador muestra "3 / 5" y la barra está al 40 %

### Requirement: Las tarjetas calificadas "Otra vez" no vuelven dentro de la misma sesión
El sistema SHALL avanzar siempre a la siguiente tarjeta de la lista tras una calificación exitosa, sin volver a encolar la tarjeta en la sesión actual, cualquiera que sea el grado. Una tarjeta fallada reaparece en una sesión posterior cuando su nuevo vencimiento la haga elegible.

#### Scenario: Otra vez en medio de la sesión
- **WHEN** el usuario califica "Otra vez" la tarjeta 2 de 3
- **THEN** la sesión pasa a la tarjeta 3 y termina después de ella, sin repetir la 2

### Requirement: La sesión termina con un cierre breve y satisfactorio
Al calificar la última tarjeta, el sistema SHALL mostrar una pantalla de cierre con el título "¡Sesión completada!", cuántas tarjetas se repasaron, el conteo por calificación (otra vez, difícil, bien, fácil, con sus marcas de color) y un botón "Volver a Biblioteca". Al terminar SHALL dejar de mostrar previsualizaciones y sugerencias.

#### Scenario: Fin de sesión
- **WHEN** el usuario califica la última tarjeta y el guardado tiene éxito
- **THEN** se ve "¡Sesión completada!", "Repasaste N tarjeta(s)." y el desglose por grado

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
El sistema SHALL ofrecer "Salir" en la barra superior durante toda la sesión. Salir SHALL llevar a Biblioteca sin perder lo ya guardado: las tarjetas calificadas conservan su nueva programación y las no calificadas siguen pendientes.

#### Scenario: Salida anticipada
- **WHEN** el usuario califica tres tarjetas de diez y pulsa "Salir"
- **THEN** vuelve a Biblioteca; las tres calificadas quedan reprogramadas y las siete restantes siguen listas para una próxima sesión
