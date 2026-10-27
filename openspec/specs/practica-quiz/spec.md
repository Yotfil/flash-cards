# Práctica (mini-quiz) Specification

## Purpose

Ofrece una práctica ligera y aparte del repaso: desde un capítulo, el usuario responde un mini-quiz corto armado con las tarjetas básicas de ese capítulo, mezclando preguntas de opción múltiple y de escribir la respuesta, con feedback inmediato y un puntaje final. Es ejercicio sin consecuencias: no altera la programación de ninguna tarjeta ni deja rastro en el historial de repasos ni en las estadísticas del día.

## Requirements

### Requirement: La práctica se inicia desde un capítulo
El sistema SHALL ofrecer un botón "Practicar" en la pantalla de detalle de un capítulo, junto al botón de estudiar, visible únicamente cuando las tarjetas del capítulo ya cargaron y al menos una de ellas es elegible (básica con anverso y reverso). El quiz SHALL armarse con las tarjetas ya cargadas en la pantalla, sin volver a leerlas. Al tocarlo, el sistema SHALL navegar a la pantalla de práctica con la primera pregunta. Si ninguna tarjeta es elegible, el botón SHALL NOT mostrarse; no existe aviso adicional.

#### Scenario: Capítulo con tarjetas básicas
- **WHEN** el usuario toca "Practicar" en un capítulo con al menos una tarjeta básica con anverso y reverso
- **THEN** el sistema abre la pantalla de práctica con la primera pregunta sin leer de nuevo las tarjetas

#### Scenario: Capítulo sin tarjetas elegibles
- **WHEN** el capítulo tiene tarjetas pero todas son de tipo cloze
- **THEN** el botón "Practicar" no se muestra y el botón de estudiar sigue en su sitio

#### Scenario: Capítulo vacío
- **WHEN** el capítulo no tiene tarjetas
- **THEN** el botón "Practicar" no se muestra

#### Scenario: Falla la carga de tarjetas al preparar
- **WHEN** la lectura de las tarjetas del capítulo falló al abrir el detalle
- **THEN** la pantalla muestra el estado de error de la lista de tarjetas y el botón "Practicar" no se muestra

### Requirement: La práctica ocurre en pantalla completa y requiere sesión
El sistema SHALL mostrar la práctica en una pantalla completa fuera de la navegación principal (sin pestañas), accesible solo con sesión iniciada, con una barra superior que incluye la barra de progreso, el contador "posición / total" y un enlace "Salir" que vuelve al origen de la práctica: el detalle del capítulo o el detalle del libro desde donde se inició. Si se entra a la pantalla sin una práctica preparada, el sistema SHALL redirigir a la Biblioteca. La barra de progreso SHALL llenarse en proporción a las preguntas respondidas sobre el total, de modo que al responder la última llegue al 100 %.

#### Scenario: Entrada directa sin práctica preparada
- **WHEN** el usuario abre la ruta de práctica sin haber iniciado un quiz desde un capítulo o un libro
- **THEN** el sistema lo redirige a la Biblioteca

#### Scenario: Salir a mitad de la práctica
- **WHEN** el usuario toca "Salir" con preguntas pendientes en una práctica iniciada desde el capítulo "Movement"
- **THEN** el sistema vuelve al detalle de "Movement" sin guardar nada

#### Scenario: Barra de progreso
- **WHEN** el usuario está en la pregunta 4 de 10 y aún no la respondió
- **THEN** la barra está al 30 % y el contador muestra "4 / 10"; al responderla, la barra pasa al 40 %

#### Scenario: Barra completa
- **WHEN** el usuario responde la última pregunta
- **THEN** la barra está al 100 % antes de tocar "Ver resultado"

### Requirement: Solo participan las tarjetas básicas con anverso y reverso
El sistema SHALL armar el quiz únicamente con tarjetas del capítulo que no sean de tipo cloze y cuyo anverso y reverso no estén vacíos tras recortar espacios. La suspensión de una tarjeta NO la excluye de la práctica. El anverso recortado es el enunciado de la pregunta y el reverso recortado es la respuesta correcta.

#### Scenario: Las cloze se omiten
- **WHEN** el capítulo tiene una tarjeta cloze y una básica
- **THEN** el quiz tiene exactamente una pregunta, la de la tarjeta básica

#### Scenario: Tarjeta con reverso vacío
- **WHEN** una tarjeta básica tiene el reverso vacío o solo espacios
- **THEN** no participa en el quiz

#### Scenario: Sin tarjetas elegibles
- **WHEN** ninguna tarjeta del capítulo es elegible
- **THEN** el quiz queda vacío y la práctica no se inicia

### Requirement: El quiz es corto y en orden aleatorio
El sistema SHALL agrupar las tarjetas elegibles por anverso normalizado (la normalización de la comparación tolerante): cada grupo da una sola pregunta, cuyo enunciado es el anverso de la primera tarjeta del grupo y cuyas respuestas válidas son todos los reversos distintos del grupo. El sistema SHALL barajar los grupos y tomar como máximo 10 para el quiz; con menos de 10, entran todos. Cada práctica SHALL barajar de nuevo: el orden es aleatorio y, con pocas preguntas, puede coincidir con el de la práctica anterior.

#### Scenario: Capítulo grande
- **WHEN** el capítulo tiene 15 tarjetas elegibles con anversos distintos
- **THEN** el quiz tiene 10 preguntas

#### Scenario: Capítulo pequeño
- **WHEN** el capítulo tiene 2 tarjetas elegibles con anversos distintos
- **THEN** el quiz tiene 2 preguntas

#### Scenario: Mismo anverso con dos acepciones
- **WHEN** el capítulo tiene `bank | banco`, `bank | orilla` y `house | casa`
- **THEN** el quiz tiene 2 preguntas y "bank" sale una sola vez, con «banco» y «orilla» como respuestas válidas

#### Scenario: Capítulo con sus tarjetas repetidas
- **WHEN** el capítulo tiene 5 tarjetas distintas, cada una dos veces (importado dos veces)
- **THEN** el quiz tiene 5 preguntas y ninguna se repite

#### Scenario: Anversos que solo difieren al escribirse
- **WHEN** el capítulo tiene `Don’t | no hacer` y `don't | no lo hagas`
- **THEN** el quiz tiene una sola pregunta para las dos, con «no hacer» y «no lo hagas» como respuestas válidas

### Requirement: Los tipos de pregunta se alternan por posición y la opción múltiple exige distractores suficientes
El sistema SHALL asignar el tipo de cada pregunta según su posición en el quiz: las posiciones impares (1.ª, 3.ª, 5.ª…) son de opción múltiple y las pares (2.ª, 4.ª…) son de escribir. Si una pregunta de posición impar no dispone de 3 distractores, SHALL caer al tipo escribir, que siempre es posible.

#### Scenario: Alternancia con distractores suficientes
- **WHEN** el capítulo tiene 6 tarjetas elegibles con 6 respuestas distintas
- **THEN** el quiz tiene 6 preguntas que alternan opción múltiple y escribir, empezando por opción múltiple

#### Scenario: Pocas respuestas distintas
- **WHEN** el capítulo tiene solo 2 tarjetas elegibles
- **THEN** todas las preguntas del quiz son de escribir

### Requirement: Una pregunta de opción múltiple presenta 4 opciones barajadas sin repetidos
El sistema SHALL construir cada pregunta de opción múltiple con exactamente 4 opciones: una respuesta correcta más 3 distractores, barajadas entre sí. Si el anverso de la pregunta tiene varios reversos distintos, la respuesta correcta SHALL ser uno de ellos elegido al azar, y los demás NO SHALL aparecer entre las opciones. Los distractores SHALL ser reversos reales de otras tarjetas elegibles del mismo capítulo (incluidas las que no entraron en el quiz), elegidos al azar entre las respuestas distintas del capítulo, excluyendo las que coinciden tras normalizarlas con cualquiera de los reversos del anverso de la pregunta. Dos reversos SHALL considerarse la misma respuesta cuando coinciden tras normalizar (la normalización de la comparación tolerante); de cada grupo se conserva el texto de la primera aparición.

