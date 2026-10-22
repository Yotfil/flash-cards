# Design

## Context

Ver `proposal.md` (Why). Estado observado en `dev` al 2026-10-21:

- Angular 22 standalone, zoneless por defecto (sin Zone en polyfills), builder `@angular/build:application`, pruebas con `@angular/build:unit-test` (Vitest + jsdom), presupuestos 1.5 MB / 1.75 MB.
- `tsconfig.json` con todas las banderas estrictas y alias `@core/* @domain/* @services/* @infrastructure/* @features/* @shared/*`.
- `eslint.config.js` plano con `no-explicit-any` y prohibición de `catch` vacío; sin reglas de capas.
- `src/styles.scss` es el archivo de tema único (Tailwind 4 vía `@use`, tokens en `@theme`), hoy con la paleta clara y Source Sans 3.
- `public/manifest.webmanifest` e `index.html` dicen "Flash-cards".
- `firebase.json` sin sección de emuladores. Java no está instalado en la máquina del usuario.
- Sin `.github/`. `scripts/generate-build-info.mjs` corre en `postinstall`/`prebuild`.
- La caché global de npm tiene archivos de `root`; el proyecto usa `.npm-cache` local.

Restricciones: ADR 0001 (capas), ADR 0002 (stack, datos compatibles, proceso) y ADR 0003 (sistema visual). Este change no pinta UI, así que no aplica la regla de superficies con acrílico; las utilidades de vidrio se definen pero nada las usa todavía.

## Goals / Non-Goals

**Goals:**
- Terreno limpio con todos los comandos en verde: `lint`, `format:check`, `typecheck`, `test`, `test:integration`, `build`.
- Capas verificadas por herramienta, no por convención.
- Tokens Cadence listos para consumirse sin que ningún componente escriba un literal.
- CI que repita exactamente esos comandos en cada PR.

**Non-Goals:**
- Diseñar el patrón de recurso asíncrono, los puertos de datos o cualquier pantalla.
- Probar el rendimiento del acrílico (no hay UI).
- Migrar o tocar datos de Firestore.

## Decisions

### 1. Qué se borra y qué se conserva

Se borra `src/app/**` completo (202 archivos, 45 specs). Se conservan `src/main.ts`, `src/index.html`, `src/environments/`, `src/styles.scss` (reescrito), `public/` (icono placeholder hasta diseñar el real), `scripts/`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `ngsw-config.json`, `netlify.toml` y toda la configuración de herramientas. *Por qué:* lo conservado es infraestructura que no cambia con el rediseño y cuyo borrado solo añadiría riesgo. Alternativa descartada: borrar también `src/` y regenerar con `ng new` (perdería el tema, la PWA y los entornos ya probados).

### 2. Esqueleto mínimo (capa `features` y `core`)

`src/app/app.ts` (componente raíz, 4 archivos según CLAUDE.md) pinta solo el texto "Cadence"; `app.config.ts` registra `provideRouter([])`, el service worker en producción y los proveedores de `core`. Carpetas `domain/ports`, `domain/models`, `services`, `infrastructure`, `features`, `shared`, `core`, `testing` con un `.gitkeep` donde queden vacías (los README de carpeta están ignorados por git; la documentación de capas vive en el ADR 0001).

### 3. Capas exigidas por ESLint con `no-restricted-imports` por carpeta

Un bloque de configuración por capa (`files: ['src/app/features/**']`, etc.) con `@typescript-eslint/no-restricted-imports` y patrones:

| Capa | Prohibido importar |
| --- | --- |
| `domain` | todo lo que no sea `domain` (`@services/*`, `@infrastructure/*`, `@features/*`, `@shared/*`, `@core/*`, `@angular/*`, `firebase*`, `ts-fsrs`, `zod` se permite solo en esquemas de `infrastructure`) |
| `services` | `@infrastructure/*`, `@features/*`, `@shared/*`, `@core/*`, `firebase*`, `ts-fsrs` |
| `infrastructure` | `@features/*`, `@shared/*`, `@core/*`, `@services/*` |
| `features` | `@infrastructure/*`, `firebase*`, `ts-fsrs` |
| `shared` | `@infrastructure/*`, `@services/*`, `@features/*`, `@core/*`, `firebase*`, `ts-fsrs` |
| `testing` | `@infrastructure/*`, `@features/*`, `@core/*`, `firebase*` |
| cualquier archivo que no sea `*.spec.ts` | `@testing/*` |

