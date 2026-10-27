# Proposal

## Why

Al abrir la app con una sesión guardada, la sesión pregunta al servidor si el correo sigue en la lista de acceso y después lee el perfil, una lectura tras otra y servidor primero. Mientras tanto la pantalla queda vacía (solo el fondo). Con buena red no se nota; con señal mala (el metro), dura hasta que Firestore da la red por perdida, unos 10 segundos, aunque el dispositivo ya tiene guardados la lista y el perfil. Se detectó al medir #51 y el usuario aprobó el 2026-10-26 la recomendación: arrancar con lo guardado y confirmar detrás, como ya hacen las listas desde #51.

## What Changes

- Con una identidad conocida, la sesión lee primero lo que el dispositivo ya tiene: si guarda la entrada de la lista y el perfil, la sesión queda activa al instante con ese perfil y la app pinta la ruta pedida.
- Detrás, la sesión confirma con el servidor, como hasta ahora: si el correo ya no está en la lista, pasa a "sin acceso"; si el perfil cambió (un ajuste tocado en otro dispositivo), toma el del servidor, salvo que el usuario ya haya cambiado algo en este mientras tanto; si el servidor no responde, sigue con lo guardado y lo registra como aviso, sin "error de perfil".
- Sin nada guardado (primer acceso en ese dispositivo, o lo guardado no sirve), todo sigue como hoy: se espera al servidor.
- Quedar "sin acceso" con la app abierta, desde cualquier pantalla, lleva a `/sin-acceso` (hoy solo lo hacía el aviso del repaso y la práctica).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `autenticacion-y-acceso`: arrancar con lo guardado y confirmar detrás; quedar sin acceso con la app abierta lleva a `/sin-acceso`.

## Impact

- Puertos: `AllowlistRepository.isAllowed` y `UserRepository.findById` aceptan `ReadSource` (`'device'`: solo la caché, sin red). Adaptadores con `getDocFromCache`.
- Servicio: `SessionService` (resolución de la identidad en dos fases). Fakes de lista y perfil con lo guardado en el dispositivo.
- Raíz: `App` lleva a `/sin-acceso` cuando la sesión queda sin acceso.
- Sin cambios de datos, reglas ni de las lecturas del servidor: se añaden dos lecturas de la caché (sin costo).

## Fuera de alcance

- Un esqueleto o marca mientras se espera al servidor en el primer acceso.
- Cambiar la frescura de las demás lecturas (el explore B y D del punto 9).
- Las lecturas rechazadas fuera de una sesión.
