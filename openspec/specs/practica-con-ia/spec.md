# Práctica con IA (lotes de difíciles) Specification

## Purpose

Convertir las tarjetas que al usuario le cuestan en una conversación de práctica con un asistente de IA externo, sin que la app hable con ningún modelo ni pague por ello: la app arma un prompt, el usuario lo copia y lo lleva a su chat de IA. Las tarjetas calificadas "Otra vez" o "Difícil" en el repaso van llenando un lote cerrado de tamaño fijo; el usuario practica ese lote con la IA las veces que quiera, marca a mano cuáles ya domina y, solo cuando domina todas, empieza un lote nuevo. Los lotes completados quedan en un historial para volver a practicarlos más adelante. Es una modalidad aparte del repaso: nunca altera la programación de ninguna tarjeta, ni el historial de repasos, ni las estadísticas del día.

Capacidad nueva (no existe en v0.1.1), diseñada el 2026-10-17. El formato de exportación que el prompt pide a la IA es el mismo de la spec de importación, para que lo nuevo que surja en la conversación entre a la app sin parser adicional.

## Requirements

### Requirement: La práctica con IA no toca la programación ni deja registro
El sistema SHALL tratar la práctica con IA como una modalidad aparte del repaso: NO SHALL modificar la programación de ninguna tarjeta, NO SHALL añadir registros al historial de repasos, NO SHALL alterar las estadísticas del día y NO SHALL crear, editar ni borrar tarjetas. Los lotes SHALL guardarse como datos privados del usuario en una colección propia, separada de las tarjetas, de modo que la capacidad pueda apagarse o vaciarse sin tocar el modelo principal.

#### Scenario: Marcar dominadas no cambia la cola de Hoy
- **WHEN** el usuario marca como dominadas varias tarjetas del lote
- **THEN** las fechas de vencimiento, estados y conteos de la cola diaria permanecen idénticos

#### Scenario: Copiar el prompt no cuenta como repaso
- **WHEN** el usuario copia el prompt y practica con la IA
- **THEN** "Repasadas hoy" y la distribución de calificaciones de Progreso no cambian

### Requirement: Una tarjeta es "difícil" cuando recibe grado 1 o 2 en una sesión de repaso
El sistema SHALL considerar difícil toda tarjeta calificada "Otra vez" (1) o "Difícil" (2) dentro de una sesión de repaso cuya calificación se guardó con éxito. Una tarjeta calificada varias veces en la misma sesión SHALL contarse una sola vez. Las calificaciones de la práctica (mini-quiz) NO producen difíciles.

#### Scenario: Grados que cuentan
- **WHEN** en una sesión se califican cinco tarjetas con grados 1, 2, 3, 4 y 2
- **THEN** las difíciles de la sesión son las tres calificadas con 1 o 2

#### Scenario: Calificación fallida no cuenta
- **WHEN** el usuario califica "Otra vez" y el guardado falla
- **THEN** la tarjeta no se considera difícil hasta que una calificación de la misma tarjeta tenga éxito

### Requirement: Las difíciles de la sesión entran al lote abierto al terminar o al salir
Al mostrarse la pantalla de cierre de la sesión, o al pulsar "Salir" con al menos una difícil, el sistema SHALL añadir las difíciles de la sesión al lote abierto, en el orden en que se calificaron. Si no existe un lote abierto, el sistema SHALL crear uno nuevo en estado "llenando" con la capacidad vigente del ajuste de tamaño de lote. Si la escritura falla, el sistema SHALL conservar en memoria las difíciles no añadidas, mostrar "No se pudieron añadir las difíciles al lote de práctica." y ofrecer "Reintentar" en el bloque de práctica con IA, tanto en la pantalla de cierre como en Hoy, hasta que se añadan con éxito o la app se recargue.

#### Scenario: Primer lote del usuario
- **WHEN** el usuario sin lotes termina una sesión con cuatro difíciles
- **THEN** se crea un lote en estado "llenando" con esas cuatro tarjetas

#### Scenario: Salir a mitad de sesión
- **WHEN** el usuario califica seis tarjetas (dos con grado 1) y pulsa "Salir"
- **THEN** las dos difíciles entran al lote abierto antes de volver a Biblioteca

#### Scenario: Falla la escritura del lote
- **WHEN** termina la sesión con difíciles y la escritura del lote falla
- **THEN** la pantalla de cierre muestra el mensaje de error con "Reintentar" y el resumen de la sesión sigue visible

#### Scenario: Reintento exitoso
- **WHEN** tras el fallo el usuario pulsa "Reintentar" y la escritura tiene éxito
- **THEN** el mensaje desaparece y el bloque muestra el lote con las difíciles añadidas

### Requirement: Cada ítem del lote guarda una copia del contenido de la tarjeta
Cada ítem del lote SHALL guardar el identificador de la tarjeta, el libro al que pertenecía, una copia del anverso y del reverso en el momento de entrar, el instante en que entró y el instante en que se marcó dominada (vacío mientras no lo esté). Editar o borrar la tarjeta original NO SHALL modificar ni eliminar el ítem.

#### Scenario: Tarjeta editada después de entrar
- **WHEN** una tarjeta entra al lote con anverso "to give up" y luego el usuario la edita a "give up"
- **THEN** el ítem del lote sigue mostrando "to give up"

#### Scenario: Tarjeta borrada después de entrar
- **WHEN** el usuario borra una tarjeta que está en el lote abierto
- **THEN** el ítem sigue en el lote, se puede marcar dominado y sale en el prompt

### Requirement: Solo hay un lote abierto y pasa por tres estados
El sistema SHALL mantener como máximo un lote abierto por usuario. Un lote SHALL estar en uno de tres estados: "llenando" (recibe difíciles hasta alcanzar su capacidad), "cerrado" (alcanzó su capacidad y ya no recibe difíciles) o "completado" (en el historial, no cambia más). Al alcanzar su capacidad, el lote SHALL pasar de "llenando" a "cerrado" en la misma operación en que recibe la difícil que lo llena. Cada lote SHALL recordar su propia capacidad, fijada al crearse; cambiar después el ajuste de tamaño NO SHALL afectar a lotes ya creados.

#### Scenario: Llega a la capacidad
- **WHEN** un lote "llenando" de capacidad 20 tiene 18 ítems y la sesión aporta tres difíciles
- **THEN** entran dos, el lote pasa a "cerrado" y la tercera no entra

#### Scenario: El ajuste cambia con un lote abierto
- **WHEN** existe un lote "llenando" de capacidad 20 con 15 ítems y el usuario cambia el ajuste a 10
- **THEN** ese lote sigue admitiendo hasta 20; el ajuste de 10 aplica al siguiente lote

### Requirement: Las difíciles que no caben se informan y se descartan sin pozo de espera
Cuando el lote abierto está "cerrado", o se llena a mitad de una entrega, las difíciles sobrantes NO SHALL guardarse en ninguna lista de espera: el sistema SHALL informar en el bloque de práctica cuántas quedaron fuera con el texto "N difícil(es) quedaron fuera: el lote está lleno. Volverán a aparecer si siguen costándote." y confiar en que el repaso las vuelva a presentar.

#### Scenario: Lote cerrado durante una sesión
- **WHEN** el lote abierto está "cerrado" y la sesión termina con tres difíciles
- **THEN** no se añade ninguna y el bloque de cierre indica que tres quedaron fuera

### Requirement: Una tarjeta no se repite dentro del lote abierto, pero sí puede volver en lotes posteriores
Al añadir difíciles, el sistema SHALL omitir las que ya tienen un ítem en el lote abierto (dominado o no). Una tarjeta presente solo en lotes completados SHALL poder entrar de nuevo al lote abierto.

#### Scenario: Vuelve a fallar estando en el lote
- **WHEN** una tarjeta ya está en el lote abierto, marcada dominada, y recibe grado 1 en una sesión nueva
- **THEN** no se añade un segundo ítem ni se desmarca el existente

#### Scenario: Vuelve a fallar tras completar su lote
- **WHEN** una tarjeta estuvo en un lote completado y recibe grado 2 en una sesión nueva
- **THEN** entra al lote abierto como ítem nuevo

