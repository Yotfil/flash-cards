# Tasks

> Fase B (ejecución, Claude Opus 5.5). Rama `feature/plataforma-datos-y-offline` desde `dev`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` (exige Java 21 en el PATH) y `npm run build` en verde. Un commit por tarea o por pareja rojo-verde. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Runner de pruebas estáticas y de integración

- [ ] 1.1 Ampliar `vitest.integration.config.ts` para incluir `tests/**/*.spec.ts` (además de `src/**/*.integration.spec.ts`) y verificar que `npm run test:integration` sigue corriendo los 5 casos de reglas existentes.
- [ ] 1.2 Crear `tests/support/firestore-test-environment.ts` (`createRulesTestEnvironment()` con `projectId: 'demo-cadence'` y las reglas de `firestore.rules`, `seedAllowlist(environment, emails)`, `ownerContext(environment, uid, email)`), migrar `tests/rules/users.rules.spec.ts` a usarlo y verificar que los 5 casos siguen en verde sin cambiar sus afirmaciones.

## 2. Frontera de lectura (cerebro, unitaria pura)

- [ ] 2.1 Escribir en rojo `src/app/infrastructure/firestore/document-boundary.spec.ts`: (a) un esquema con `firestoreTimestamp` devuelve `Date`; (b) `parseDocument` con un campo de tipo incorrecto lanza `InvalidDocumentError` cuya `path` es la ruta del documento y cuyo mensaje nombra el campo; (c) `parseDocuments` con tres documentos y uno inválido lanza sin devolver los válidos; (d) un esquema con `.default(0)` completa el campo ausente. Verificar que `npm test` falla por módulo inexistente.
- [ ] 2.2 Implementar `document-boundary.ts` (`firestoreTimestamp`, `parseDocument`, `parseDocuments` sobre la lista estructural `{ id, path, data() }`, `InvalidDocumentError` con `path` e `issues`) y verificar que 2.1 pasa y que `npm run lint` no acusa cruces de capas.

## 3. Escritor por lotes (integración con emulador)

- [ ] 3.1 Escribir en rojo `tests/firestore/batch-writer.integration.spec.ts` usando el soporte de 1.2 y el contexto del dueño: (a) 306 `set` en `users/u1/cards` → `batches = 1` y 306 documentos; (b) 1 000 `set` → `batches = 3` y el último documento escrito es el último añadido; (c) 600 operaciones donde las últimas 150 van a `users/u2/cards` → lanza `BatchCommitError` con `committed.length = 450` y `cause` definido, y las 450 primeras existen en el emulador; (d) 900 `delete` sobre documentos sembrados → `batches = 2` y colección vacía. Verificar que `npm run test:integration` falla por módulo inexistente.
- [ ] 3.2 Implementar `src/app/infrastructure/firestore/batch-writer.ts` (`MAX_BATCH_SIZE = 450`, `BatchWriter` con `set`/`update`/`delete`/`commit`, `BatchCommitError` con `committed` y `cause`) y verificar que 3.1 pasa.

## 4. Reglas de seguridad: cobertura completa

- [ ] 4.1 Añadir a `tests/rules/users.rules.spec.ts` los escenarios: escritura sin sesión denegada; el dueño escribe en `books`, `chapters`, `cards`, `dailyStats/2026-06-15` y crea en `reviewLogs`; el dueño no escribe en `users/u1/inventada/x`; el dueño no borra `reviewLogs/log1`. Verificar que `npm run test:integration` pasa con 9 casos de reglas sin tocar `firestore.rules` (si alguno falla, el design 5 está mal y se corrige con `/opsx:update`, no las reglas).

## 5. Entornos y configuración

- [ ] 5.1 Escribir en rojo `tests/static/environments.spec.ts` (desarrollo: `production = false`, `projectId` empieza por `demo-`, `emulators.firestore` en `127.0.0.1:8080` y `emulators.auth.url` en `http://127.0.0.1:9099`; producción: `production = true`, `emulators = null`, `projectId` real) y verificar que falla.
- [ ] 5.2 Crear `src/environments/app-environment.ts` (interfaz `AppEnvironment`), reescribir `environment.ts` (proyecto `demo-cadence`, claves de relleno, emuladores) y `environment.production.ts` (config real, `emulators: null`); verificar que 5.1 pasa y `npm run typecheck` sigue en verde.
- [ ] 5.3 Escribir en rojo `tests/static/firebase-config.spec.ts` (`firebase.json` sin `hosting`, `emulators.firestore.port = 8080`, `emulators.auth.port = 9099`; `package.json` con script `emulators`) y verificar que falla.
- [ ] 5.4 Quitar `hosting` de `firebase.json`, añadir `emulators.auth.port = 9099` y el script `"emulators": "firebase emulators:start --only firestore,auth --project demo-cadence"`; verificar que 5.3 pasa y que `npm run emulators` arranca ambos emuladores y se detiene con Ctrl+C sin error.
- [ ] 5.5 Escribir `tests/static/env-files.spec.ts` (`.env.example` existe y `.gitignore` contiene `.env`) y verificar que pasa; si `.gitignore` no lo contiene, añadirlo.

