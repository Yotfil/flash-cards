# Design

## Context

Ver `proposal.md` (Why). Estado esperado de `dev` cuando este change se ejecute (tras `plataforma-datos-y-offline` y `navegacion-y-shell`):

- `provideFirebase()` entrega `FIRESTORE` y `FIREBASE_AUTH`, conectados a los emuladores en desarrollo (`demo-cadence`). `parseDocument` e `InvalidDocumentError` en `infrastructure/firestore/document-boundary.ts`. `BatchWriter` no se usa aquí.
- `app.routes.ts` con el mapa completo y `PendingPageComponent` en `/login` y `/sin-acceso`; sin guards. `ThemeService`, `DialogService`, `EmptyState`, `ErrorState`, `Skeleton`, `IconComponent`, `shell.copy.ts` como patrón.
- `firestore.rules`: `/allowlist/{email}` solo legible por el propio correo autenticado; `isAllowlisted()` exige la entrada para todo dato privado. `tests/rules/users.rules.spec.ts` con `tests/support/firestore-test-environment.ts`.
- `npm run emulators` arranca Firestore y Auth sin datos; la allowlist del emulador nace vacía.
- Verificado en `node_modules`: `@angular/forms/signals` exporta `form`, `Field`, `required`, `email`, `minLength`, `validateStandardSchema`, `submit`; `zod` 4 trae `z.email()`; `firebase emulators:start` admite `--import` y `--export-on-exit`.
- Código viejo de referencia en `backup/old-version` (`services/auth.service.ts`, `infrastructure/auth/firebase-auth.adapter.ts`, `features/auth-page`, `features/sin-acceso`, `schemas/user.schema.ts`): se reescribe con TDD; sus hallazgos están decididos en `docs/hallazgos-codigo-actual.md`.

## Goals / Non-Goals

**Goals:**
- Una máquina de estados de sesión única, pura y probada con fakes, de la que cuelgan guards y pantallas.
- Ninguna identidad en el proveedor sin correo en la lista, por correo ni por Google.
- Que `ajustes-de-usuario` solo tenga que leer `SessionService.user()` y llamar a `signOut()` y a un método de guardado del perfil.

**Non-Goals:**
- Guardar ajustes (`updateSettings`): es de `ajustes-de-usuario`, que reutiliza `UserRepository.save` y `requireSessionUser`.
- Recuperación de contraseña, verificación de correo, enlace de proveedores.

## Decisions

### 1. Máquina de estados de sesión en `services/session/session.service.ts` (capa servicios)

```
                    identidad null
  resolviendo ------------------------> sin sesion
      |                                     ^
      | identidad                           | signOut()
      v                                     |
  consultar lista --no esta--> sin acceso (email) --signOut()--+
      |                 \__ si venia de Google: borrar identidad
      | esta
      v
  cargar o crear perfil --falla--> error de perfil --retryProfile()--> (vuelve a cargar)
      |                                   |
      | ok                                | signOut()
      v                                   v
  con sesion (user)                   sin sesion
```

- `SessionState` (modelo de dominio, unión discriminada): `{ kind: 'resolving' } | { kind: 'signedOut' } | { kind: 'active'; user: User } | { kind: 'noAccess'; email: string | null } | { kind: 'profileError'; cause: unknown }`.
- Señales expuestas: `state`, `user` (computed, `null` salvo `active`), `isActive`, `resolved` (true tras el primer callback del observador) y `whenResolved(): Promise<void>` para los guards.
- Métodos: `register(input): Promise<'registered' | 'notAllowlisted'>`, `signInWithEmail(input)`, `signInWithGoogle()`, `signOut()`, `retryProfile()`.
- Dependencias: solo puertos (`AuthPort`, `UserRepository`, `AllowlistRepository`, `Logger`) y `Clock`/`DeviceInfo`? No: la zona horaria se obtiene con `Intl.DateTimeFormat().resolvedOptions().timeZone`, que existe en Node y jsdom; no justifica un puerto.

*Por qué unión discriminada y no cuatro booleanos:* el código viejo combinaba `currentUser` (`undefined | null | User`), `accessDenied`, `accessDeniedEmail` y `sessionResolved`, y el hallazgo 1 nació de una combinación imposible de representar. Con la unión, "error de perfil" es un valor, no una ausencia.

### 2. Un solo camino de perfil con nombre pendiente (hallazgo 9)

`register()` comprueba la lista, guarda `pendingDisplayName`, llama a `authPort.registerWithEmail` y termina. El observador recibe la identidad, consulta la lista de nuevo (barato y mantiene un solo flujo), y en `ensureProfile` construye el perfil con `pendingDisplayName ?? identity.displayName ?? parteLocal ?? 'Estudiante'`, lo escribe una vez y limpia el nombre pendiente. El adaptador además fija el nombre en el proveedor (`updateProfile`) para que la identidad quede coherente, pero el perfil ya no depende de ello.

### 3. Comprobación previa de la lista y regla pública por correo exacto (hallazgo 2)

- `firestore.rules`: en `match /allowlist/{email}`: `allow get: if true; allow list: if false; allow write: if false;`. `isAllowlisted()` no cambia.
- `AllowlistRepository.isAllowed(email)` hace `getDoc` de la entrada exacta; funciona con y sin sesión. Sin red lanza y `register()` lo traduce a la categoría "sin conexión".
- *Filtración asumida (explore 2026-10-22):* cualquiera puede comprobar correos exactos; ya era posible creando una cuenta.

### 4. Google no autorizado borra la identidad

`signInWithGoogle()` marca `googleSignInInFlight = true` antes de abrir la ventana. Cuando el observador encuentra una identidad no autorizada con esa marca, llama a `authPort.deleteCurrentIdentity()` (borrado permitido porque el inicio de sesión es reciente), limpia la marca y deja `noAccess` con el correo. Sin la marca (sesión guardada cuyo correo salió de la lista) la identidad se conserva y la salida es "Cerrar sesión". Si el borrado falla, se registra y la sesión queda igualmente en `noAccess`.

### 5. Errores de acceso por categoría (hallazgo 7)

`domain/models/auth-error.ts`: `class AuthError extends Error { kind: 'invalidCredentials' | 'emailInUse' | 'offline' | 'cancelled' | 'unknown' }`. El adaptador traduce con una función pura `toAuthError(code: string, cause: unknown)` en `infrastructure/auth/auth-error.mapper.ts`: `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`, `auth/invalid-email` → `invalidCredentials`; `auth/email-already-in-use` → `emailInUse`; `auth/network-request-failed` → `offline`; `auth/popup-closed-by-user`, `auth/cancelled-popup-request` → `cancelled`; resto → `unknown`. La pantalla elige el texto por `kind` desde `auth.copy.ts`; `cancelled` no pinta nada. Los fallos de la lista sin red también salen como `offline`.

### 6. Puertos y adaptadores

- `domain/ports/auth.port.ts` (`AuthPort`): `observeAuthState(onChange)`, `registerWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOut`, `deleteCurrentIdentity`. Callback, no Observable: el dominio no depende de librerías.
- `domain/ports/user.repository.ts` (`findById`, `save`) y `domain/ports/allowlist.repository.ts` (`isAllowed`).
- `infrastructure/auth/firebase-auth.adapter.ts` sobre `firebase/auth` con `signInWithPopup` (COOP `same-origin-allow-popups` ya configurada).
- `infrastructure/firestore/schemas/user.schema.ts` con `firestoreTimestamp`, `.default(20)` y `.default(true)` en los dos ajustes añadidos después, `handle`/`photoURL` opcionales. `infrastructure/firestore/user.repository.firestore.ts` usa `parseDocument` (lanza `InvalidDocumentError` con ruta y razón) y escribe el documento completo con `setDoc`.
- `infrastructure/firestore/allowlist.repository.firestore.ts`: `getDoc(...).exists()`; sin Zod porque no lee campos.
- Fakes en `testing/`: `FakeAuthPort` (emite identidades a voluntad, registra llamadas, puede fallar con un `AuthError`), `FakeUserRepository` (mapa en memoria, puede lanzar), `FakeAllowlistRepository` (conjunto de correos).

