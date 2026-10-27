# Spec Delta

## MODIFIED Requirements

### Requirement: Las acciones en vuelo bloquean los diálogos y los errores se muestran sin perder el trabajo
Mientras una creación, edición o ajuste se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el botón principal, ignorar envíos repetidos y bloquear el cierre con Escape. Si la escritura no confirma en unos 6 segundos, el diálogo SHALL mostrar "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y dejarse cerrar, como describe la spec de navegación. Si la acción falla, el diálogo SHALL permanecer abierto con lo escrito y mostrar dentro, con rol de alerta, "No se pudo guardar el libro. Inténtalo de nuevo." o "No se pudieron guardar los ajustes. Inténtalo de nuevo."; el diálogo solo se cierra cuando la acción termina con éxito, el usuario cancela o, tras el aviso, el usuario lo cierra.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear libro" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Guardado que no confirma
- **WHEN** el usuario pulsa "Guardar" en los ajustes de un libro con un wifi sin internet y pasan 6 segundos
- **THEN** el diálogo muestra "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y "Cerrar" lo cierra

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces seguidas antes de que termine la primera escritura
- **THEN** solo se crea un libro

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o edición
- **THEN** el diálogo sigue abierto con los valores escritos y muestra dentro el mensaje de error con rol de alerta

#### Scenario: Éxito limpia el error anterior
- **WHEN** una acción falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra
