# Design

## Context

Ver `proposal.md` (Why). Estado observado en `dev` al 2026-10-21, tras el change 0:

- `app.config.ts` registra router vacío, `provideCore()` (Logger + ErrorHandler) y el service worker solo fuera de desarrollo. No hay Firebase en la app.
- `firestore.rules` e `firestore.indexes.json` ya son los definitivos; `tests/rules/users.rules.spec.ts` cubre 5 escenarios con `@firebase/rules-unit-testing` contra el emulador (`test:integration`, proyecto `demo-cadence`).
- `src/environments/environment.ts` y `environment.production.ts` llevan la misma config pública del proyecto real.
- `netlify.toml` tiene rewrite SPA y las cinco cabeceras; `firebase.json` duplica un `hosting` sin cabeceras. `ngsw-config.json` precarga `/favicon.ico` e `/index.csr.html`, que no existen; el favicon es `favicon.svg`.
- `public/manifest.webmanifest` e `index.html` ya dicen "Cadence" con `#0b0c22` (lienzo oscuro) y `theme-color` por esquema.
- Capas exigidas por ESLint: `firebase*` solo puede importarse desde `infrastructure` y `core`; `zod` no desde `domain`.
- Código de referencia (no se copia, se reescribe con TDD): `backup/old-version` tenía `provideFirebase` con caché persistente multi-pestaña, esquemas Zod por documento, `MAX_BATCH_SIZE = 450` y un gestor de lotes dentro del repositorio de importación.

Decisiones del explore que condicionan este design: hallazgos 3 a 9 (`docs/hallazgos-codigo-actual.md`) y alcance "cimientos delgados". Este change no pinta UI: no aplica la regla de superficies con acrílico del ADR 0003.

## Goals / Non-Goals

**Goals:**
- Que la primera capacidad con datos (`autenticacion-y-acceso`) solo tenga que inyectar `FIRESTORE`/`FIREBASE_AUTH`, escribir su esquema y su repositorio.
- Cada mecanismo de plataforma con su prueba: frontera (unitaria), lotes y reglas (emulador), hosting/manifest/entornos (estática).
- Desarrollo local sin tocar la nube: `ng serve` contra emuladores.

**Non-Goals:**
- Modelos de dominio, esquemas por documento y repositorios (cada capacidad trae los suyos).
- Patrón de recurso asíncrono y estados visibles de error (shell).
- Probar la persistencia IndexedDB de forma automatizada.

## Decisions

### 1. Arranque de Firebase en `core/provide-firebase.ts` (capa core, raíz de composición)

`provideFirebase()` devuelve `EnvironmentProviders` que crean la app (`initializeApp(environment.firebase)`), Firestore con `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` y `getAuth(app)`, y los enlazan a los tokens `FIREBASE_APP`, `FIRESTORE` y `FIREBASE_AUTH` de `infrastructure/firebase/firebase.tokens.ts`. Si `environment.emulators` no es `null`, llama a `connectFirestoreEmulator` y `connectAuthEmulator` antes de cualquier operación. Reutiliza la app existente si ya hay una (`getApps()`), porque `initializeFirestore` solo admite una llamada por app y la recarga en caliente lo repite.

*Por qué en `core` y no en `infrastructure`:* es la raíz de composición (ADR 0001): el único sitio que decide implementaciones concretas, igual que `provideCore`. Los tokens viven en `infrastructure` porque son el detalle que los adaptadores inyectan. *Alternativa descartada:* `@angular/fire`; añade dependencia y vocabulario sin resolver nada que el SDK directo no resuelva (ADR 0002 conserva el SDK web directo).

### 2. Entornos: desarrollo contra emuladores con proyecto `demo-cadence`

`src/environments/app-environment.ts` declara la interfaz `AppEnvironment { production; firebase: FirebaseOptions; emulators: { firestore: { host; port }; auth: { url } } | null }`. `environment.ts` (desarrollo): `projectId: 'demo-cadence'`, `apiKey`/`appId` de relleno (los emuladores no los validan) y `emulators` apuntando a `127.0.0.1:8080` y `http://127.0.0.1:9099`. `environment.production.ts`: config real y `emulators: null`.