### 7. Guards en `core/session.guards.ts`

`requireSessionGuard`: `await session.whenResolved()`; `active` → `true`; `noAccess` → `/sin-acceso`; resto → `/login`. `guestOnlyGuard` (solo `/login`): `active` → `/`; `noAccess` → `/sin-acceso`; resto → `true` (incluido `profileError`, que la pantalla de acceso muestra). `/sin-acceso` sin guard: su componente redirige de forma reactiva como dice la spec. `app.routes.ts` añade `canActivate` al caparazón, a `/repaso`, `/practicar` y `/login`.

### 8. Pantalla de acceso `features/auth/login-page` (capa UI)

- Signal Forms: `form(model, (path) => validateStandardSchema(path, authFormSchema))` con `authFormSchema` de Zod en `features/auth/auth-form.schema.ts` (`email: z.email()`, `password: z.string().min(6)`, `displayName: z.string()`); el mismo esquema vale para los dos modos porque el nombre es opcional. `submit()` marca los campos tocados y no llama al servicio si el formulario es inválido.
- Estado local: `mode` (`signIn` | `register`), `submitting`, `notice` (`{ kind: 'authError'; error: AuthError } | { kind: 'notAllowlisted' } | null`). Textos en `auth.copy.ts`. El botón principal muestra "Iniciando sesión…", "Creando cuenta…" o "Conectando…" y deshabilita los tres controles mientras `submitting`.
- Bloque de error de perfil: `@if (session.state().kind === 'profileError')` muestra "No pudimos cargar tu perfil." con "Reintentar" (`retryProfile()`) y "Cerrar sesión" (`signOut()`), encima del formulario.
- Navegación reactiva con `effect`: `active` → `/`; `noAccess` → `/sin-acceso`.
- Visual: fondo de página (ya global), un único panel `glass` centrado con `max-w-sm`, marca con icono `spark`, campos con `bg-surface` y borde `glass-border`, botón principal `bg-accent text-accent-ink press`, botón de Google secundario con borde, alertas con `role="alert"` y `text-danger`.

### 9. Pantalla "sin acceso" `features/auth/no-access-page`

Mismo panel `glass`; muestra el correo de `state.email` si existe, la explicación, la nota de volver a entrar y el botón "Cerrar sesión" ("Cerrando sesión…" mientras). `effect`: con `resolved`, `active` → `/`; `signedOut` → `/login`. En `noAccess` tras un borrado de identidad de Google, `signOut()` del proveedor es inocuo y el servicio pasa a `signedOut` igualmente.

### 10. Semilla de la lista en el emulador (desarrollo)

- `scripts/emulators.mjs`: crea `.emulator-data/` si falta y lanza `firebase emulators:start --only firestore,auth --project demo-cadence --export-on-exit .emulator-data`, añadiendo `--import .emulator-data` solo si ya existe `firebase-export-metadata.json` (el import de una carpeta vacía falla). `npm run emulators` pasa a ejecutar este script.
- `scripts/seed-allowlist.mjs <correo>`: `PATCH http://127.0.0.1:8080/v1/projects/demo-cadence/databases/(default)/documents/allowlist/<correo>` con cabecera `Authorization: Bearer owner` (el emulador salta las reglas con ese token) y cuerpo `{ fields: { addedAt: { stringValue: <ISO> } } }`. Script `npm run seed:allowlist -- correo@ejemplo.com`. Sin dependencias nuevas (usa `fetch` de Node).
- `.gitignore` añade `.emulator-data/`. README documenta el flujo y que la lista se escribe en minúsculas (hallazgo 3).

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Panel de la pantalla de acceso | `glass` + `shadow-card` | 1 (única; no hay navegación) |
| Panel de "sin acceso" | `glass` | 1 |
| Campos, alertas, botones | sólidos | 0 |

