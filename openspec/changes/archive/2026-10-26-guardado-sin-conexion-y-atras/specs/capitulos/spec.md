# Spec Delta

## MODIFIED Requirements

### Requirement: Las acciones de capítulo en vuelo bloquean el diálogo y los errores se muestran sin perder el trabajo
Mientras una creación o un renombrado se está guardando, el sistema SHALL deshabilitar los botones del diálogo, mostrar "Guardando…" en el principal, ignorar envíos repetidos y bloquear el cierre con Escape. Si la escritura no confirma en unos 6 segundos, el diálogo SHALL mostrar "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y dejarse cerrar, como describe la spec de navegación. Si crear o renombrar falla, el diálogo SHALL permanecer abierto con lo escrito y mostrar dentro, con rol de alerta, "No se pudo guardar el capítulo. Inténtalo de nuevo."; el diálogo solo se cierra cuando la acción termina con éxito, el usuario cancela o, tras el aviso, el usuario lo cierra.

#### Scenario: Guardado en curso
- **WHEN** el usuario pulsa "Crear capítulo" y la escritura aún no termina
- **THEN** los botones del diálogo quedan deshabilitados, el principal dice "Guardando…" y Escape no cierra el diálogo

#### Scenario: Guardado que no confirma
- **WHEN** el usuario crea un capítulo con un wifi sin internet y pasan 6 segundos
- **THEN** el diálogo muestra "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y "Cerrar" lo cierra

#### Scenario: Envío duplicado
- **WHEN** el usuario envía el formulario dos veces antes de que termine la primera escritura
- **THEN** solo se crea un capítulo

#### Scenario: Falla el guardado
- **WHEN** el almacén rechaza la creación o el renombrado
- **THEN** el diálogo sigue abierto con el nombre escrito y muestra dentro "No se pudo guardar el capítulo. Inténtalo de nuevo." con rol de alerta

#### Scenario: Éxito limpia el error anterior
- **WHEN** un guardado falló y el usuario reintenta con éxito
- **THEN** el mensaje de error desaparece y el diálogo se cierra
