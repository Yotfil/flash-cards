# Práctica con IA (paquetes de práctica) Specification

## Purpose

Dar al usuario una rama de estudio alternativa a los libros: **paquetes de práctica** que él mismo llena con las palabras, frases o conceptos que se cruza en el día (una película, una reunión) y que quiere reforzar conversando con un asistente de IA externo. Cada paquete admite hasta 20 ítems (ajustable), se practica a diario en la misma pantalla de repaso con los cuatro cerebros pero **sin algoritmo de programación**: la calificación solo decide si el ítem vuelve mañana. Al terminar cada práctica la app arma un **prompt** con todo lo repasado hoy y énfasis en lo difícil; el usuario lo copia y lo lleva a su chat de IA. La app no habla con ningún modelo ni paga por ello. El paquete se completa solo cuando el usuario dice que ya se sabe todos sus ítems. Nunca toca los libros, la programación de las tarjetas, el historial de repasos ni las estadísticas del día.

Capacidad nueva (no existe en v0.1.1). Primera versión diseñada el 2026-10-17 como "lotes de difíciles del repaso"; **rediseñada el 2026-10-24 en su explore** como paquetes de contenido propio, a partir de cómo el usuario quiere usarla. Los ítems cloze se admiten **a prueba** en esta rama: si al usarlos no cuadran, se retiran sin tocar los libros.

## Requirements

### Requirement: La práctica con IA es una rama aparte que no toca libros, programación ni estadísticas
El sistema SHALL guardar los paquetes y sus ítems en una colección propia bajo los datos privados del usuario, separada de libros, capítulos y tarjetas. Practicar un paquete NO SHALL modificar la programación de ninguna tarjeta, NO SHALL añadir registros al historial de repasos, NO SHALL alterar los indicadores del día (repasos completados, calificaciones, nuevas introducidas) ni la racha, y NO SHALL crear, editar ni borrar tarjetas de ningún libro. Los ítems de un paquete NO SHALL aparecer en la cola de Hoy, en Progreso ni en la práctica (mini-quiz) de los libros.

#### Scenario: Practicar un paquete no cambia Hoy ni Progreso
- **WHEN** el usuario practica un paquete y califica varios ítems "Otra vez"
- **THEN** la cola de Hoy, "Repasadas hoy", la distribución de calificaciones y la racha permanecen idénticos

#### Scenario: Los ítems no son tarjetas
- **WHEN** el usuario agrega un ítem a un paquete
- **THEN** no se crea ninguna tarjeta en ningún libro y el contador de ningún libro cambia

### Requirement: Un paquete tiene nombre, capacidad propia y estado
Un paquete SHALL tener un nombre (obligatorio tras recortar, máximo 120 caracteres), una capacidad fijada al crearse igual al ajuste "Ítems por paquete" vigente (20 por defecto), su lista de ítems, la fecha de creación y, si está completado, la fecha de completado. Un paquete SHALL estar "abierto" (admite ítems y práctica) o "completado" (solo lectura, en el historial). El usuario SHALL poder tener varios paquetes abiertos a la vez. Cambiar después el ajuste de capacidad NO SHALL afectar a los paquetes ya creados.

#### Scenario: Crear un paquete
- **WHEN** el usuario crea el paquete "Película del viernes" con el ajuste en 20
- **THEN** existe un paquete abierto, vacío, con capacidad 20

#### Scenario: Varios abiertos
- **WHEN** el usuario tiene el paquete A con 14 ítems y crea el paquete B
- **THEN** ambos están abiertos y cada uno se practica por separado

#### Scenario: El ajuste cambia con paquetes abiertos
- **WHEN** existe un paquete de capacidad 20 con 15 ítems y el usuario cambia el ajuste a 10
- **THEN** ese paquete sigue admitiendo hasta 20; el ajuste de 10 aplica a los paquetes que se creen después

### Requirement: Los ítems se agregan a mano o pegando texto, con la gramática de la importación
Cada ítem SHALL tener anverso y reverso (o ser cloze, a prueba), con ejemplo opcional, con las mismas reglas de validez que una tarjeta. El detalle del paquete SHALL ofrecer "Agregar" (el mismo formulario de tarjeta, sin selector de capítulo) e "Importar" (el mismo diálogo de pegar texto, en modo agregar, con previsualización; los encabezados `#` se ignoran como capítulos). El sistema SHALL rechazar agregar más ítems de los que caben: la previsualización SHALL indicar "Caben N más en este paquete." y el botón de confirmar SHALL limitarse a ese número; con el paquete lleno, "Agregar" e "Importar" SHALL mostrarse deshabilitados con "Este paquete está lleno.". Los ítems SHALL poder editarse y borrarse como las tarjetas; borrar un ítem no exige confirmación extra más allá de la de tarjeta. Editar un ítem que ya no existe (otro dispositivo lo borró mientras el formulario estaba abierto) SHALL fallar con el error del formulario sin escribir nada en el paquete.

#### Scenario: Agregar a mano
- **WHEN** el usuario agrega `to call it a day | dar el día por terminado` a un paquete con 7 ítems
- **THEN** el paquete tiene 8 ítems y el nuevo está "para hoy"

#### Scenario: Pegar más de lo que cabe
- **WHEN** el paquete tiene 18 ítems de 20 y el usuario pega 5 líneas válidas
- **THEN** la previsualización muestra "5 ítems" y "Caben 2 más en este paquete.", el botón dice "Importar 2" y al confirmar entran las 2 primeras válidas

#### Scenario: Paquete lleno
- **WHEN** el paquete tiene 20 ítems de 20
- **THEN** "Agregar" e "Importar" están deshabilitados con "Este paquete está lleno."

#### Scenario: Ítem cloze a prueba
- **WHEN** el usuario pega `She {{gave up}} too early`
- **THEN** entra como ítem cloze y en la práctica se muestra con el hueco como una tarjeta cloze

#### Scenario: Editar un ítem que otro dispositivo borró
- **WHEN** el computador tiene abierto el formulario de «to look up», el usuario lo borra desde el móvil y luego guarda el cambio en el computador
- **THEN** el formulario muestra su error, el paquete no gana ningún resto de ese ítem y sigue leyéndose en los dos dispositivos

### Requirement: "Para hoy" son los ítems nuevos y los difíciles de días anteriores, y el conjunto se fija en la primera práctica del día
El sistema SHALL considerar "para hoy" los ítems del paquete que nunca se han practicado y los que en su última práctica, en un día de estudio anterior, recibieron "Otra vez" o "Difícil". Los ítems cuya última calificación fue "Bien" o "Fácil" SHALL descansar: no vuelven a la práctica diaria. El día SHALL ser el día de estudio del usuario (zona horaria y hora de inicio de Ajustes), el mismo de Hoy. Practicar un día SHALL significar calificar al menos un ítem ese día: con la primera calificación del día el sistema SHALL fijar el conjunto del día (los ítems de esa práctica); abrir la práctica y salir sin calificar ninguno NO SHALL contar como practicar (no fija el conjunto, no muestra "Ya practicaste hoy" ni habilita "Copiar prompt de hoy"). Los ítems agregados después de la primera calificación del día NO SHALL entrar ese día (entran al siguiente como nuevos) ni reactivar el aviso de Hoy. Antes de la primera calificación del día, los ítems agregados SÍ cuentan.

#### Scenario: Día uno
- **WHEN** el usuario agrega 8 ítems y practica
- **THEN** la práctica tiene 8 ítems

#### Scenario: Día dos
- **WHEN** ayer 5 de 8 salieron "Otra vez" o "Difícil" y hoy el usuario agrega 6 ítems antes de practicar
- **THEN** la práctica de hoy tiene 11 ítems: los 6 nuevos y los 5 difíciles

#### Scenario: Agregar después de practicar
- **WHEN** el usuario ya practicó hoy y agrega 4 ítems
- **THEN** el bloque de Hoy no vuelve a avisar y los 4 entran a la práctica de mañana

