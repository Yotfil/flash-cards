# Spec Delta

## ADDED Requirements

### Requirement: Un guardado que no confirma deja de bloquear el diálogo
Cuando el contenido de un diálogo lleva unos 6 segundos ocupado guardando sin que el almacén confirme (por ejemplo, con un wifi conectado pero sin internet), el sistema SHALL dejar de anunciar el diálogo como ocupado y SHALL permitir cerrarlo con Escape, con "atrás" y con el botón secundario, que pasa a decir "Cerrar". El contenido SHALL mostrar entonces su aviso, con rol de estado: en los diálogos cuya escritura queda guardada en el dispositivo (crear o editar un libro, sus ajustes, crear o renombrar un capítulo, crear o editar una tarjeta de un capítulo, crear o renombrar un paquete), "Quedó guardado en este dispositivo; se enviará cuando vuelva la red."; en los de importar, "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app.". El botón principal SHALL seguir diciendo "Guardando…" (o "Importando…", "Reemplazando…") y deshabilitado mientras la escritura no confirme. Si la escritura confirma con el diálogo aún abierto, SHALL cerrarse como siempre; si ya se cerró, el resultado se aplica sin mostrar nada. Los diálogos de borrar y los de ítems de un paquete NO muestran este aviso: siguen ocupados hasta que el almacén responde.

#### Scenario: Wifi sin internet al crear un libro
- **WHEN** el usuario crea "Química" con un wifi sin internet y pasan 6 segundos sin confirmación
- **THEN** el diálogo muestra "Quedó guardado en este dispositivo; se enviará cuando vuelva la red.", el botón secundario dice "Cerrar" y Escape lo cierra

#### Scenario: Confirma antes de los 6 segundos
- **WHEN** el almacén confirma la escritura a los 2 segundos
- **THEN** el diálogo se cierra con su resultado y nunca muestra el aviso

#### Scenario: Importar sin internet
- **WHEN** una importación en un capítulo lleva 6 segundos sin confirmar
- **THEN** el diálogo muestra "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app." y se puede cerrar

#### Scenario: Borrar sin internet
- **WHEN** el usuario confirma un borrado con un wifi sin internet y pasan 6 segundos
- **THEN** la confirmación sigue ocupada, sin aviso, hasta que el almacén responde

### Requirement: "Atrás" con un diálogo abierto solo cierra el diálogo
Con un diálogo abierto, el gesto o botón "atrás" del sistema o del navegador SHALL cerrar el diálogo de arriba sin resultado, igual que Escape, y SHALL NOT cambiar de pantalla ni perder la entrada actual del historial. Si el diálogo está ocupado (antes del aviso de un guardado que no confirma), "atrás" SHALL NOT hacer nada. Sin diálogos abiertos, "atrás" navega como siempre.

#### Scenario: Atrás en un formulario
- **WHEN** el usuario abre "Nuevo libro" en la Biblioteca, escribe el nombre y pulsa "atrás" en Android
- **THEN** el formulario se cierra sin crear nada y la app sigue en la Biblioteca; un segundo "atrás" lleva a la pantalla anterior

#### Scenario: Atrás mientras guarda
- **WHEN** el diálogo está guardando y aún no pasaron 6 segundos
- **THEN** "atrás" no cierra el diálogo ni cambia de pantalla

#### Scenario: Atrás tras el aviso
- **WHEN** el diálogo ya muestra "Quedó guardado en este dispositivo; se enviará cuando vuelva la red."
- **THEN** "atrás" cierra el diálogo y la app sigue en la misma pantalla

#### Scenario: Dos diálogos apilados
- **WHEN** la confirmación de reemplazo está abierta sobre el diálogo "Importar tarjetas" y el usuario pulsa "atrás"
- **THEN** se cierra solo la confirmación y "Importar tarjetas" sigue abierto
