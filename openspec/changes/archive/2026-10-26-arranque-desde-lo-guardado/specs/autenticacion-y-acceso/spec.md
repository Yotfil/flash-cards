# Spec Delta

## ADDED Requirements

### Requirement: Con la lista y el perfil guardados en el dispositivo, la sesión arranca sin esperar al servidor
Al conocerse una identidad, el sistema SHALL leer primero lo que el dispositivo ya tiene guardado, sin red: la entrada de su correo en la lista de acceso y su perfil. Si el dispositivo guarda las dos, la sesión SHALL quedar activa al instante con ese perfil, la sesión inicial SHALL darse por resuelta y la app SHALL mostrar la ruta pedida sin esperar al servidor. Después, el sistema SHALL confirmar con el servidor como describe el requisito de la lista de acceso: si el correo ya no está en la lista, la sesión SHALL pasar a "sin acceso"; si el perfil del servidor es distinto del guardado, la sesión SHALL tomar el del servidor, salvo que la sesión ya haya cambiado en este dispositivo mientras tanto (por ejemplo, un ajuste guardado), en cuyo caso se conserva el cambio. Si el servidor no responde o falla, la sesión SHALL seguir activa con lo guardado y el fallo SHALL registrarse como aviso, sin pasar a "error de perfil". Si el dispositivo no guarda la entrada de la lista o el perfil (primer acceso en ese dispositivo), o lo guardado no se puede leer o no es válido, la sesión SHALL esperar al servidor como hasta ahora.

#### Scenario: Arrancar con señal mala
- **WHEN** Ada abre la app con su sesión guardada, el dispositivo ya leyó antes su entrada de la lista y su perfil, y el servidor tarda
- **THEN** la sesión queda activa con el perfil guardado y la app muestra Hoy sin esperar la respuesta del servidor

#### Scenario: El perfil cambió en otro dispositivo
- **WHEN** la sesión arrancó con lo guardado y el servidor devuelve un perfil con otro número de nuevas por día
- **THEN** la sesión toma el perfil del servidor

#### Scenario: Un ajuste cambiado mientras se confirma no se pisa
- **WHEN** la sesión arrancó con lo guardado, el usuario cambia un ajuste y después llega el perfil del servidor leído antes del cambio
- **THEN** la sesión conserva el ajuste nuevo

#### Scenario: El correo salió de la lista
- **WHEN** la sesión arrancó con lo guardado y el servidor dice que el correo ya no está en la lista
- **THEN** la sesión pasa a "sin acceso" con ese correo

#### Scenario: El servidor no responde
- **WHEN** la sesión arrancó con lo guardado y la confirmación con el servidor falla
- **THEN** la sesión sigue activa con lo guardado y el fallo queda registrado como aviso

#### Scenario: Primer acceso en un dispositivo
- **WHEN** el dispositivo no guarda la entrada de la lista ni el perfil
- **THEN** la sesión sigue "resolviendo" hasta que responde el servidor, como hasta ahora

### Requirement: Quedar sin acceso con la app abierta lleva a la pantalla de sin acceso
Si la sesión pasa a "sin acceso" mientras la app muestra cualquier otra pantalla (por ejemplo, porque la confirmación del servidor llega con la app ya abierta), el sistema SHALL llevar al usuario a `/sin-acceso`, reemplazando la entrada actual del historial.

#### Scenario: Confirmación tardía en Hoy
- **WHEN** Ada está en Hoy y la confirmación del servidor dice que su correo ya no está en la lista
- **THEN** la app muestra `/sin-acceso` con su correo