*Por qué sin plugin:* `no-restricted-imports` ya viene con typescript-eslint, cubre la matriz del ADR 0001 y no añade dependencia. Alternativa: `eslint-plugin-boundaries` (más expresivo, detecta importaciones relativas que crucen capas). Se adopta cuando aparezca un cruce que los patrones no atrapen; para blindar las relativas, se añade el patrón `../../infrastructure/*` y equivalentes a cada bloque.

### 4. Tokens Cadence en el archivo de tema único (`src/styles.scss`)

- `@theme` con la paleta oscura como valor base: fondos (`night-1/2/3`), superficie sólida, vidrio (`glass`, `glass-soft`, `glass-border`), acento (`accent`, `accent-deep`, `accent-ink`, `accent-text`, `accent-tint`, `accent-line`), texto (`text`, `text-dim`, `text-faint`), `off`, `track`, `wine`, la escala reservada `rating-again/hard/good/easy`, sombras, desenfoques (`blur`, `blur-soft`, `blur-nav`) y movimiento (`t-press`, `t-fast`, `t-base`, `t-view`, `t-flip`, `ease-out`, `ease-in`).
- Variante clara plana bajo `@media (prefers-color-scheme: light)` guardada por `:root:not([data-theme="dark"])` y bajo `:root[data-theme="light"]`, con desenfoques a 0 y vidrio sólido, calcada del prototipo aprobado (`docs/design/cadence-prototipo-extendido.html`).
- `@media (prefers-reduced-transparency: reduce)` y la clase `.solid` vuelven sólidas las superficies de vidrio; `@media (prefers-reduced-motion: reduce)` anula transiciones y animaciones.
- Utilidades `glass`, `glass-soft` y `press` con `@utility` de Tailwind 4, para que las pantallas no repitan la fórmula del acrílico.
- Fuente: `@fontsource/plus-jakarta-sans` (400, 500, 600, 700, 800) importada en el tema; `--font-sans` apunta a ella.

*Por qué calcar el prototipo:* es la referencia aprobada; cualquier ajuste de tono se hace después sobre la app real, tocando solo este archivo (Principio 5).

### 5. Identidad

`index.html` título "Cadence", `lang="es"`, `theme-color` por modo (`#0b0c22` oscuro, `#eef1f8` claro). Manifest: `name` y `short_name` "Cadence", `theme_color` y `background_color` `#0b0c22`. Los iconos siguen siendo placeholder hasta que se diseñe el icono sobre el sistema aprobado.

### 6. Puerto `Logger` y `ErrorHandler` global

- `domain/ports/logger.port.ts`: clase abstracta `Logger` (token de DI, como los demás puertos) con `info`, `warn` y `error(message, cause?)`.
- `infrastructure/logging/console-logger.adapter.ts`: implementa `Logger` sobre `console`, con prefijo `[Cadence]`.
- `core/global-error-handler.ts`: `ErrorHandler` de Angular que delega en `Logger.error` y no relanza; el aviso visible al usuario lo añade `navegacion-y-shell`.
- `core/provide-core.ts` enlaza puerto y adaptador y registra el `ErrorHandler`.

*Justificación del segundo caso real:* los 23 `console.error` del código viejo son el caso repetido que pide la abstracción.

### 7. Pruebas unitarias e integración separadas