#### Scenario: Cuatro opciones distintas con la correcta incluida
- **WHEN** se genera una pregunta de opción múltiple
- **THEN** tiene 4 opciones distintas, una de ellas es la respuesta correcta y todas son reversos de tarjetas del capítulo

#### Scenario: Reversos repetidos no sirven como distractores separados
- **WHEN** dos tarjetas del capítulo tienen el reverso "casa" y "CASA"
- **THEN** cuentan como una sola respuesta distinta al elegir distractores

#### Scenario: Distractores de tarjetas fuera del quiz
- **WHEN** el capítulo tiene 15 tarjetas elegibles y el quiz solo usa 10
- **THEN** los distractores pueden provenir de cualquiera de las 15

#### Scenario: La otra acepción nunca es distractor
- **WHEN** el capítulo tiene `bank | banco`, `bank | orilla` y cuatro tarjetas más con anversos y reversos distintos, y "bank" sale como pregunta de opción múltiple
- **THEN** entre sus 4 opciones está exactamente una de «banco» u «orilla», y es la correcta

### Requirement: Responder una pregunta de opción múltiple
El sistema SHALL presentar las opciones como botones; al tocar una, SHALL marcarla como respondida, comparar la opción elegida con la respuesta correcta por igualdad exacta de texto y bloquear las opciones. Tras responder, la opción correcta SHALL resaltarse con el color de acento y un icono de verificación; la opción elegida, si fue errónea, SHALL marcarse atenuada con un icono de cruz; las demás quedan atenuadas. La escala rojo→verde NO se usa en la práctica.

#### Scenario: Elegir la opción correcta
- **WHEN** el usuario toca la opción que coincide con la respuesta
- **THEN** la pregunta queda respondida como correcta y esa opción se resalta con acento

#### Scenario: Elegir una opción errónea
- **WHEN** el usuario toca una opción que no es la respuesta
- **THEN** la elegida se marca como errónea, la correcta se resalta y la pregunta cuenta como fallada

#### Scenario: Las opciones se bloquean tras responder
- **WHEN** la pregunta ya fue respondida
- **THEN** tocar otra opción no cambia el resultado ni el puntaje