#### Scenario: Abrir la práctica y salir sin calificar
- **WHEN** el usuario toca "Practicar hoy" en un paquete con 8 para hoy, toca "Salir" sin calificar ninguno y después agrega 4 ítems
- **THEN** el paquete sigue sin practicar hoy: Hoy avisa de 12 para hoy, "Copiar prompt de hoy" sigue deshabilitado y la siguiente práctica tiene los 12

#### Scenario: Las de Bien descansan
- **WHEN** un ítem recibió "Bien" ayer
- **THEN** no está "para hoy" aunque siga en el paquete

#### Scenario: Cambio de día de estudio
- **WHEN** el usuario tiene hora de inicio 4 y practica a la 01:30 local
- **THEN** la práctica se acredita al día de estudio anterior, igual que en la cola diaria

### Requirement: La práctica se repite las veces que se quiera en el día sobre el mismo conjunto, y manda la última calificación
"Practicar hoy" SHALL seguir disponible tras la primera práctica del día, siempre sobre el conjunto fijado ese día. Cada ítem SHALL guardar su última calificación y el día en que se practicó; una práctica posterior en el mismo día SHALL sobrescribirlas. Para decidir si un ítem vuelve mañana SHALL contar únicamente la última calificación del día.

#### Scenario: Repetir en el día
- **WHEN** a las 9 un ítem salió "Otra vez" y a las 21 el usuario vuelve a practicar y lo califica "Bien"
- **THEN** mañana ese ítem no está "para hoy"

#### Scenario: Conjunto estable
- **WHEN** el usuario practica por segunda vez en el día
- **THEN** la práctica tiene exactamente los mismos ítems que la primera, en orden barajado

### Requirement: La práctica usa la pantalla de repaso con los cuatro cerebros, sin programación
"Practicar hoy" SHALL abrir la pantalla de repaso a pantalla completa (anverso, revelar, cuatro cerebros con los textos "Otra vez", "Difícil", "Bien", "Fácil") con los ítems del conjunto del día en orden barajado. NO SHALL mostrarse intervalos de retorno bajo los cerebros ni sugerencia por tiempo. Cada calificación SHALL guardarse de inmediato sin esperar al servidor, como en el repaso; si el servidor la rechaza, el ítem vuelve al final con el aviso del repaso. Si el servidor la rechaza porque el paquete ya no existe (se borró en otro dispositivo), el ítem NO SHALL volver: la práctica SHALL cerrarse con "Este paquete ya no existe" y un enlace a la Biblioteca, sin cierre ni prompt. "Salir" SHALL volver al detalle del paquete sin cerrar nada. Entrar a la pantalla sin una práctica preparada SHALL redirigir a la Biblioteca. La práctica es efímera: nunca se retoma una anterior.

#### Scenario: Calificar un ítem
- **WHEN** el usuario revela un ítem y toca "Difícil"
- **THEN** el ítem guarda última calificación 2 y el día de hoy, y la práctica pasa al siguiente

#### Scenario: Sin intervalos
- **WHEN** el usuario revela un ítem
- **THEN** los cuatro cerebros no muestran "en 3 días" ni ninguna previsualización de intervalo

#### Scenario: Salir a mitad
- **WHEN** el usuario toca "Salir" con ítems pendientes
- **THEN** vuelve al detalle del paquete; las calificaciones ya dadas se conservan y las pendientes quedan como estaban

#### Scenario: El paquete se borró en otro dispositivo
- **WHEN** el usuario practica en el móvil, borra el paquete desde el computador y el servidor rechaza la siguiente calificación del móvil porque el paquete ya no existe
- **THEN** la práctica del móvil se cierra con "Este paquete ya no existe" y el enlace a la Biblioteca, y el ítem no vuelve a la cola