## 6. Hosting, PWA y service worker (pruebas estáticas)

- [ ] 6.1 Escribir `tests/static/netlify.spec.ts` (rewrite `/*` → `/index.html` con estado 200; las cinco cabeceras con los valores exactos de la spec; COOP `same-origin-allow-popups`) y `tests/static/angular-config.spec.ts` (COOP en el dev server; `fileReplacements` de `environment.ts` por `environment.production.ts`; `serviceWorker` solo en la configuración de producción). Verificar que pasan contra los archivos actuales.
- [ ] 6.2 Escribir `tests/static/manifest.spec.ts` (nombre y nombre corto "Cadence", `lang = es`, `dir = ltr`, `display = standalone`, `scope` y `start_url` en la raíz, `theme_color` y `background_color` `#0b0c22`, ocho iconos con `purpose = maskable any` y los ocho tamaños) e `index-html.spec.ts` (`lang = es`, título "Cadence", favicon SVG, `theme-color` `#eef1f8` bajo claro y `#0b0c22` bajo oscuro, `apple-mobile-web-app-title` "Cadence", icono táctil de 192). Verificar que pasan.
- [ ] 6.3 Escribir en rojo `tests/static/ngsw-config.spec.ts` (el grupo `app` no lista `/favicon.ico` ni `/index.csr.html`, sí `/favicon.svg`, `/index.html`, `/manifest.webmanifest`, `/*.css`, `/*.js`) y verificar que falla.
- [ ] 6.4 Corregir `ngsw-config.json`; verificar que 6.3 pasa y que `npm run build` genera `dist/flash-cards/browser/ngsw.json` cuyo grupo `app` incluye `favicon.svg`.

## 7. Firebase en la app

- [ ] 7.1 Crear `src/app/infrastructure/firebase/firebase.tokens.ts` (`FIREBASE_APP`, `FIRESTORE`, `FIREBASE_AUTH`) y verificar `npm run lint` y `npm run typecheck`.
- [ ] 7.2 Crear `src/app/core/provide-firebase.ts` según el design 1 (app única vía `getApps()`, `initializeFirestore` con caché persistente multi-pestaña, `getAuth`, `connectFirestoreEmulator`/`connectAuthEmulator` cuando `environment.emulators` no es `null`) y registrarlo en `app.config.ts`; verificar `npm test`, `npm run lint`, `npm run typecheck` y `npm run build` (anotar el tamaño inicial del bundle en la bitácora; debe quedar bajo el presupuesto de 1,5 MB).
- [ ] 7.3 (Manual) Con `npm run emulators` en una terminal y `npm start` en otra: la app arranca sin errores en consola; DevTools → Application → IndexedDB muestra la base de Firestore; una segunda pestaña abre sin error de persistencia; con "Offline" activado la app sigue respondiendo; la pestaña Network muestra peticiones a `127.0.0.1:8080` y `:9099`, ninguna a `*.googleapis.com`. Anotar el resultado en el mensaje del commit.

## 8. Documentación

- [ ] 8.1 Actualizar `README.md`: sección de desarrollo local con dos terminales (`npm run emulators` + `npm start`), proyecto `demo-cadence`, aviso de que sin semilla de allowlist el emulador muestra "sin acceso" hasta `autenticacion-y-acceso`, y cómo probar contra datos reales (build de producción servido localmente). Verificar que cada comando documentado corre tal como está escrito.
- [ ] 8.2 Anotar en `MEMORY.md` (bitácora local) el cierre del change con los tamaños de bundle y los tiempos de `test` y `test:integration`.

## 9. Verificación final

- [ ] 9.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` y verificar que todos terminan en verde en la misma sesión con `git status` limpio.
- [ ] 9.2 Push de la rama y entrega del link `https://github.com/Yotfil/flash-cards/compare/dev...feature/plataforma-datos-y-offline?expand=1` con el resumen del PR; verificar que el workflow de CI termina en verde.
