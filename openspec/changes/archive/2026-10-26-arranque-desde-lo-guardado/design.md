# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado en `dev` (`75d3c93`), verificado el 2026-10-26:

- `SessionService.handleIdentity` (`services/session/session.service.ts`): `allowlist.isAllowed(email)` y después `users.findById(uid)` (o `createProfile`), los dos con `getDoc` (servidor primero; sin red, la caché). Hasta entonces el estado es `resolving` y los guards esperan `whenResolved()`: la raíz solo tiene `<router-outlet>`, así que la pantalla queda vacía.
- Firestore usa `persistentLocalCache`: la entrada de la lista y el perfil leídos en un arranque anterior quedan guardados en el dispositivo.
- #51 dejó `ReadSource` (`'device' | 'server'`) en los puertos de listas y `readFrom` (con `getDocsFromCache`) en los adaptadores. Los documentos sueltos (lista, perfil) no lo tienen.
- Nada lleva a `/sin-acceso` si la sesión cambia a "sin acceso" con la app abierta; solo los guards (en la siguiente navegación) y el aviso del repaso y la práctica (punto 8).

## Goals / Non-Goals

**Goals:** pintar al instante con lo guardado cuando hay qué pintar; que la confirmación del servidor siga mandando (acceso y perfil); el mismo patrón de #51.

**Non-Goals:** esqueleto en el primer acceso; tocar la frescura de otras lecturas.

## Decisions

### D1. Lectura del dispositivo en los dos puertos (dominio + infraestructura)
`AllowlistRepository.isAllowed(email, source: ReadSource = 'server')` y `UserRepository.findById(uid, source: ReadSource = 'server')`. Con `'device'`, el adaptador usa `getDocFromCache`: la lista da `true` solo si el dispositivo guarda la entrada; el perfil da el perfil validado o `null` si el dispositivo no lo guarda. "No está en la caché" (`unavailable`) se traduce a `false`/`null`; cualquier otro fallo (un perfil guardado inválido) se lanza. El comentario de `ReadSource` pasa a decir "una lista o un documento".

### D2. La sesión en dos fases (servicio, `SessionService.handleIdentity`)
1. `savedProfile(identity)`: lista y perfil del dispositivo; devuelve el perfil solo si la lista guarda el correo y hay perfil. Si leer lo guardado falla, registra un aviso y devuelve `null` (lo guardado es un atajo; manda el servidor).
2. Con perfil guardado (y la misma generación), `setState({ kind: 'active', user })` en el acto: resuelve la sesión inicial.
3. La fase del servidor no cambia (lista, perfil o creación, "sin acceso", borrado de una identidad nueva de Google). Al final, `confirmProfile(savedState, profile)`: sin estado guardado, `active` con el perfil (como hoy); con estado guardado, solo si la sesión sigue siendo exactamente ese estado (`stateSignal() === savedState`) y el perfil es distinto (comparación por valor), lo sustituye. Así un ajuste guardado mientras tanto no se pisa y un perfil igual no dispara recálculos.
4. Si la fase del servidor falla con estado guardado: `logger.warn` y se sigue activo; sin estado guardado: `profileError` como hoy.

Alternativa descartada: reutilizar `readDeviceThenServer` (es para el cargador en flujo de un `resource`; la sesión es una máquina de estados con su generación).

### D3. La raíz lleva a "sin acceso" (UI, `App`)
Un `effect` en `App`: con la sesión resuelta en `noAccess` y la URL fuera de `/sin-acceso`, `router.navigateByUrl('/sin-acceso', { replaceUrl: true })`. Reemplaza para no dejar detrás una pantalla que ya no se puede usar, y no choca con el "Continuar" del repaso (que ya navega con `replaceUrl`). La pantalla de sin acceso sigue llevando a `/` o a `/login` según la sesión.

### D4. Fakes
`FakeAllowlistRepository` y `FakeUserRepository` ganan `seedOnDevice`, `deviceCalls` y, la lista, `holdServer()` (retiene las lecturas del servidor para probar "sin esperar"); `failOnFindOnDevice` para un guardado ilegible. Como en #51, lo del dispositivo va aparte de lo del servidor.

### Superficies (ADR 0003)
Sin superficies nuevas.

## Risks / Trade-offs

- [Un correo recién sacado de la lista ve sus datos unos segundos al abrir] → Son sus propios datos; las reglas impiden escribir; la confirmación lo lleva a "sin acceso" en cuanto responde el servidor.
- [Con señal mala, la confirmación tarda y un ajuste cambiado en otro dispositivo llega tarde] → Igual que las listas desde #51.
- [Dos navegaciones a `/sin-acceso` a la vez (aviso del repaso + raíz)] → Las dos reemplazan: el historial queda igual gane la que gane.

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| Arrancar con señal mala | `session.service.spec`: lista y perfil en el dispositivo, servidor retenido → `active` con el guardado y `resolved()` antes de soltar el servidor | unitaria |
| El perfil cambió en otro dispositivo | `session.service.spec`: guardado con 20 nuevas, servidor con 7 → tras soltar, la sesión tiene 7 | unitaria |
| Un ajuste cambiado mientras se confirma no se pisa | `session.service.spec`: arranque con lo guardado, `updateSettings` con el servidor retenido, soltar → conserva el ajuste nuevo | unitaria |
| El correo salió de la lista | `session.service.spec`: guardado autorizado, servidor no → `noAccess` con el correo | unitaria |
| El servidor no responde | `session.service.spec`: la lista del servidor falla → sigue `active`, un `warn` en el registro, sin `profileError` | unitaria |
| Primer acceso en un dispositivo | `session.service.spec`: nada guardado y servidor retenido → `resolving`; al soltar, `active` (las pruebas existentes siguen en verde) | unitaria |
| (lo guardado no se puede leer) | `session.service.spec`: el perfil del dispositivo lanza → aviso y se espera al servidor | unitaria |
| (adaptadores) | `allowlist.repository.integration.spec`: con `'device'`, `false` antes de leer y `true` después de una lectura del servidor; `user.repository.integration.spec`: con `'device'`, `null` antes y el perfil después | integración (8085) |
| Confirmación tardía en Hoy | `app.spec`: con la app en `/hoy`, la sesión pasa a `noAccess` → la URL es `/sin-acceso` | componente |
| (sin acceso al arrancar, ya cubierto) | `session.guards.spec`, `no-access-page.component.spec` siguen en verde | unitaria + componente |
| (repaso, "Continuar", ya cubierto) | `repaso-page.component.spec`: "atrás" sigue sin volver al repaso | componente |

## Migration Plan

Sin migración. Rollback: revertir el PR.

## Contratos que deja listos

- `ReadSource` en lecturas de un documento: el patrón para cualquier otro documento suelto que deba pintarse sin red.
- La redirección de la raíz a `/sin-acceso`: cualquier camino futuro que deje la sesión sin acceso con la app abierta queda cubierto.
