# Práctica (mini-quiz) Specification

## Purpose

Ofrece una práctica ligera y aparte del repaso: desde un capítulo, el usuario responde un mini-quiz corto armado con las tarjetas básicas de ese capítulo, mezclando preguntas de opción múltiple y de escribir la respuesta, con feedback inmediato y un puntaje final. Es ejercicio sin consecuencias: no altera la programación de ninguna tarjeta ni deja rastro en el historial de repasos ni en las estadísticas del día.

## Requirements

### Requirement: La práctica se inicia desde un capítulo
El sistema SHALL ofrecer un botón "Practicar" en la pantalla de detalle de un capítulo, junto al botón de estudiar, visible únicamente cuando las tarjetas del capítulo ya cargaron y el capítulo tiene al menos una tarjeta. Mientras prepara el quiz, el botón SHALL mostrar "Preparando…" y quedar deshabilitado, ignorando toques repetidos. Si el quiz se arma, el sistema SHALL navegar a la pantalla de práctica; si no, SHALL permanecer en el capítulo y mostrar debajo de los botones el aviso "Necesitas algunas tarjetas básicas en este capítulo para practicar.".

#### Scenario: Capítulo con tarjetas básicas
- **WHEN** el usuario toca "Practicar" en un capítulo con al menos una tarjeta básica con anverso y reverso
- **THEN** el sistema abre la pantalla de práctica con la primera pregunta

#### Scenario: Capítulo sin tarjetas elegibles
- **WHEN** el usuario toca "Practicar" en un capítulo cuyas tarjetas son todas de tipo cloze
- **THEN** el sistema no navega y muestra el aviso de que necesita tarjetas básicas para practicar

#### Scenario: Capítulo vacío
- **WHEN** el capítulo no tiene tarjetas
- **THEN** el botón "Practicar" no se muestra

#### Scenario: Falla la carga de tarjetas al preparar
- **WHEN** la lectura de las tarjetas del capítulo falla al tocar "Practicar"
- **THEN** el sistema no navega, registra el error y muestra en el capítulo el mismo aviso de que necesita tarjetas básicas para practicar

### Requirement: La práctica ocurre en pantalla completa y requiere sesión
El sistema SHALL mostrar la práctica en una pantalla completa fuera de la navegación principal (sin pestañas), accesible solo con sesión iniciada, con una barra superior que incluye el progreso, el contador "posición / total" y un enlace "Salir" que vuelve a la Biblioteca. Si se entra a la pantalla sin una práctica preparada (por ejemplo, recargando la página), el sistema SHALL redirigir a la Biblioteca.

#### Scenario: Entrada directa sin práctica preparada
- **WHEN** el usuario abre la ruta de práctica sin haber iniciado un quiz desde un capítulo
- **THEN** el sistema lo redirige a la Biblioteca

#### Scenario: Salir a mitad de la práctica
- **WHEN** el usuario toca "Salir" con preguntas pendientes
- **THEN** el sistema vuelve a la Biblioteca sin guardar nada

#### Scenario: Barra de progreso
- **WHEN** el usuario está en la pregunta `n` de `total`
- **THEN** la barra de progreso se llena en proporción `(n - 1) / total` y el contador muestra `n / total`

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
El sistema SHALL barajar las tarjetas elegibles y tomar como máximo 10 para el quiz. Cada sesión de práctica SHALL producir un orden distinto. Con menos de 10 elegibles, entran todas.

#### Scenario: Capítulo grande
- **WHEN** el capítulo tiene 15 tarjetas elegibles
- **THEN** el quiz tiene 10 preguntas

#### Scenario: Capítulo pequeño
- **WHEN** el capítulo tiene 2 tarjetas elegibles
- **THEN** el quiz tiene 2 preguntas

### Requirement: Los tipos de pregunta se alternan por posición y la opción múltiple exige distractores suficientes
El sistema SHALL asignar el tipo de cada pregunta según su posición en el quiz: las posiciones impares (1.ª, 3.ª, 5.ª…) son de opción múltiple y las pares (2.ª, 4.ª…) son de escribir. Si una pregunta de posición impar no dispone de 3 distractores, SHALL caer al tipo escribir, que siempre es posible.

#### Scenario: Alternancia con distractores suficientes
- **WHEN** el capítulo tiene 6 tarjetas elegibles con 6 respuestas distintas
- **THEN** el quiz tiene 6 preguntas que alternan opción múltiple y escribir, empezando por opción múltiple

#### Scenario: Pocas respuestas distintas
- **WHEN** el capítulo tiene solo 2 tarjetas elegibles
- **THEN** todas las preguntas del quiz son de escribir

### Requirement: Una pregunta de opción múltiple presenta 4 opciones barajadas sin repetidos
El sistema SHALL construir cada pregunta de opción múltiple con exactamente 4 opciones: la respuesta correcta más 3 distractores, barajadas entre sí. Los distractores SHALL ser reversos reales de otras tarjetas elegibles del mismo capítulo (incluidas las que no entraron en el quiz), elegidos al azar entre las respuestas distintas del capítulo, excluyendo las que coinciden con la respuesta correcta tras normalizarlas. Dos reversos SHALL considerarse la misma respuesta cuando coinciden tras normalizar (recortar, minúsculas, espacios colapsados); de cada grupo se conserva el texto de la primera aparición.

