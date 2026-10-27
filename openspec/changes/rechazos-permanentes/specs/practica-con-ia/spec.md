# Spec Delta

## MODIFIED Requirements

### Requirement: La práctica usa la pantalla de repaso con los cuatro cerebros, sin programación
"Practicar hoy" SHALL abrir la pantalla de repaso a pantalla completa (anverso, revelar, cuatro cerebros con los textos "Otra vez", "Difícil", "Bien", "Fácil") con los ítems del conjunto del día en orden barajado. NO SHALL mostrarse intervalos de retorno bajo los cerebros ni sugerencia por tiempo. Cada calificación SHALL guardarse de inmediato sin esperar al servidor, como en el repaso; si el servidor la rechaza por un fallo pasajero, el ítem vuelve al final con el aviso del repaso. Si el servidor la rechaza porque el paquete ya no existe (se borró en otro dispositivo), el ítem NO SHALL volver: la práctica SHALL cerrarse con "Este paquete ya no existe" y un enlace a la Biblioteca, sin cierre ni prompt. Si la rechaza porque el usuario ya no tiene permiso (le retiraron el acceso), la práctica SHALL cerrarse en ese momento, también con el cierre ya visible, con el mismo aviso del repaso ("Ya no tienes acceso", "Lo que calificaste antes quedó guardado." y "Continuar", que deja la sesión de la app en "sin acceso" y lleva a `/sin-acceso`). "Salir" SHALL volver al detalle del paquete sin cerrar nada. Entrar a la pantalla sin una práctica preparada SHALL redirigir a la Biblioteca. La práctica es efímera: nunca se retoma una anterior.

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

#### Scenario: Acceso retirado a mitad de la práctica
- **WHEN** al usuario le retiran el acceso y el servidor rechaza la siguiente calificación por permisos
- **THEN** la práctica se cierra con "Ya no tienes acceso", "Lo que calificaste antes quedó guardado." y "Continuar", que lleva a `/sin-acceso`

### Requirement: Los paquetes viven en la Biblioteca y el detalle muestra lo de hoy
La Biblioteca SHALL mostrar, debajo de los libros, la sección "Práctica con IA" con los paquetes abiertos como filas (nombre, "ítems / capacidad", "N para hoy" o "Ya practicaste hoy" o "Nada para hoy"), el botón "Nuevo paquete" y el enlace "Paquetes completados" al historial. Sin paquetes, la sección SHALL mostrar "Guarda aquí las palabras y frases que te cruces en el día y practícalas con tu IA." y "Nuevo paquete". El detalle de un paquete SHALL mostrar su nombre, "ítems / capacidad", la lista de ítems y, en cada uno: si es del conjunto de hoy y ya se calificó hoy, su nota de hoy ("Otra vez · hoy"); si es del conjunto de hoy y falta calificarlo, "Para hoy"; si no, su última calificación ("Bien · ayer"). Y las acciones "Practicar hoy", "Agregar", "Importar", "Copiar prompt de hoy" y "Marcar como completado". El paquete SHALL poder renombrarse y borrarse (confirmación "¿Borrar este paquete? Se pierden sus N ítems. No se puede deshacer.").

#### Scenario: Sección con paquetes
- **WHEN** el usuario tiene el paquete A (14 / 20, 8 para hoy) y el B (3 / 20, ya practicado hoy)
- **THEN** la Biblioteca muestra la sección con las dos filas y sus textos, "Nuevo paquete" y "Paquetes completados"

#### Scenario: Sin paquetes
- **WHEN** el usuario no tiene paquetes
- **THEN** la sección muestra el texto de invitación y "Nuevo paquete"

#### Scenario: Historial
- **WHEN** el usuario tiene dos paquetes completados, uno del 2026-10-10 y otro del 2026-10-15
- **THEN** "Paquetes completados" lista primero el del 2026-10-15, cada uno con nombre, fecha y "ítems", y sin historial muestra "Aún no has completado ningún paquete."

#### Scenario: Detalle tras practicar
- **WHEN** el conjunto de hoy tiene 8 ítems, el usuario calificó «to give up» "Otra vez" y «to look up» "Bien" y salió sin calificar los demás
- **THEN** el detalle muestra "Otra vez · hoy" en «to give up», "Bien · hoy" en «to look up» y "Para hoy" en los otros 6