Con `prefers-reduced-transparency` el panel es sólido por los tokens. Nada de vidrio anima.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `SessionService.state`, `user`, `isActive`, `whenResolved()`, `signOut()` | `ajustes-de-usuario` (tarjeta de sesión, cerrar sesión, tema), todos los servicios que necesitan el uid |
| `requireSessionUser(user)` y `requireSessionUid(user)` en `services/session/require-session.ts` ("No hay una sesión activa.") | Todos los servicios de negocio |
| `User`, `UserSettings`, `DEFAULT_NEW_CARDS_PER_DAY`, `DEFAULT_MAX_REVIEWS_PER_DAY` en `domain/models` | `ajustes-de-usuario`, `libros`, `cola-diaria`, `importacion` |
| `UserRepository.save(user)` y `userDocumentSchema` | `ajustes-de-usuario` (guardar ajustes) |
| `requireSessionGuard`, `guestOnlyGuard` | Rutas futuras |
| `authFormSchema` como primer ejemplo de Signal Forms + `validateStandardSchema` | Los seis formularios siguientes |
| `FakeAuthPort`, `FakeUserRepository`, `FakeAllowlistRepository` | Specs de servicios y pantallas |
| `npm run emulators` persistente y `npm run seed:allowlist` | Desarrollo local de todas las capacidades |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Modo inicial; Cambiar a crear cuenta | `login-page.component.spec`: campos, botón de Google, enlace; al cambiar aparecen "Nombre" y la nota y se limpia la alerta | componente |
| Contraseña demasiado corta; Correo con formato inválido | `login-page.component.spec` con `FakeAuthPort`: campos marcados inválidos y ninguna llamada al puerto | componente |
| Correo no autorizado al registrarse | `session.service.spec`: `register` devuelve `notAllowlisted` y `FakeAuthPort.registerWithEmail` no se llama; `login-page.component.spec`: alerta con el texto exacto, sigue en `/login` | unitaria pura + componente |
| Registro con nombre; Registro sin nombre | `session.service.spec`: nombre pendiente "Ada"; vacío → `ada` (parte local) | unitaria pura |
| Credenciales correctas | `session.service.spec`: `signInWithEmail` llama al puerto; el fake emite la identidad; estado `active` con el perfil | unitaria pura |
| Google exitoso | `session.service.spec`: `signInWithGoogle` resuelve sin identidad; la identidad llega por el observador → `active` | unitaria pura |
| Google no autorizado | `session.service.spec`: marca en vuelo + correo fuera de la lista → `deleteCurrentIdentity` llamado y `noAccess` con el correo | unitaria pura |
| Ventana cerrada por el usuario | `auth-error.mapper.spec`: `auth/popup-closed-by-user` → `cancelled`; `login-page.component.spec`: sin alerta | unitaria pura + componente |
| Contraseña incorrecta; Correo ya registrado; Sin red | `auth-error.mapper.spec`: códigos → categorías; `login-page.component.spec`: cada categoría pinta su texto exacto y `FakeLogger` recibe el detalle | unitaria pura + componente |
| Doble envío | `login-page.component.spec`: dos `submit` seguidos → una llamada; botón "Iniciando sesión…" y controles deshabilitados | componente |
| Sesión activa desde el observador; Acceso denegado (navegación reactiva) | `login-page.component.spec` con `RouterTestingHarness`: emitir identidad autorizada → URL `/`; no autorizada → `/sin-acceso` | componente |
| Recarga con sesión persistida; Recarga sin sesión; Cada estado es distinguible | `session.service.spec`: `resolved` falso hasta el primer callback; `state().kind` recorre los cinco valores; `session.guards.spec` con fake de sesión: espera a `whenResolved` antes de decidir | unitaria pura |
| Ruta protegida sin sesión; Ruta protegida sin acceso; Login con sesión activa; Ruta desconocida | `session.guards.spec`: cada estado → `true` o `UrlTree` esperado; `app.routes.spec` ampliado: con fake en `signedOut`, `/biblioteca` termina en `/login`; en `active`, `/login` termina en `/hoy` | unitaria pura + componente |
| Correo autorizado; Acceso retirado a una sesión existente; Diferencia de mayúsculas | `session.service.spec`: lista con `ada@ejemplo.com` activa; identidad sin marca de Google y fuera de la lista → `noAccess` sin borrar; `FakeAllowlistRepository` compara literal | unitaria pura |
| Comprobar un correo sin sesión; Listar la colección; Auto-autorizarse; Dueño sin acceso | `tests/rules/allowlist.rules.spec.ts`: `get` sin sesión permitido (existe y no existe); `getDocs` de la colección rechazado con y sin sesión; `setDoc` rechazado; dueño fuera de la lista no lee su perfil (ya existe en `users.rules.spec`) | integración (emulador) |
| Mostrar el correo pendiente; Cerrar sesión desde sin acceso | `no-access-page.component.spec`: pinta el correo, "Cerrando sesión…", navega a `/login` | componente |
| Abrir sin-acceso sin sesión; Obtiene acceso y vuelve a entrar | `no-access-page.component.spec`: con `resolved` y `signedOut` → `/login`; `active` → `/`; en `resolving` no navega | componente |
| Primer acceso con Google; Primer acceso sin nombre; Acceso posterior; Registro con nombre ingresado | `session.service.spec`: perfil creado con los defaults exactos y `photoURL` solo si viene; `ada`; perfil existente no se reescribe (`save` no llamado); nombre pendiente gana y `save` se llama una vez | unitaria pura |
| Perfil antiguo sin los campos nuevos | `user.repository.integration.spec`: documento sembrado sin esos campos → `findById` devuelve 20 y `true` | integración (emulador) |
| Perfil malformado; Reintentar tras un fallo de lectura | `user.repository.integration.spec`: sin `displayName` → lanza `InvalidDocumentError` con la ruta; `session.service.spec`: repo que lanza → `profileError` con `FakeLogger` registrando; `retryProfile()` con repo ya sano → `active`; `login-page.component.spec`: bloque con el texto y los dos botones | integración + unitaria pura + componente |
| Cerrar sesión desde Ajustes; Cerrar sesión desde el error de perfil | `session.service.spec`: `signOut` → puerto llamado, `signedOut`, correo y error limpios; el botón de Ajustes se prueba en `ajustes-de-usuario` | unitaria pura + diferido |
| Actualizar ajustes sin sesión (error explícito) | `require-session.spec`: `requireSessionUser(null)` lanza "No hay una sesión activa."; el uso en `updateSettings` lo prueba `ajustes-de-usuario` | unitaria pura + diferido |
| Guardar y leer el perfil | `user.repository.integration.spec`: `save` + `findById` devuelve el mismo usuario con `createdAt` como `Date` | integración (emulador) |
| Semilla del emulador | Manual: `npm run emulators`, `npm run seed:allowlist -- correo`, entrar con la cuenta falsa de Google del emulador y llegar a `/hoy`; reiniciar y comprobar que la lista sigue | manual |

## Risks / Trade-offs

- [Apertura de `get` en la lista] → asumida en el explore: solo entradas exactas, sin `list`; el documento no guarda nada más que la fecha.
- [Borrar la identidad de Google exige inicio de sesión reciente] → ocurre justo tras la ventana; si falla, se registra y la sesión queda en `noAccess` igualmente.
- [Signal Forms es la apuesta nueva del stack] → acotada a este formulario; si bloquea, Reactive Forms en este componente (salida del ADR 0002) y se anota con `/opsx:update`.
- [El observador de Firebase puede disparar antes de `updateProfile`] → el perfil no depende del nombre de la identidad (decisión 2).
- [Primera apertura sin red y sin caché] → `profileError` con Reintentar; comportamiento esperado, documentado en la spec.
- [`--import` de una carpeta vacía falla] → el script envoltorio solo importa si existe el archivo de metadatos.

## Migration Plan

Tercer commit de la rama única `feature/reescritura-cadence` en la fase B. La regla nueva de la lista se despliega con `firebase deploy --only firestore:rules` al publicar (tarea del usuario en el release). Rollback: revertir el merge; la regla anterior vuelve con él.