*Por qué un proyecto `demo-`:* Firebase trata los identificadores `demo-*` como solo emulador: imposible tocar la nube por un `connect...` olvidado. Coincide con el `--project demo-cadence` de `test:integration`. *Salida de emergencia* para probar contra datos reales: build de producción servido localmente (`npm run build` + servidor estático), no `ng serve`. *Alternativa descartada:* inyectar la config por variables de entorno en el build (hallazgo 7, conservado): la config es pública y Angular ya sustituye el archivo.

`firebase.json` gana `emulators.auth.port = 9099` y pierde `hosting` (hallazgo 8). Script nuevo `npm run emulators` = `firebase emulators:start --only firestore,auth --project demo-cadence`. La semilla de la allowlist (import/export de datos del emulador) la define `autenticacion-y-acceso`; hasta entonces, el usuario del emulador verá "sin acceso", que es correcto.

### 3. Frontera de lectura en `infrastructure/firestore/document-boundary.ts` (capa infrastructure)

- `firestoreTimestamp`: esquema Zod `z.instanceof(Timestamp).transform(toDate)`; lo reutilizan todos los esquemas de documento.
- `parseDocument(schema, path, data)`: devuelve el modelo validado o lanza `InvalidDocumentError` con `path` y `issues` (ruta del campo + mensaje de Zod); el mensaje de error legible incluye ambos.
- `parseDocuments(schema, documents)`: recibe una lista estructural `{ id, path, data() }` (compatible con `QueryDocumentSnapshot` y con objetos planos en pruebas) y devuelve todos los modelos o lanza en el primero inválido (hallazgo 4: todo-o-nada).
- `InvalidDocumentError extends Error` vive en el mismo archivo. El registro en `Logger` lo hace quien captura el error (el servicio o el `ErrorHandler` global), no la frontera: así la frontera sigue siendo pura y probable sin inyección.

*Justificación de la abstracción (segundo caso real):* los seis esquemas del código viejo repetían `firestoreTimestamp` y el `parse` en cada repositorio. *Por qué estructural y no `QuerySnapshot`:* para que la prueba unitaria no necesite emulador ni mocks de librería (ADR 0002: sin mocks de librería).

### 4. Escritor por lotes en `infrastructure/firestore/batch-writer.ts` (capa infrastructure)

`MAX_BATCH_SIZE = 450`. Clase `BatchWriter` creada con una instancia de `Firestore`: `set(ref, data)`, `update(ref, data)`, `delete(ref)` acumulan operaciones; `commit()` las parte en trozos de hasta 450, confirma cada `writeBatch` en secuencia y devuelve `{ batches: number; written: DocumentReference[] }`. Si un commit falla, lanza `BatchCommitError` con `committed: DocumentReference[]` (lo confirmado en los lotes anteriores) y `cause` (el error original), para que la operación que lo pidió pueda deshacer (política que aplica `importacion`, hallazgo 5). El orden de las operaciones se respeta tal cual se añadieron: así `importacion` puede poner el documento del libro al final.

*Justificación (segundo caso real):* en el código viejo troceaban `createMany`, `deleteMany` e `importBook`, cada uno a su manera. *Alternativa descartada:* transacción (mismo límite de 500 y bloquea lecturas) y `BulkWriter` (solo Admin SDK).

### 5. Reglas: completar la cobertura, sin cambiar las reglas

`firestore.rules` ya declara permisos colección por colección y deniega el resto. Se añaden a `tests/rules/users.rules.spec.ts` los escenarios: escritura sin sesión denegada; dueño escribe en `books`, `chapters`, `cards`, `dailyStats/2026-06-15` y crea en `reviewLogs`; dueño no escribe en una subcolección inventada; dueño no borra un registro de repaso. El arranque del entorno de pruebas y la semilla de la allowlist pasan a `tests/support/firestore-test-environment.ts`, compartido por las pruebas de reglas y las del escritor por lotes (segundo caso real).

### 6. Índices: se conservan tal cual (hallazgo 3)

