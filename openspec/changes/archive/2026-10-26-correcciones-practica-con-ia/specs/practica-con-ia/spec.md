# Spec Delta

## MODIFIED Requirements

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