### Requirement: El usuario marca y desmarca dominadas en el lote abierto
El sistema SHALL mostrar los ítems del lote abierto como una lista con una casilla por ítem, etiquetada con el anverso y el reverso. Marcar la casilla SHALL guardar el instante de dominio; desmarcarla SHALL vaciarlo. Cada cambio SHALL persistirse de inmediato; si el guardado falla, la casilla SHALL volver al valor guardado y mostrarse "No se pudo guardar el cambio. Inténtalo de nuevo.". En un lote completado las casillas SHALL verse pero NO SHALL poder cambiarse.

#### Scenario: Marcar dominada
- **WHEN** el usuario marca la casilla de "to give up" y el guardado tiene éxito
- **THEN** el ítem queda dominado y el progreso del lote sube en uno

#### Scenario: Desmarcar por error
- **WHEN** el usuario desmarca una casilla marcada en un lote abierto
- **THEN** el ítem vuelve a no dominado y el progreso baja en uno

#### Scenario: Falla el guardado de la marca
- **WHEN** el usuario marca una casilla y el guardado falla
- **THEN** la casilla vuelve a desmarcada y aparece el mensaje de error

### Requirement: El lote se completa cuando está cerrado y todo está dominado, o a mano
El sistema SHALL pasar el lote a "completado", registrando la fecha, en la misma operación en que se marca dominado el último ítem de un lote "cerrado". Un lote "llenando" con todos sus ítems dominados SHALL seguir "llenando". El bloque del lote abierto SHALL ofrecer además "Cerrar lote", que tras una confirmación ("¿Cerrar este lote? Pasará al historial tal como está y el siguiente empezará vacío.") lo pasa a "completado" aunque tenga ítems sin dominar o no esté lleno.

#### Scenario: Última dominada de un lote cerrado
- **WHEN** un lote "cerrado" tiene 19 de 20 dominadas y el usuario marca la que falta
- **THEN** el lote queda "completado" con la fecha de hoy y el bloque de Hoy muestra que no hay lote abierto

#### Scenario: Lote a medio llenar todo dominado
- **WHEN** un lote "llenando" tiene 7 ítems y los 7 están dominados
- **THEN** el lote sigue "llenando" y seguirá recibiendo difíciles

#### Scenario: Cierre manual
- **WHEN** el usuario pulsa "Cerrar lote" en un lote con 12 ítems y 9 dominados y confirma
- **THEN** el lote pasa a "completado" con 9 de 12 dominadas y la siguiente sesión con difíciles abre un lote nuevo

#### Scenario: Cancelar el cierre manual
- **WHEN** el usuario cancela la confirmación de "Cerrar lote"
- **THEN** el lote sigue abierto sin cambios

### Requirement: Los lotes completados quedan en un historial consultable y de solo lectura
El sistema SHALL ofrecer, desde el bloque de práctica con IA, el enlace "Lotes anteriores" a una lista de los lotes completados, del más reciente al más antiguo, mostrando por cada uno su fecha de cierre, "dominadas / total" y el botón "Copiar prompt". Abrir un lote completado SHALL mostrar sus ítems con sus marcas. Copiar el prompt de un lote completado NO SHALL cambiar su estado ni sus marcas ni crear un lote nuevo.

#### Scenario: Historial con dos lotes
- **WHEN** el usuario tiene dos lotes completados, uno 20/20 del 2026-10-10 y otro 9/12 del 2026-10-15
- **THEN** la lista muestra primero el del 2026-10-15 con "9 / 12" y después el del 2026-10-10 con "20 / 20"

#### Scenario: Volver a practicar un lote viejo
- **WHEN** el usuario copia el prompt de un lote completado
- **THEN** el prompt contiene todos sus ítems y el lote sigue completado con las mismas marcas

#### Scenario: Sin historial
- **WHEN** el usuario no tiene lotes completados
- **THEN** la lista muestra el estado vacío "Aún no has completado ningún lote."

### Requirement: El prompt se arma con una plantilla editable y los términos del lote
El sistema SHALL generar el prompt sustituyendo en la plantilla del usuario el marcador `[[TERMINOS]]` por la lista de términos, una por línea. Para un lote abierto SHALL incluir solo los ítems no dominados; para un lote completado SHALL incluir todos. Cada línea SHALL tener el formato `anverso | reverso` con la copia guardada en el ítem; para un ítem de tarjeta cloze, la línea SHALL ser el texto del anverso con los marcadores `{{` y `}}` eliminados y sin separador. Si la plantilla no contiene el marcador, la lista SHALL añadirse al final, precedida de una línea en blanco.

#### Scenario: Lote abierto con dominadas
- **WHEN** un lote abierto tiene 20 ítems y 12 dominados
- **THEN** el prompt lista exactamente los 8 no dominados

#### Scenario: Ítem cloze
- **WHEN** un ítem proviene de la tarjeta cloze "She {{gave up}} too early"
- **THEN** su línea en el prompt es "She gave up too early"

#### Scenario: Plantilla sin marcador
- **WHEN** la plantilla del usuario no contiene `[[TERMINOS]]`
- **THEN** el prompt es la plantilla seguida de una línea en blanco y la lista de términos

### Requirement: La plantilla por defecto es un prompt de conversación en inglés orientado a los términos
El sistema SHALL usar como plantilla por defecto el siguiente texto, en el que `[[TERMINOS]]` recibe la lista. La plantilla pide a la IA que no defina los términos al inicio, que cree oportunidades para que el usuario los use, que mantenga turnos cortos, que corrija en línea y que al cerrar entregue un reporte por término (OK / HELP / SKIP) y un bloque de nuevas palabras en el formato de importación de la app (`término | significado`), excluyendo los términos del lote.

```
You're my English conversation partner. We'll have a natural, friendly chat, like two friends talking, and you'll help me improve along the way. I'm a native Spanish speaker.

TODAY'S TARGET TERMS
These are the terms I struggled with in my flashcard review. The right side is the meaning I'm learning, in Spanish. The main goal of this session is for me to end up using all of them confidently.

<target_terms>
[[TERMINOS]]
</target_terms>

HOW TO USE THE TARGET TERMS
- Don't list or define them at the start. Weave them naturally into the conversation and steer topics so they come up.
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
1. Target terms report, one line per term: OK = used correctly on my own · HELP = used, but needed help or had errors · SKIP = never came up. I use this to decide what I've mastered.
2. Patterns you noticed (good and bad) and 2-3 things to practice.
3. A code block I can import into my flashcard app with the NEW words and phrases from this session: things I didn't know, misused, or asked about. Do NOT include any of the target terms. One per line, exactly this format, nothing else inside the block:
   english term or phrase | meaning in Spanish

Let's start. Say hi and get us talking.
```

#### Scenario: Usuario sin plantilla propia
- **WHEN** el usuario nunca editó la plantilla y copia el prompt
- **THEN** el prompt es la plantilla por defecto con los términos del lote en lugar de `[[TERMINOS]]`

### Requirement: La plantilla y el tamaño del lote se editan en Ajustes
El sistema SHALL ofrecer en Ajustes la sección "Práctica con IA" con: (a) un área de texto con la plantilla del prompt, el aviso "Usa [[TERMINOS]] donde quieras que vayan tus tarjetas." y el botón "Restaurar plantilla por defecto"; y (b) el campo "Tarjetas por lote" (entero entre 5 y 100, por defecto 20). Ambos ajustes SHALL guardarse en las preferencias del usuario con un botón explícito "Guardar", con el mismo feedback de resultado que los demás ajustes; si el guardado falla, los campos SHALL conservar lo escrito y mostrarse el error. Una plantilla vacía o de solo espacios SHALL rechazarse con "La plantilla no puede estar vacía.".

#### Scenario: Editar la plantilla
- **WHEN** el usuario cambia la plantilla, pulsa "Guardar" y el guardado tiene éxito
- **THEN** el siguiente prompt copiado usa la plantilla nueva

#### Scenario: Restaurar la plantilla
- **WHEN** el usuario pulsa "Restaurar plantilla por defecto" y guarda
- **THEN** la plantilla vuelve al texto por defecto

#### Scenario: Tamaño fuera de rango
- **WHEN** el usuario escribe 3 o 2.5 en "Tarjetas por lote"
- **THEN** el botón "Guardar" queda deshabilitado y se muestra "Entre 5 y 100, sin decimales."

### Requirement: Copiar el prompt da confirmación visible y tiene salida manual si el portapapeles falla
El botón "Copiar prompt" SHALL escribir el prompt en el portapapeles. Si tiene éxito, SHALL mostrar "Prompt copiado. Pégalo en tu chat de IA." en una región anunciada por lectores de pantalla, durante unos segundos. Si el portapapeles no está disponible o falla, el sistema SHALL mostrar el prompt completo en un área de texto de solo lectura con el aviso "No se pudo copiar automáticamente. Selecciona el texto y cópialo." El botón SHALL estar deshabilitado, con la pista "No hay términos pendientes en este lote.", cuando un lote abierto no tiene ítems sin dominar.

#### Scenario: Copia exitosa
- **WHEN** el usuario pulsa "Copiar prompt" y el portapapeles acepta el texto
- **THEN** aparece la confirmación y el portapapeles contiene el prompt completo

#### Scenario: Portapapeles no disponible
- **WHEN** el usuario pulsa "Copiar prompt" y la escritura en el portapapeles falla
- **THEN** aparece el área de texto con el prompt y el aviso para copiarlo a mano

#### Scenario: Lote abierto sin pendientes
- **WHEN** el lote "llenando" tiene 5 ítems y los 5 están dominados
- **THEN** "Copiar prompt" está deshabilitado con la pista de que no hay pendientes

### Requirement: El bloque de práctica con IA vive en el cierre de sesión y en Hoy
La pantalla de cierre de la sesión de repaso SHALL mostrar, debajo del resumen, el bloque "Práctica con IA" con: cuántas difíciles de esta sesión entraron al lote, el progreso del lote abierto ("dominadas / ítems · estado"), el aviso de las que quedaron fuera si las hubo, y el botón "Copiar prompt". La pantalla Hoy SHALL mostrar el mismo bloque debajo de la cola del día, ampliado con la lista de casillas del lote abierto, "Cerrar lote" y el enlace "Lotes anteriores". Sin lote abierto, el bloque de Hoy SHALL mostrar "Las tarjetas que califiques Otra vez o Difícil irán llenando aquí tu lote de práctica." y el enlace al historial. No se añade ninguna pestaña a la navegación principal.

#### Scenario: Cierre con difíciles
- **WHEN** termina una sesión con tres difíciles y el lote abierto queda en 10 de 20 con 4 dominadas
- **THEN** el cierre muestra "3 tarjetas difíciles entraron al lote", "4 / 10 dominadas · llenando" y "Copiar prompt"

#### Scenario: Cierre sin difíciles
- **WHEN** termina una sesión sin ninguna calificación 1 ni 2
- **THEN** el bloque muestra "Ninguna tarjeta difícil en esta sesión." y, si hay lote abierto, su progreso y "Copiar prompt"

#### Scenario: Hoy sin lote
- **WHEN** el usuario abre Hoy sin ningún lote abierto
- **THEN** el bloque muestra el texto de invitación y el enlace "Lotes anteriores"

### Requirement: Los datos de los lotes se validan en la frontera y cargan con estados visibles
Al leer lotes del almacén, el sistema SHALL validar cada documento antes de usarlo; un documento malformado SHALL registrarse como error y tratarse como si la carga del bloque hubiera fallado. Mientras carga, el bloque SHALL mostrar un esqueleto; si la carga falla, SHALL mostrar el estado de error "No se pudo cargar tu práctica con IA." con "Reintentar"; sin conexión, SHALL mostrar lo último conocido si existe.

#### Scenario: Carga fallida
- **WHEN** la lectura de los lotes falla al abrir Hoy
- **THEN** el bloque muestra el estado de error con "Reintentar" y el resto de Hoy sigue funcionando

#### Scenario: Documento malformado
- **WHEN** un lote guardado no cumple la forma esperada
- **THEN** se registra el error y el bloque muestra el estado de error, sin romper la pantalla
