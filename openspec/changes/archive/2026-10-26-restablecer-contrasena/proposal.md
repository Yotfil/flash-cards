# Proposal

## Why

Quien entra con correo y contraseña y la olvida no tiene salida: la pantalla de acceso no ofrece recuperarla, y crear otra cuenta con el mismo correo dice "Ese correo ya tiene una cuenta". La revisión lo anotó en A-04 (junto al correo sin verificar). El usuario decidió el 2026-10-26 (decisión 25) añadir solo "Olvidé mi contraseña" con el correo que envía Firebase; verificar el correo queda para cuando la lista se abra más allá de conocidos.

## What Changes

- En "Iniciar sesión", bajo la contraseña, el enlace "Olvidé mi contraseña" pasa a un tercer modo de la pantalla: "Restablecer contraseña", con el correo ya escrito, sin contraseña ni Google.
- "Enviar enlace" pide al proveedor el correo de restablecimiento y responde siempre lo mismo: "Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva." (no revela qué correos tienen cuenta).
- Correo inválido: se marca el campo y no se envía nada. Sin red: el aviso de siempre. Mientras envía: "Enviando…" y todo bloqueado.
- "Volver a iniciar sesión" regresa al modo inicial con el correo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `autenticacion-y-acceso`: tercer modo de la pantalla de acceso y el requisito de restablecer la contraseña.

## Impact

- Dominio: `AuthPort.sendPasswordReset`. Infraestructura: `FirebaseAuthAdapter` con `sendPasswordResetEmail`. Fake: `FakeAuthPort` lo registra.
- Servicio: `SessionService.sendPasswordReset` (correo recortado y en minúsculas, como el registro; "datos incorrectos" se calla).
- UI: `login-page` (modo `reset`), `auth.copy`.
- Sin cambios de datos, reglas ni lecturas. La plantilla del correo es la de Firebase (se edita en la consola).

## Fuera de alcance

- Verificar el correo al registrarse y exigirlo en las reglas (decisión 25: más adelante).
- Una pantalla propia para crear la contraseña nueva: el enlace abre la página de Firebase.
- Cambiar la contraseña desde Ajustes.