- Unitarias: `npm test` = `ng test --watch=false` (builder Vitest de Angular, jsdom). Sin cambios de herramienta.
- Integración: `vitest.integration.config.ts` (entorno `node`, incluye `src/**/*.integration.spec.ts` y `tests/rules/**`), devDependencias `firebase-tools` y `@firebase/rules-unit-testing`. Script `test:integration` = `firebase emulators:exec --only firestore --project demo-cadence "vitest run -c vitest.integration.config.ts"`. `firebase.json` gana `emulators.firestore.port = 8080` y `ui.enabled = false`. Primera prueba: `tests/rules/users.rules.spec.ts` sobre `firestore.rules` vigentes (sin sesión no se lee `/users/x`; un usuario en la allowlist lee su propio árbol; otro usuario no).
- `typecheck` = `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit`.

*Por qué separar:* el ciclo rojo-verde local debe seguir en segundos; el emulador tarda en arrancar y exige Java.

### 8. CI mínima (`.github/workflows/ci.yml`)

Disparadores: `pull_request` hacia `dev` y `main`, `push` a `dev`. Pasos: `actions/checkout`, `actions/setup-node` con `node-version-file: .nvmrc` y caché npm, `actions/setup-java` (Temurin 21) para el emulador, `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`. Un solo job; sin despliegue (Netlify sigue desplegando por merge).

### 9. Alias y scripts

`tsconfig.json` gana `@testing/*`. `package.json` gana `typecheck`, `test:integration`, y `description: "Cadence, repetición espaciada"`; `name` y `version` no cambian (el bump es del release).

## Plan de pruebas

No hay escenarios de spec (change de herramientas). La tabla mapea cada pieza a su verificación y su capa:

| Pieza | Verificación | Capa |
| --- | --- | --- |
| Esqueleto raíz | `app.spec.ts`: el componente raíz renderiza el texto "Cadence" | componente (Vitest + jsdom) |
| `ConsoleLoggerAdapter` | `console-logger.adapter.spec.ts`: `error` escribe en `console.error` con prefijo y causa; `info`/`warn` en sus métodos | unitaria pura |
| `GlobalErrorHandler` | `global-error-handler.spec.ts`: delega en un fake de `Logger` (`testing/fake-logger.ts`), no relanza, acepta errores no-`Error` | unitaria pura |
| Fronteras de capas | Fixture temporal `features/x.ts` que importa `@infrastructure/*` hace fallar `npm run lint`; se borra tras comprobarlo. Queda documentado en el commit | estática (ESLint) |
| Tokens Cadence | `npm run build` de producción genera CSS con `--color-accent` y la fuente Plus Jakarta Sans (grep tolerante, ver aprendizajes de la bitácora); `anyComponentStyle` dentro de presupuesto | build |
| Identidad | `index.html` y manifest contienen "Cadence"; `ng build` copia el manifest | build + lectura |
| Reglas de Firestore | `tests/rules/users.rules.spec.ts` contra el emulador: 3 casos (sin sesión denegado, dueño en allowlist permitido, otro usuario denegado) | integración (emulador) |
| CI | El workflow termina en verde en el PR de este change | CI |

## Risks / Trade-offs

- [Java ausente en la máquina del usuario] → `test:integration` corre en CI desde el primer PR; localmente queda pendiente `brew install openjdk@21` (tarea del usuario, documentada en README).
- [Caché global de npm con archivos de `root`] → todos los comandos npm del change usan `npm_config_cache=.npm-cache` como ya hace el proyecto.
- [`no-restricted-imports` no atrapa rutas relativas creativas] → se añaden patrones relativos y se revisa en PR; si falla, entra `eslint-plugin-boundaries`.
- [El emulador en CI añade 1 a 2 minutos] → aceptable; si molesta, se separa en un job paralelo.
- [Borrar 202 archivos en un PR] → PR solo de borrado y esqueleto; el código vive en `backup/old-version`; rollback = revertir el merge.
- [`firebase-tools` pesa] → solo devDependencia; no entra al bundle.

## Migration Plan

1. Rama `feature/fundaciones-reescritura` desde `dev` (ya creada).
2. Commits atómicos por grupo de tareas; PR hacia `dev`; CI en verde como criterio de merge.
3. `main` no se toca; producción sigue en 0.1.1. Rollback: revertir el merge en `dev`.

## Open Questions

Ninguna que cambie el alcance. El valor exacto de cada tono se afina sobre la app real en los changes de UI.