### Requirement: El cierre de la práctica ofrece el prompt y vuelve al paquete
Al terminar la práctica, la pantalla de cierre SHALL mostrar "Práctica terminada", "Practicaste N ítems" (plural real), las pastillas por calificación y, en el bloque de práctica con IA, cuántos salieron difíciles ("5 para reforzar con la IA" o "Ninguno difícil esta vez"), el botón "Copiar prompt" y el botón "Volver al paquete". El prompt del cierre SHALL armarse con el día de estudio de la práctica, aunque el día de estudio cambie mientras se practica, de modo que sus difíciles coincidan con los que el cierre anuncia. Al salir o terminar, el cierre NO SHALL ofrecer "Volver a Hoy".

#### Scenario: Cierre con difíciles
- **WHEN** termina una práctica de 8 ítems con 5 calificados "Otra vez" o "Difícil"
- **THEN** el cierre muestra "Practicaste 8 ítems", "5 para reforzar con la IA", "Copiar prompt" y "Volver al paquete"

#### Scenario: Cierre sin difíciles
- **WHEN** termina una práctica con todo "Bien" o "Fácil"
- **THEN** el cierre muestra "Ninguno difícil esta vez" y "Copiar prompt" sigue disponible

#### Scenario: Práctica que cruza el inicio del día
- **WHEN** el usuario empieza el día a medianoche, practica de 23:58 a 00:02 y califica "Otra vez" los 3 ítems
- **THEN** el cierre dice "3 para reforzar con la IA" y el prompt copiado lista esos 3 como difíciles

### Requirement: El prompt se arma con una plantilla editable, todo lo repasado hoy y énfasis en lo difícil
El sistema SHALL generar el prompt sustituyendo en la plantilla del usuario `[[REPASADAS]]` por la lista de todos los ítems del conjunto del día y `[[DIFICILES]]` por la lista de los que tienen última calificación "Otra vez" o "Difícil" hoy, una por línea en el formato `anverso | reverso` con el contenido actual del ítem; un ítem cloze SHALL listarse como su anverso sin los marcadores `{{` y `}}` y sin separador. Si la plantilla no contiene un marcador, su lista SHALL añadirse al final precedida de una línea en blanco y de un rótulo ("Reviewed today:" / "Hard today:"). Si no hay difíciles, la lista de difíciles queda vacía. "Copiar prompt de hoy" en el detalle del paquete SHALL estar disponible solo si hoy ya se practicó; en el cierre siempre.

#### Scenario: Repasadas y difíciles
- **WHEN** el conjunto del día tiene 11 ítems y 8 quedaron difíciles
- **THEN** el prompt lista 11 bajo `[[REPASADAS]]` y esos 8 bajo `[[DIFICILES]]`

#### Scenario: Ítem cloze en el prompt
- **WHEN** un ítem es la cloze "She {{gave up}} too early"
- **THEN** su línea en el prompt es "She gave up too early"

#### Scenario: Plantilla sin un marcador
- **WHEN** la plantilla no contiene `[[DIFICILES]]`
- **THEN** el prompt es la plantilla, una línea en blanco, "Hard today:" y la lista de difíciles

#### Scenario: Aún no se practicó hoy
- **WHEN** el usuario abre el detalle de un paquete sin haber practicado hoy
- **THEN** "Copiar prompt de hoy" está deshabilitado con "Practica primero para armar el prompt de hoy."

### Requirement: La plantilla por defecto es un prompt de conversación en inglés con énfasis en lo difícil
El sistema SHALL usar como plantilla por defecto el siguiente texto, en el que `[[REPASADAS]]` y `[[DIFICILES]]` reciben sus listas. La plantilla pide a la IA conversar usando todos los términos repasados, insistir en los difíciles sin definirlos de entrada, turnos cortos, corrección en línea y, al cerrar, un reporte por término y un bloque de nuevas palabras en el formato de importación de la app.