### Requirement: Responder una pregunta de escribir con comparación tolerante
El sistema SHALL ofrecer un campo de texto (sin autocompletar, autocapitalizar ni autocorregir) y un botón "Comprobar", deshabilitado mientras lo escrito esté vacío o sea solo espacios; la tecla Enter SHALL equivaler a "Comprobar". La respuesta escrita SHALL contar como correcta cuando, tras normalizar ambas partes, coincide con cualquiera de los reversos del anverso de la pregunta, completo o con cualquiera de sus fragmentos separados por `,`, `;` o `/`. Un separador con un dígito inmediatamente a cada lado NO SHALL separar: forma parte de la respuesta (3,14 · 1/2 · 25/12). La normalización SHALL recortar espacios en los extremos, pasar a minúsculas, colapsar espacios internos consecutivos en uno, tratar los apóstrofos tipográficos (’ ‘ ʼ) como el apóstrofo recto (') y las comillas tipográficas (“ ”) como las rectas ("), y tratar igual una letra con tilde escrita de una pieza o como letra seguida de la tilde aparte, conservando los acentos. Una entrada vacía nunca acierta. Tras comprobar, el campo SHALL quedar deshabilitado.

#### Scenario: Mayúsculas y espacios no importan
- **WHEN** la respuesta es "rendirse" y el usuario escribe "  RENDIRSE "
- **THEN** cuenta como correcta

#### Scenario: Cualquier fragmento del reverso vale
- **WHEN** la respuesta es "rendirse, darse por vencido" y el usuario escribe "darse por vencido"
- **THEN** cuenta como correcta

#### Scenario: El reverso completo también vale
- **WHEN** la respuesta es "rendirse, darse por vencido" y el usuario escribe "rendirse, darse por vencido"
- **THEN** cuenta como correcta

#### Scenario: Cualquier acepción del anverso vale
- **WHEN** "bank" tiene los reversos «banco» y «orilla» y el usuario escribe "orilla"
- **THEN** cuenta como correcta

#### Scenario: Apóstrofo tipográfico y recto son lo mismo
- **WHEN** la respuesta es «don’t» y el usuario escribe "don't", o la respuesta es «don't» y el teclado escribe "don’t"
- **THEN** cuenta como correcta

#### Scenario: Tilde escrita aparte
- **WHEN** la respuesta «rendí» está guardada con la tilde como carácter aparte y el usuario escribe "rendí" con la letra de una pieza
- **THEN** cuenta como correcta

#### Scenario: Los acentos sí importan
- **WHEN** la respuesta es "rendí" y el usuario escribe "rendi"
- **THEN** cuenta como incorrecta

#### Scenario: Un número decimal no se parte
- **WHEN** la respuesta es "3,14" y el usuario escribe "3"
- **THEN** cuenta como incorrecta; escribir "3,14" cuenta como correcta

#### Scenario: Una fecha o una fracción no se parten
- **WHEN** la respuesta es "25/12" y el usuario escribe "25", o la respuesta es "1/2" y escribe "1"
- **THEN** cuenta como incorrecta

#### Scenario: Entre letras la barra sigue separando
- **WHEN** la respuesta es "m/s" y el usuario escribe "m"
- **THEN** cuenta como correcta, igual que "m/s"

#### Scenario: Respuesta distinta
- **WHEN** la respuesta es "rendirse" y el usuario escribe "avanzar"
- **THEN** cuenta como incorrecta

#### Scenario: Entrada vacía
- **WHEN** el campo contiene solo espacios
- **THEN** el botón "Comprobar" está deshabilitado y Enter no registra respuesta

### Requirement: Feedback inmediato y avance controlado
Tras responder, el sistema SHALL mostrar "¡Correcto!" con un icono de verificación si acertó, o un icono de cruz con el texto "La respuesta era «<respuesta>»." si falló, y SHALL mostrar el botón de avance: "Siguiente" en las preguntas intermedias y "Ver resultado" en la última. En una pregunta de escribir cuyo anverso tiene varios reversos, el texto del fallo SHALL nombrarlos todos: "La respuesta era «banco» o «orilla»." (con tres o más, "«a», «b» o «c»"). En una pregunta de opción múltiple, el texto del fallo SHALL nombrar la opción correcta que se mostró. El sistema NO SHALL avanzar sin haber respondido la pregunta actual, y una pregunta ya respondida NO SHALL aceptar otra respuesta ni contar doble en el puntaje. Al avanzar, el campo de texto SHALL vaciarse.

#### Scenario: Acierto
- **WHEN** el usuario responde correctamente
- **THEN** ve "¡Correcto!" y el botón de avance

#### Scenario: Fallo
- **WHEN** el usuario responde incorrectamente
- **THEN** ve "La respuesta era …" con la respuesta correcta y el botón de avance

#### Scenario: Fallo al escribir con varias acepciones
- **WHEN** "bank" tiene los reversos «banco» y «orilla» y el usuario escribe "río"
- **THEN** ve "La respuesta era «banco» o «orilla»."

#### Scenario: Fallo en opción múltiple con varias acepciones
- **WHEN** la pregunta de opción múltiple "bank" muestra «banco» como correcta y el usuario elige otra opción
- **THEN** ve "La respuesta era «banco»." y «banco» queda resaltada

#### Scenario: Responder dos veces no cuenta doble
- **WHEN** el usuario acierta una pregunta y vuelve a responderla
- **THEN** el puntaje de aciertos sube una sola vez

#### Scenario: Última pregunta
- **WHEN** el usuario responde la última pregunta
- **THEN** el botón de avance dice "Ver resultado"

### Requirement: Resumen final con el puntaje
Al avanzar desde la última pregunta respondida, el sistema SHALL mostrar la pantalla "¡Práctica completada!" con el texto "Acertaste X de N." (X = aciertos, N = total de preguntas) y un botón "Volver al capítulo" o "Volver al libro" según el origen de la práctica, que navega a ese detalle. Una vez terminada, la práctica NO SHALL aceptar más respuestas.

#### Scenario: Resumen con aciertos y fallos
- **WHEN** el usuario acierta 1 de 2 preguntas y avanza desde la última en una práctica iniciada desde un capítulo
- **THEN** ve "Acertaste 1 de 2." y el botón "Volver al capítulo", que lleva al detalle del capítulo

#### Scenario: Respuestas después de terminar
- **WHEN** la práctica ya terminó
- **THEN** cualquier intento de responder se ignora y el puntaje no cambia

#### Scenario: Volver al libro
- **WHEN** la práctica se inició desde el detalle de un libro y termina
- **THEN** el botón dice "Volver al libro" y lleva al detalle de ese libro

### Requirement: La práctica no toca la programación ni deja registro
El sistema SHALL tratar la práctica como una modalidad aparte del repaso: NO SHALL modificar la programación de ninguna tarjeta, NO SHALL añadir registros al historial de repasos, NO SHALL alterar las estadísticas del día (repasos completados, calificaciones, nuevas introducidas) y NO SHALL crear, editar ni borrar tarjetas. La única interacción con el almacén es la lectura de las tarjetas del capítulo al iniciar.

#### Scenario: Practicar no cambia la cola de Hoy
- **WHEN** el usuario completa una práctica con aciertos y fallos
- **THEN** las fechas de vencimiento, estados y conteos de la cola diaria permanecen idénticos

#### Scenario: Practicar no cuenta como repaso
- **WHEN** el usuario completa una práctica
- **THEN** "Repasadas hoy" y la distribución de calificaciones de Progreso no cambian

### Requirement: La práctica se inicia desde un libro
El sistema SHALL ofrecer un botón secundario "Practicar" en la pantalla de detalle de un libro, junto a "Estudiar este libro", visible cuando los capítulos del libro ya cargaron. Al tocarlo, el sistema SHALL leer las tarjetas del libro (aceptando las que el dispositivo ya tenga guardadas si no hay conexión), SHALL armar el quiz con las básicas elegibles de todo el libro, usando como distractores los reversos de todo el libro, y SHALL navegar a la práctica. Mientras prepara, el botón SHALL mostrar "Preparando…" y quedar deshabilitado, ignorando toques repetidos. Si no hay tarjetas elegibles, el sistema SHALL permanecer en el libro y mostrar debajo de los botones "Nada que practicar aún.", salvo cuando no hay conexión y el dispositivo no tiene guardada ninguna tarjeta del libro: entonces SHALL mostrar "Sin conexión, este dispositivo aún no tiene tarjetas de este libro.". Si la lectura falla, SHALL mostrar "No se pudo preparar la práctica. Inténtalo de nuevo." y registrar el error.

#### Scenario: Libro con tarjetas básicas
- **WHEN** el usuario toca "Practicar" en un libro con 3 capítulos y 25 tarjetas básicas
- **THEN** se abre la práctica con 10 preguntas tomadas de todo el libro y "Salir" lleva de vuelta al libro

#### Scenario: Libro sin tarjetas elegibles
- **WHEN** el usuario toca "Practicar" en un libro cuyas tarjetas son todas cloze
- **THEN** el sistema no navega y muestra "Nada que practicar aún." debajo de los botones

#### Scenario: Falla la lectura del libro
- **WHEN** la lectura de las tarjetas del libro falla al tocar "Practicar"
- **THEN** el sistema no navega, registra el error y muestra "No se pudo preparar la práctica. Inténtalo de nuevo."

#### Scenario: Libro sin red
- **WHEN** no hay conexión y el dispositivo tiene guardadas tarjetas del libro
- **THEN** la práctica se arma con esas tarjetas sin mostrar error

#### Scenario: Libro sin red que el dispositivo nunca leyó
- **WHEN** no hay conexión, el libro tiene 300 tarjetas en el servidor y el dispositivo no tiene guardada ninguna, y el usuario toca "Practicar"
- **THEN** el sistema no navega y muestra "Sin conexión, este dispositivo aún no tiene tarjetas de este libro." debajo de los botones

#### Scenario: Sin red con tarjetas guardadas pero ninguna elegible
- **WHEN** no hay conexión y el dispositivo solo tiene guardadas tarjetas cloze del libro
- **THEN** el sistema no navega y muestra "Nada que practicar aún."

### Requirement: La práctica es efímera y nunca se retoma
El sistema SHALL arrancar una práctica nueva en cada entrada desde un botón "Practicar": el quiz preparado se entrega a la pantalla una sola vez y la pantalla empieza en la primera pregunta con el puntaje en cero. Al salir o al terminar, la práctica SHALL vaciarse. Volver a la ruta de práctica sin un quiz recién preparado (recarga, "adelante", dirección escrita a mano) SHALL redirigir a la Biblioteca, nunca mostrar una práctica anterior.

#### Scenario: Volver atrás tras salir
- **WHEN** el usuario sale a mitad de una práctica, pulsa "atrás" y después "adelante" hacia la ruta de práctica
- **THEN** el sistema redirige a la Biblioteca y no muestra la práctica abandonada

#### Scenario: Dos prácticas seguidas
- **WHEN** el usuario termina una práctica, vuelve al capítulo y toca "Practicar" otra vez
- **THEN** la nueva práctica empieza en la pregunta 1 con "Acertaste" en cero y las preguntas barajadas de nuevo

### Requirement: El foco acompaña a la práctica
El sistema SHALL mover el foco a cada pieza nueva de la práctica, para que quien usa teclado o lector de pantalla no lo pierda: al mostrarse una pregunta de opción múltiple, a su enunciado (que se anuncia y no es un control: Tab sigue por las opciones); al mostrarse una pregunta de escribir, al campo; tras responder, al botón de avance; al mostrarse el resumen, a su título.

#### Scenario: Primera pregunta de opción múltiple
- **WHEN** se abre la práctica y la primera pregunta es de opción múltiple
- **THEN** el foco está en su enunciado y Tab lo lleva a la primera opción

#### Scenario: Avanzar a una pregunta de opción múltiple
- **WHEN** el usuario pulsa "Siguiente" con el teclado y la pregunta nueva es de opción múltiple
- **THEN** el foco está en el enunciado de la pregunta nueva, no en el documento

#### Scenario: Avanzar a una pregunta de escribir
- **WHEN** el usuario pulsa "Siguiente" y la pregunta nueva es de escribir
- **THEN** el foco está en el campo de respuesta

#### Scenario: Tras responder
- **WHEN** el usuario responde una pregunta
- **THEN** el foco está en "Siguiente" o, en la última, en "Ver resultado"

#### Scenario: Resumen
- **WHEN** el usuario pulsa "Ver resultado"
- **THEN** el foco está en el título "¡Práctica completada!"

### Requirement: Salir y volver regresan con el historial
"Salir" y el botón del resumen ("Volver al capítulo" o "Volver al libro") SHALL regresar al origen de la práctica como la entrada anterior del historial, igual que el "atrás" del sistema, sin apilar una entrada nueva. Así, el siguiente "atrás" lleva a la pantalla anterior al origen, y la práctica queda como "adelante" (que redirige a la Biblioteca).

#### Scenario: Atrás después de salir
- **WHEN** el usuario entra a "Inglés B2", abre "Unidad 1", practica, toca "Salir" y después pulsa "atrás"
- **THEN** llega al detalle de "Inglés B2", no a la Biblioteca ni otra vez a "Unidad 1"

#### Scenario: Atrás después del resumen
- **WHEN** el usuario termina una práctica iniciada desde un libro, toca "Volver al libro" y después pulsa "atrás"
- **THEN** llega a la pantalla desde la que abrió el libro