Sin cambios en `firestore.indexes.json`. El emulador no exige índices, así que el escenario "sin error de índice faltante" se verifica cuando cada consulta llegue con su capacidad y en el despliegue de índices (`firebase deploy --only firestore:indexes`, tarea del usuario al publicar).

### 7. Service worker, manifest y hosting

- `ngsw-config.json`: grupo `app` con `/index.html`, `/favicon.svg`, `/manifest.webmanifest`, `/*.css`, `/*.js` (hallazgo 9). Fuentes e imágenes siguen en el grupo perezoso.
- Manifest e `index.html` no cambian: ya cumplen el requisito MODIFIED.
- `firebase.json` sin `hosting`; `netlify.toml` intacto.

### 8. Pruebas estáticas en `tests/static/` (Node, dentro de `test:integration`)

Pruebas que leen archivos de configuración con `fs` y afirman lo que la spec exige: `netlify.toml` (rewrite 200 a `/index.html`, cinco cabeceras con sus valores exactos, COOP `same-origin-allow-popups`), `angular.json` (COOP en el dev server, `fileReplacements`), `manifest.webmanifest` (nombre, idioma, `standalone`, colores, ocho iconos `maskable any`), `index.html` (título iOS, favicon SVG, `theme-color` por esquema), `ngsw-config.json` (sin rutas fantasma), `firebase.json` (sin `hosting`, emuladores de Firestore y Auth), entornos (desarrollo con `demo-` y emuladores; producción sin emuladores) y `.gitignore`/`.env.example`.