```
You're my English conversation partner. We'll have a natural, friendly chat, like two friends talking, and you'll help me improve along the way. I'm a native Spanish speaker.

TODAY'S TERMS
These are the words and phrases I practiced today. The right side is the meaning I'm learning, in Spanish.

<reviewed_terms>
[[REPASADAS]]
</reviewed_terms>

The ones below are the ones I struggled with. They matter most: the main goal of this session is for me to end up using all of them confidently.

<hard_terms>
[[DIFICILES]]
</hard_terms>

HOW TO USE THE TERMS
- Don't list or define them at the start. Weave them naturally into the conversation and steer topics so they come up, the hard ones first and more often.
- Create openings for ME to use them: ask questions whose natural answer needs one of these terms.
- If I avoid a term or use it wrong, nudge me ("How would you say that using 'give up'?") before giving me the answer.
- Keep a private tally of which terms I used correctly on my own.

HOW WE TALK
- If I give you a topic, we talk about that. If not, pick something relatable or ask what's on my mind.
- Keep your messages short (2-4 sentences) and end most of them with a question, so I do most of the talking.
- Natural conversation, not an interview or a lesson.
- Challenge me a little but keep it achievable. Adapt to the level you see in my writing.

CORRECTIONS
- Grammar mistake: correct it inline, briefly, then continue. Format: [Correction: "X" → "Y" because ...]
- Wrong word usage: explain the right usage in one line.
- If I ask "how do I say [Spanish word/phrase]?", give me the English with one quick example.
- If I'm struggling to express something, help me find the words.
- Minor mistakes can wait until the end of my turn. Don't praise every sentence; if I'm doing well, just keep talking.

END OF SESSION
When I say "feedback" or "session over", stop the conversation and give me:
1. Terms report, one line per term: OK = used correctly on my own · HELP = used, but needed help or had errors · SKIP = never came up.
2. Patterns you noticed (good and bad) and 2-3 things to practice.
3. A code block I can import into my flashcard app with the NEW words and phrases from this session: things I didn't know, misused, or asked about. Do NOT include any of today's terms. One per line, exactly this format, nothing else inside the block:
   english term or phrase | meaning in Spanish

Let's start. Say hi and get us talking.
```

#### Scenario: Usuario sin plantilla propia
- **WHEN** el usuario nunca editó la plantilla y copia el prompt
- **THEN** el prompt es la plantilla por defecto con las dos listas en lugar de sus marcadores

### Requirement: Copiar el prompt da confirmación visible y tiene salida manual si el portapapeles falla
"Copiar prompt" SHALL escribir el prompt en el portapapeles. Si tiene éxito, SHALL mostrar "Prompt copiado. Pégalo en tu chat de IA." en una región anunciada por lectores de pantalla, durante unos segundos. Si el portapapeles no está disponible o falla, el sistema SHALL mostrar el prompt completo en un área de texto de solo lectura con el aviso "No se pudo copiar automáticamente. Selecciona el texto y cópialo.". Copiar SHALL funcionar sin conexión.

#### Scenario: Copia exitosa
- **WHEN** el usuario pulsa "Copiar prompt" y el portapapeles acepta el texto
- **THEN** aparece la confirmación y el portapapeles contiene el prompt completo

#### Scenario: Portapapeles no disponible
- **WHEN** el usuario pulsa "Copiar prompt" y la escritura en el portapapeles falla
- **THEN** aparece el área de texto con el prompt y el aviso para copiarlo a mano

### Requirement: El paquete se completa solo a mano y pasa al historial
El detalle de un paquete abierto SHALL ofrecer "Marcar como completado", que tras la confirmación "¿Ya te sabes todos los ítems de este paquete? Pasará al historial y dejará de practicarse." lo pasa a "completado" con la fecha de hoy. El sistema NO SHALL completar un paquete automáticamente, ni por estar lleno ni por tener todo "Bien". Un paquete completado SHALL verse en solo lectura (ítems y sus últimas calificaciones), SHALL permitir "Copiar prompt" con todos sus ítems bajo `[[REPASADAS]]` y ninguno bajo `[[DIFICILES]]`, y NO SHALL admitir agregar, editar, practicar ni volver a abrir.

#### Scenario: Completar
- **WHEN** el usuario pulsa "Marcar como completado" en un paquete con 20 ítems y confirma
- **THEN** el paquete queda completado con la fecha de hoy, desaparece de los abiertos y aparece en el historial

#### Scenario: Lleno no es completado
- **WHEN** un paquete llega a 20 ítems y todos tienen "Bien"
- **THEN** sigue abierto hasta que el usuario lo marque

#### Scenario: Cancelar
- **WHEN** el usuario cancela la confirmación
- **THEN** el paquete sigue abierto sin cambios

### Requirement: Los paquetes viven en la Biblioteca y el detalle muestra lo de hoy
La Biblioteca SHALL mostrar, debajo de los libros, la sección "Práctica con IA" con los paquetes abiertos como filas (nombre, "ítems / capacidad", "N para hoy" o "Ya practicaste hoy" o "Nada para hoy"), el botón "Nuevo paquete" y el enlace "Paquetes completados" al historial. Sin paquetes, la sección SHALL mostrar "Guarda aquí las palabras y frases que te cruces en el día y practícalas con tu IA." y "Nuevo paquete". El detalle de un paquete SHALL mostrar su nombre, "ítems / capacidad", la lista de ítems con la etiqueta "Para hoy" en los que tocan y la última calificación en los demás, y las acciones "Practicar hoy", "Agregar", "Importar", "Copiar prompt de hoy" y "Marcar como completado". El paquete SHALL poder renombrarse y borrarse (confirmación "¿Borrar este paquete? Se pierden sus N ítems. No se puede deshacer.").

#### Scenario: Sección con paquetes
- **WHEN** el usuario tiene el paquete A (14 / 20, 8 para hoy) y el B (3 / 20, ya practicado hoy)
- **THEN** la Biblioteca muestra la sección con las dos filas y sus textos, "Nuevo paquete" y "Paquetes completados"

#### Scenario: Sin paquetes
- **WHEN** el usuario no tiene paquetes
- **THEN** la sección muestra el texto de invitación y "Nuevo paquete"

#### Scenario: Historial
- **WHEN** el usuario tiene dos paquetes completados, uno del 2026-10-10 y otro del 2026-10-15
- **THEN** "Paquetes completados" lista primero el del 2026-10-15, cada uno con nombre, fecha y "ítems", y sin historial muestra "Aún no has completado ningún paquete."

### Requirement: Hoy avisa de lo pendiente en los paquetes sin robar el foco
Hoy SHALL mostrar, debajo de las filas por libro, el bloque "Práctica con IA" con una fila por paquete abierto que tenga ítems para hoy ("Película del viernes · 11 para hoy") y su botón de practicar; un paquete ya practicado hoy SHALL mostrarse como "Ya practicaste hoy · Volver a practicar" sin aviso; sin paquetes con pendientes ni practicados hoy, el bloque SHALL decir "Nada pendiente en tus paquetes." con el enlace "Ver paquetes". Sin ningún paquete, el bloque NO SHALL mostrarse. Si la lectura de los paquetes falla, el bloque SHALL mostrar "No pudimos cargar tus paquetes." con "Reintentar" y el resto de Hoy SHALL seguir funcionando.

#### Scenario: Pendientes en dos paquetes
- **WHEN** el paquete A tiene 11 para hoy y el B 3
- **THEN** Hoy muestra dos filas con sus números y un botón de practicar cada una

#### Scenario: Ya practicado
- **WHEN** el usuario ya practicó el paquete A hoy
- **THEN** su fila dice "Ya practicaste hoy · Volver a practicar" y no cuenta como aviso

#### Scenario: Falla la lectura
- **WHEN** la lectura de los paquetes falla al abrir Hoy
- **THEN** el bloque muestra el error con "Reintentar" y el bloque principal de Hoy sigue visible

### Requirement: La plantilla y la capacidad se editan en Ajustes
Ajustes SHALL ofrecer la sección "Práctica con IA" con: (a) el área de texto de la plantilla, el aviso "Usa [[REPASADAS]] y [[DIFICILES]] donde quieras que vayan tus términos." y el botón "Restaurar plantilla por defecto"; y (b) el campo "Ítems por paquete" (entero entre 5 y 100, por defecto 20). Ambos SHALL guardarse en las preferencias del usuario con el botón "Guardar" y el mismo feedback que los demás ajustes; una plantilla vacía o de solo espacios SHALL rechazarse con "La plantilla no puede estar vacía.".

#### Scenario: Editar la plantilla
- **WHEN** el usuario cambia la plantilla, pulsa "Guardar" y el guardado tiene éxito
- **THEN** el siguiente prompt copiado usa la plantilla nueva

#### Scenario: Restaurar la plantilla
- **WHEN** el usuario pulsa "Restaurar plantilla por defecto" y guarda
- **THEN** la plantilla vuelve al texto por defecto

#### Scenario: Capacidad fuera de rango
- **WHEN** el usuario escribe 3 o 2.5 en "Ítems por paquete"
- **THEN** el botón "Guardar" queda deshabilitado y se muestra "Entre 5 y 100, sin decimales."

### Requirement: Sin conexión, practicar y copiar funcionan; la gestión necesita red
Sin conexión, el sistema SHALL permitir practicar un paquete con los datos que el dispositivo tenga (las calificaciones se guardan sin esperar al servidor) y copiar el prompt. Crear, renombrar y borrar paquetes, agregar, importar, editar y borrar ítems, marcar como completado y los Ajustes SHALL deshabilitar su acción principal con "Necesitas conexión para guardar cambios.".

#### Scenario: Practicar sin red
- **WHEN** no hay conexión y el usuario toca "Practicar hoy"
- **THEN** la práctica arranca con los ítems guardados y las calificaciones se aceptan

#### Scenario: Agregar sin red
- **WHEN** no hay conexión y el usuario abre "Agregar"
- **THEN** el botón de guardar está deshabilitado con "Necesitas conexión para guardar cambios."

### Requirement: Los datos de los paquetes se validan en la frontera y cargan con estados visibles
Al leer paquetes del almacén, el sistema SHALL validar cada documento antes de usarlo; un documento malformado SHALL registrarse como error y tratarse como fallo de carga. Los ítems de un paquete SHALL ser solo los que el paquete lista en su orden: los datos guardados de un ítem que el paquete ya no lista (lo que deja calificar o editar, desde otro dispositivo, un ítem ya borrado) NO SHALL validarse ni mostrarse, y el sistema SHALL dejar constancia en el registro de la app; el paquete y los demás SHALL seguir leyéndose. Mientras carga, las secciones SHALL mostrar un esqueleto; si la carga falla, SHALL mostrar "No pudimos cargar tus paquetes." con "Reintentar".

#### Scenario: Documento malformado
- **WHEN** un paquete guardado no cumple la forma esperada
- **THEN** se registra el error y la sección muestra el estado de error, sin romper la pantalla

#### Scenario: Restos de un ítem borrado en otro dispositivo
- **WHEN** el usuario borra «to give up» en el computador y el móvil, con la lista vieja, lo califica "Otra vez"
- **THEN** la Biblioteca y Hoy siguen mostrando todos los paquetes en los dos dispositivos, el paquete no muestra «to give up» y el registro de la app anota el resto ignorado

#### Scenario: Reintentar
- **WHEN** el usuario toca "Reintentar" y la lectura tiene éxito
- **THEN** la sección muestra los paquetes

### Requirement: El cierre de la práctica con IA recibe el foco
Al mostrarse el cierre de la práctica de un paquete, el sistema SHALL mover el foco a su título, como en el cierre del repaso, para que un lector de pantalla lo anuncie y Tab siga por "Copiar prompt" y "Volver al paquete".

#### Scenario: Cierre con teclado
- **WHEN** el usuario califica con el teclado el último ítem de la práctica y aparece el cierre
- **THEN** el foco está en el título "Práctica terminada" y Tab lleva a "Copiar prompt" y después a "Volver al paquete"
