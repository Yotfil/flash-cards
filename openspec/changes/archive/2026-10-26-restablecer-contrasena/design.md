# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado en la rama única (`549c01c`), verificado el 2026-10-26: `AuthPort` no tiene restablecimiento; `login-page` tiene dos modos (`signIn`, `register`) y ninguna salida para quien olvidó la contraseña; `auth-error.mapper.ts` traduce `auth/user-not-found` e `auth/invalid-email` a `invalidCredentials`. A-04 sigue abierto.

## Goals / Non-Goals

**Goals:** una salida para la contraseña olvidada con el correo de Firebase, sin revelar qué correos tienen cuenta, con el mismo patrón de la pantalla de acceso (modos, envío bloqueado, errores humanos).

**Non-Goals:** verificación del correo; pantalla propia para la contraseña nueva; cambiarla desde Ajustes.

## Decisions

### D1. Puerto y adaptador
`AuthPort.sendPasswordReset(email): Promise<void>`. `FirebaseAuthAdapter` llama a `sendPasswordResetEmail(auth, email)` dentro de `translateErrors` (los códigos ya se clasifican). `FakeAuthPort` guarda los correos en `passwordResets` y admite `failWith.sendPasswordReset`.

### D2. El servicio no delata (servicio, `SessionService.sendPasswordReset`)
Recorta y baja a minúsculas el correo (como el registro, A-02) y pide el envío. Si el proveedor responde "datos incorrectos" (`invalidCredentials`: cuenta inexistente en proyectos sin protección contra enumeración, o correo mal formado), lo calla y resuelve igual; el resto (`offline`, `unknown`) sube a la pantalla. Así el mensaje neutro es verdad en todos los casos. Alternativa descartada: decidirlo en el adaptador (la regla de producto "no delatar" es del servicio; el adaptador solo traduce).

### D3. Tercer modo de la pantalla (UI, `login-page`)
`LoginMode` gana `'reset'`, con su copy de la misma forma que los otros (título, explicación, enviar, enviando, pregunta y acción de cambio). En `reset` la plantilla oculta contraseña, nombre, Google y el separador. "Olvidé mi contraseña" (botón con aspecto de enlace, bajo la pista de la contraseña, solo en `signIn`) pasa a `reset`; la acción de cambio en `reset` vuelve a `signIn`. El correo vive en el modelo del formulario, así que se conserva. El envío en `reset` no usa `submit()` del formulario completo (exigiría la contraseña): marca el correo como tocado y, si vale, llama al servicio con el mismo `attempt('email', …)` que bloquea los controles. Tras el envío, una señal `resetSent` muestra el mensaje neutro con `role="status"`; cambiar de modo o volver a enviar la limpia. **Decidido por Claude:** el texto del enlace es el de la decisión ("Olvidé mi contraseña"); el modo oculta Google (restablecer no tiene que ver con Google).

### Superficies (ADR 0003)
Sin superficies nuevas: el mismo panel de acceso.

## Risks / Trade-offs

- [El correo de Firebase sale en el idioma y la plantilla del proyecto] → Se edita en la consola (Autenticación → Plantillas); anotado para el usuario.
- [Un correo mal escrito pero con formato válido no recibe nada] → El mensaje dice "si hay una cuenta con ese correo": invita a revisarlo.

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| Modo inicial (con el enlace nuevo) | `login-page.component.spec`: en "Iniciar sesión" está "Olvidé mi contraseña"; en "Crear cuenta", no | componente |
| Cambiar a crear cuenta (ya cubierto) | sigue en verde | componente |
| Pedir el enlace | `login-page.component.spec`: escribir el correo, "Olvidé mi contraseña" → título "Restablecer contraseña", correo conservado, sin contraseña ni Google; "Enviar enlace" → `FakeAuthPort.passwordResets` con el correo y el mensaje neutro con `role="status"`; `session.service.spec`: recorta y baja a minúsculas | componente + unitaria |
| Un correo sin cuenta no se delata | `session.service.spec`: el puerto falla con `invalidCredentials` → resuelve sin error | unitaria |
| Correo con formato inválido | `login-page.component.spec`: `correo-sin-arroba` → campo marcado y ningún envío | componente |
| Sin red | `session.service.spec`: `offline` sube; `login-page.component.spec`: "Sin conexión. Inténtalo cuando vuelva la red." | unitaria + componente |
| Mientras envía | `login-page.component.spec`: con el proveedor retenido, "Enviando…" deshabilitado | componente |
| Volver a iniciar sesión | `login-page.component.spec`: vuelve a "Iniciar sesión" con el correo y sin mensaje | componente |

El adaptador (una llamada al SDK) se comprueba a mano contra el emulador de Auth del 9095: el enlace aparece en su registro.

## Migration Plan

Sin migración. Rollback: revertir el PR.

## Contratos que deja listos

- `AuthPort.sendPasswordReset` y el modo `reset`: el sitio para la verificación del correo cuando llegue (otro envío del proveedor, el mismo patrón neutro).