*Por qué dentro del config de integración:* es el único runner en Node (el de unitarias corre en jsdom vía el builder de Angular). No necesitan el emulador, pero correr bajo `emulators:exec` cuesta cero y evita un tercer comando. `vitest.integration.config.ts` pasa a incluir `tests/**/*.spec.ts`.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| Tokens `FIRESTORE`, `FIREBASE_AUTH`, `FIREBASE_APP` (`@infrastructure/firebase/firebase.tokens`) | Todos los adaptadores |
| `firestoreTimestamp`, `parseDocument`, `parseDocuments`, `InvalidDocumentError` (`@infrastructure/firestore/document-boundary`) | Todos los esquemas y repositorios |
| `BatchWriter`, `BatchCommitError`, `MAX_BATCH_SIZE` (`@infrastructure/firestore/batch-writer`) | `tarjetas` (crear/borrar muchas), `importacion` (libro al final + deshacer con `committed`) |
| `tests/support/firestore-test-environment.ts`: `createRulesTestEnvironment()`, `seedAllowlist(emails)`, `ownerContext()` | Pruebas de integración de todos los repositorios |
| `environment.emulators` y `npm run emulators` (Firestore + Auth) | `autenticacion-y-acceso` añade la semilla de allowlist (import/export del emulador) |
| `ErrorHandler` global ya existente recibe `InvalidDocumentError` con ruta y razón | `navegacion-y-shell` lo vuelve visible |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Ubicación de una tarjeta; Indicadores del día | `users.rules.spec`: el dueño escribe en `cards/c1` y en `dailyStats/2026-06-15` | integración (emulador) |
| Otro usuario intenta leer | `users.rules.spec` (existe) | integración |
| Sin autenticación | `users.rules.spec`: lectura (existe) y escritura (nuevo) denegadas | integración |
| Colección no declarada | `users.rules.spec`: escritura en `users/u1/inventada/x` denegada | integración |
| Crear y leer / Intentar corregir un registro | `users.rules.spec`: crear y leer (existe), update (existe) y delete (nuevo) denegados | integración |
| Cola por libro; Conteo por estado; Historial por libro | Sin prueba aquí: el emulador no exige índices. Se verifican en `libros`, `progreso` y `cola-diaria` y al desplegar índices | diferido |
| Estudiar sin red; Dos pestañas | Manual: `npm run emulators` + `ng serve`, DevTools → Application → IndexedDB muestra la base de Firestore; segunda pestaña sin error de persistencia; con "Offline" la app sigue respondiendo. Playwright al cerrar la paridad | manual |
| Abrir sin red tras una visita | `ngsw-config.spec` (grupo `app` sin rutas fantasma, con favicon) + `npm run build` genera `ngsw.json` que lista `favicon.svg`; manual en el branch deploy | estática + build + manual |
| Desarrollo (sin service worker) | Lectura de `app.config.ts` (`enabled: !isDevMode()`); manual: `ng serve` no registra worker | lectura + manual |
| Instalación; Barra en oscuro; Barra en claro | `manifest.spec` e `index-html.spec` (nombre "Cadence", `standalone`, colores `#0b0c22`, ocho iconos, `theme-color` por esquema, título iOS, favicon SVG) | estática |
| Entrar directo a una ruta interna | `netlify.spec` (rewrite `/*` → `/index.html` 200) | estática |
| Cabeceras en producción | `netlify.spec` (cinco cabeceras exactas) + `angular.spec` (COOP en dev server) | estática |
| Login con Google (COOP) | `autenticacion-y-acceso` | diferido |
| Build de producción; Desarrollo local | `environments.spec`: producción sin emuladores y con proyecto real; desarrollo con `demo-cadence` y emuladores; `angular.spec` con `fileReplacements` | estática |
| Clave de servicio | `env-files.spec`: `.env.example` existe y `.env` está en `.gitignore` | estática |
| Documento válido | `document-boundary.spec`: esquema con `firestoreTimestamp` devuelve `Date` | unitaria pura |
| Documento inválido en un listado | `document-boundary.spec`: `parseDocuments` con uno inválido entre tres lanza, sin devolver los válidos | unitaria pura |
| Error con contexto | `document-boundary.spec`: `InvalidDocumentError.path` y mensaje con el campo rechazado | unitaria pura |
| Tarjeta sin `learningSteps`; Perfil antiguo; Indicadores dispersos | `document-boundary.spec`: un esquema con `.default()` se completa al leer (mecanismo). Los campos concretos se prueban en `tarjetas`, `autenticacion-y-acceso` y `cola-diaria` con su esquema | unitaria pura + diferido |
| Línea sin separador | `importacion` | diferido |
| Importación pequeña | `batch-writer.integration.spec`: 306 `set` → `batches = 1`, 306 documentos en el emulador | integración |
| Importación grande | `batch-writer.integration.spec`: 1 000 `set` → `batches = 3`, orden respetado (el último `set` es el último documento escrito) | integración |
| Lote que falla a mitad | `batch-writer.integration.spec`: 600 operaciones donde las últimas 150 apuntan a un árbol ajeno → `BatchCommitError.committed` con las 450 primeras; el deshacer y el aviso al usuario se prueban en `importacion` | integración + diferido |
| Borrado masivo | `batch-writer.integration.spec`: 900 `delete` → `batches = 2`, colección vacía | integración |

## Risks / Trade-offs

- [IndexedDB no existe en Node ni jsdom] → `provideFirebase` no se prueba en unitarias; la caché se verifica a mano en la tarea correspondiente y con Playwright al cerrar la paridad. Si se necesita antes, `fake-indexeddb` como devDependencia.
- [`initializeFirestore` falla al llamarse dos veces en recarga en caliente] → reutilizar `getApps()`/`getFirestore` como hacía el código viejo.
- [Olvidar `connect...Emulator` en desarrollo] → el proyecto `demo-cadence` no existe en la nube: la petición falla ruidosamente en vez de tocar datos reales.
- [Desarrollar contra el emulador de Auth sin allowlist muestra "sin acceso"] → asumido hasta `autenticacion-y-acceso`; documentado en README.
- [Pruebas estáticas acopladas al formato de los archivos] → afirmaciones sobre valores exactos de la spec, no sobre el formato; TOML y JSON se leen como texto o JSON.
- [El bundle crece con Firestore + Auth] → presupuesto de 1,5 MB; se registra el tamaño en la bitácora.

## Migration Plan

Rama `feature/plataforma-datos-y-offline` desde `dev` en la fase B. Sin datos que migrar ni reglas nuevas que desplegar. Rollback: revertir el merge en `dev`; producción (`main`, 0.1.1) no se toca.
