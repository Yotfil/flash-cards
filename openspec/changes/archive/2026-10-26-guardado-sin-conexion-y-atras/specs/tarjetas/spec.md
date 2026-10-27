# Spec Delta

## MODIFIED Requirements

### Requirement: Toda acción en vuelo bloquea reenvíos y comunica su progreso
Mientras se guarda o borra, el sistema SHALL deshabilitar los botones del diálogo, cambiar la etiqueta del botón principal ("Guardando…", "Borrando…"), ignorar nuevos envíos y bloquear el cierre con Escape. Si guardar una tarjeta de un capítulo no confirma en unos 6 segundos, el diálogo SHALL mostrar "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y dejarse cerrar, como describe la spec de navegación; borrar no muestra ese aviso. Si la acción falla, el diálogo SHALL permanecer abierto con lo escrito o lo seleccionado y mostrar dentro, con rol de alerta, el mensaje correspondiente ("No se pudo guardar la tarjeta. Inténtalo de nuevo.", "No se pudo borrar la tarjeta. Inténtalo de nuevo.", "No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo."); el diálogo solo se cierra cuando la acción termina con éxito, el usuario cancela o, tras el aviso, el usuario lo cierra.

#### Scenario: Doble clic al guardar
- **WHEN** el usuario pulsa "Crear tarjeta" dos veces seguidas
- **THEN** se crea una sola tarjeta

#### Scenario: Guardado que no confirma
- **WHEN** el usuario crea una tarjeta con un wifi sin internet y pasan 6 segundos
- **THEN** el diálogo muestra "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y "Cerrar" lo cierra

#### Scenario: Borrado que no confirma
- **WHEN** el usuario borra una tarjeta con un wifi sin internet y pasan 6 segundos
- **THEN** la confirmación sigue diciendo "Borrando…", sin aviso y sin dejarse cerrar

#### Scenario: Falla el guardado
- **WHEN** la escritura de la tarjeta falla
- **THEN** el diálogo sigue abierto con el texto del usuario y muestra dentro "No se pudo guardar la tarjeta. Inténtalo de nuevo." con rol de alerta

#### Scenario: Falla el borrado masivo
- **WHEN** el borrado de las seleccionadas falla
- **THEN** la confirmación sigue abierta con el mensaje de error, la selección sigue activa y el usuario puede reintentar o cancelar

#### Scenario: Éxito limpia el error anterior
- **WHEN** un guardado falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra
