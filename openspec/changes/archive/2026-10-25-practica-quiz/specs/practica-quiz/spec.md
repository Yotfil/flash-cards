## ADDED Requirements

### Requirement: La práctica se inicia desde un libro
El sistema SHALL ofrecer un botón secundario "Practicar" en la pantalla de detalle de un libro, junto a "Estudiar este libro", visible cuando los capítulos del libro ya cargaron. Al tocarlo, el sistema SHALL leer las tarjetas del libro (aceptando las que el dispositivo ya tenga guardadas si no hay conexión), SHALL armar el quiz con las básicas elegibles de todo el libro, usando como distractores los reversos de todo el libro, y SHALL navegar a la práctica. Mientras prepara, el botón SHALL mostrar "Preparando…" y quedar deshabilitado, ignorando toques repetidos. Si no hay tarjetas elegibles, el sistema SHALL permanecer en el libro y mostrar debajo de los botones "Nada que practicar aún."; si la lectura falla, SHALL mostrar "No se pudo preparar la práctica. Inténtalo de nuevo." y registrar el error.

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

### Requirement: La práctica es efímera y nunca se retoma
El sistema SHALL arrancar una práctica nueva en cada entrada desde un botón "Practicar": el quiz preparado se entrega a la pantalla una sola vez y la pantalla empieza en la primera pregunta con el puntaje en cero. Al salir o al terminar, la práctica SHALL vaciarse. Volver a la ruta de práctica sin un quiz recién preparado (recarga, "atrás", dirección escrita a mano) SHALL redirigir a la Biblioteca, nunca mostrar una práctica anterior.

#### Scenario: Volver atrás tras salir
- **WHEN** el usuario sale a mitad de una práctica y luego usa "atrás" del navegador hacia la ruta de práctica
- **THEN** el sistema redirige a la Biblioteca y no muestra la práctica abandonada

#### Scenario: Dos prácticas seguidas
- **WHEN** el usuario termina una práctica, vuelve al capítulo y toca "Practicar" otra vez
- **THEN** la nueva práctica empieza en la pregunta 1 con "Acertaste" en cero y un orden distinto

## MODIFIED Requirements

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