#### Scenario: Cuatro opciones distintas con la correcta incluida
- **WHEN** se genera una pregunta de opción múltiple
- **THEN** tiene 4 opciones distintas, una de ellas es la respuesta correcta y todas son reversos de tarjetas del capítulo

#### Scenario: Reversos repetidos no sirven como distractores separados
- **WHEN** dos tarjetas del capítulo tienen el reverso "casa" y "CASA"
- **THEN** cuentan como una sola respuesta distinta al elegir distractores

#### Scenario: Distractores de tarjetas fuera del quiz
- **WHEN** el capítulo tiene 15 tarjetas elegibles y el quiz solo usa 10
- **THEN** los distractores pueden provenir de cualquiera de las 15

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
El sistema SHALL ofrecer un campo de texto (sin autocompletar ni autocapitalizar) y un botón "Comprobar", deshabilitado mientras lo escrito esté vacío o sea solo espacios; la tecla Enter SHALL equivaler a "Comprobar". La respuesta escrita SHALL contar como correcta cuando, tras normalizar ambas partes, coincide con el reverso completo o con cualquiera de sus fragmentos separados por `,`, `;` o `/`. La normalización SHALL recortar espacios en los extremos, pasar a minúsculas y colapsar espacios internos consecutivos en uno, conservando los acentos. Una entrada vacía nunca acierta. Tras comprobar, el campo SHALL quedar deshabilitado.

#### Scenario: Mayúsculas y espacios no importan
- **WHEN** la respuesta es "rendirse" y el usuario escribe "  RENDIRSE "
- **THEN** cuenta como correcta

#### Scenario: Cualquier fragmento del reverso vale
- **WHEN** la respuesta es "rendirse, darse por vencido" y el usuario escribe "darse por vencido"
- **THEN** cuenta como correcta

#### Scenario: El reverso completo también vale
- **WHEN** la respuesta es "rendirse, darse por vencido" y el usuario escribe "rendirse, darse por vencido"
- **THEN** cuenta como correcta

#### Scenario: Los acentos sí importan
- **WHEN** la respuesta es "rendí" y el usuario escribe "rendi"
- **THEN** cuenta como incorrecta

#### Scenario: Respuesta distinta
- **WHEN** la respuesta es "rendirse" y el usuario escribe "avanzar"
- **THEN** cuenta como incorrecta

#### Scenario: Entrada vacía
- **WHEN** el campo contiene solo espacios
- **THEN** el botón "Comprobar" está deshabilitado y Enter no registra respuesta

### Requirement: Feedback inmediato y avance controlado
Tras responder, el sistema SHALL mostrar "¡Correcto!" con un icono de verificación si acertó, o un icono de cruz con el texto "La respuesta era <respuesta>." si falló, y SHALL mostrar el botón de avance: "Siguiente" en las preguntas intermedias y "Ver resultado" en la última. El sistema NO SHALL avanzar sin haber respondido la pregunta actual, y una pregunta ya respondida NO SHALL aceptar otra respuesta ni contar doble en el puntaje. Al avanzar, el campo de texto SHALL vaciarse.

#### Scenario: Acierto
- **WHEN** el usuario responde correctamente
- **THEN** ve "¡Correcto!" y el botón de avance

#### Scenario: Fallo
- **WHEN** el usuario responde incorrectamente
- **THEN** ve "La respuesta era …" con la respuesta correcta y el botón de avance

#### Scenario: Responder dos veces no cuenta doble
- **WHEN** el usuario acierta una pregunta y vuelve a responderla
- **THEN** el puntaje de aciertos sube una sola vez

#### Scenario: Última pregunta
- **WHEN** el usuario responde la última pregunta
- **THEN** el botón de avance dice "Ver resultado"

### Requirement: Resumen final con el puntaje
Al avanzar desde la última pregunta respondida, el sistema SHALL mostrar la pantalla "¡Práctica completada!" con el texto "Acertaste X de N." (X = aciertos, N = total de preguntas) y un botón "Volver a Biblioteca". Una vez terminada, la práctica NO SHALL aceptar más respuestas.

#### Scenario: Resumen con aciertos y fallos
- **WHEN** el usuario acierta 1 de 2 preguntas y avanza desde la última
- **THEN** ve "Acertaste 1 de 2." y el botón para volver a la Biblioteca

#### Scenario: Respuestas después de terminar
- **WHEN** la práctica ya terminó
- **THEN** cualquier intento de responder se ignora y el puntaje no cambia

### Requirement: La práctica no toca la programación ni deja registro
El sistema SHALL tratar la práctica como una modalidad aparte del repaso: NO SHALL modificar la programación de ninguna tarjeta, NO SHALL añadir registros al historial de repasos, NO SHALL alterar las estadísticas del día (repasos completados, calificaciones, nuevas introducidas) y NO SHALL crear, editar ni borrar tarjetas. La única interacción con el almacén es la lectura de las tarjetas del capítulo al iniciar.

#### Scenario: Practicar no cambia la cola de Hoy
- **WHEN** el usuario completa una práctica con aciertos y fallos
- **THEN** las fechas de vencimiento, estados y conteos de la cola diaria permanecen idénticos

#### Scenario: Practicar no cuenta como repaso
- **WHEN** el usuario completa una práctica
- **THEN** "Repasadas hoy" y la distribución de calificaciones de Progreso no cambian
