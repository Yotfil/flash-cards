# Tasks

## 1. Prerrequisitos del entorno

- [x] 1.1 (Usuario) Instalar Java 21 para el emulador de Firestore (`brew install openjdk@21` y enlazarlo) y verificar con `java -version`. Hasta entonces, las tareas de integración se verifican en CI.
- [x] 1.2 Confirmar que `npm_config_cache=.npm-cache npm ci` instala sin errores EACCES y que `npm run build` del código viejo sigue en verde antes de borrar nada (línea base).

## 2. Limpieza y esqueleto

- [x] 2.1 Borrar `src/app/**` completo y verificar con `git status` que solo desaparecen archivos bajo `src/app/` (nada de `environments/`, `public/`, `scripts/`, reglas ni configuración).
- [x] 2.2 Escribir en rojo `src/app/app.spec.ts` (el componente raíz renderiza "Cadence") y verificar que `npm test` falla por ausencia del componente.
- [x] 2.3 Crear el componente raíz en sus cuatro archivos (`app.ts`, `app.html`, `app.scss`, `app.spec.ts`), `app.config.ts` con `provideRouter([])` y el service worker solo en producción, y `main.ts`; verificar que `npm test` pasa y `npm run build` termina sin avisos de presupuesto.
- [x] 2.4 Crear las carpetas `domain/models`, `domain/ports`, `services`, `infrastructure`, `features`, `shared`, `core`, `testing` con `.gitkeep`, y el alias `@testing/*` en `tsconfig.json`; verificar con `npm run typecheck` (script nuevo: `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit`).

## 3. Dependencias

- [x] 3.1 Añadir `@angular/cdk` (22.x) y `@fontsource/plus-jakarta-sans`, quitar `@fontsource/source-sans-3`; verificar que `npm ci` y `npm run build` siguen en verde.
- [x] 3.2 Añadir como devDependencias `firebase-tools` y `@firebase/rules-unit-testing`; verificar que `npx firebase --version` responde con la caché local de npm.

## 4. Tokens Cadence e identidad

- [x] 4.1 Reescribir `src/styles.scss` con el `@theme` oscuro base (fondos, vidrio, acento, texto, escala de calificación reservada, sombras, desenfoques, movimiento), la variante clara bajo `prefers-color-scheme: light` y `[data-theme]`, `prefers-reduced-transparency`, `prefers-reduced-motion`, las utilidades `glass`, `glass-soft` y `press`, y la fuente Plus Jakarta Sans; verificar que el build de producción contiene `--color-accent` y la fuente (grep tolerante sobre `dist/`), sin literales de color en `src/app/`.
- [x] 4.2 Cambiar `src/index.html` (título "Cadence", `lang="es"`, `theme-color` por modo) y `public/manifest.webmanifest` (`name`, `short_name`, `theme_color`, `background_color`); verificar que `dist/flash-cards/browser/manifest.webmanifest` dice "Cadence" tras `npm run build`.

## 5. Capas exigidas por ESLint

- [x] 5.1 Añadir a `eslint.config.js` un bloque por capa con `@typescript-eslint/no-restricted-imports` según la matriz del design (incluidos patrones relativos y la prohibición de `@testing/*` fuera de `*.spec.ts`); verificar que `npm run lint` pasa sobre el esqueleto.
- [x] 5.2 Crear un fixture temporal `src/app/features/violacion.ts` que importe `@infrastructure/x` y otro en `src/app/services/` que importe `firebase/firestore`; verificar que `npm run lint` falla en ambos, luego borrarlos y verificar que vuelve a pasar. Anotar la comprobación en el mensaje del commit.

## 6. Logger y ErrorHandler global (TDD)

- [x] 6.1 Escribir en rojo `src/app/infrastructure/logging/console-logger.adapter.spec.ts` (`error` escribe en `console.error` con prefijo `[Cadence]` y la causa; `info` y `warn` en sus métodos) y verificar que falla.
- [x] 6.2 Crear el puerto `src/app/domain/ports/logger.port.ts` (clase abstracta `Logger` con `info`, `warn`, `error`) y `console-logger.adapter.ts`; verificar que 6.1 pasa.
- [x] 6.3 Escribir en rojo `src/app/core/global-error-handler.spec.ts` usando `src/app/testing/fake-logger.ts` (fake en memoria que acumula entradas): delega en `error`, no relanza, acepta valores que no son `Error`; verificar que falla.
- [x] 6.4 Implementar `global-error-handler.ts` y `provide-core.ts` (enlaza `Logger` con el adaptador y registra el `ErrorHandler`), registrarlo en `app.config.ts`; verificar que 6.3 pasa y que `npm run lint` y `npm run typecheck` siguen en verde.

## 7. Integración con el emulador de Firestore (TDD)

- [x] 7.1 Añadir `emulators.firestore.port = 8080` y `emulators.ui.enabled = false` a `firebase.json`, crear `vitest.integration.config.ts` (entorno `node`, patrón `tests/rules/**/*.spec.ts` y `src/**/*.integration.spec.ts`) y el script `test:integration` = `firebase emulators:exec --only firestore --project demo-cadence "vitest run -c vitest.integration.config.ts"`; verificar que el script arranca el emulador y termina con "no tests" sin error (o, sin Java local, que falla con el mensaje de Java ausente y no por configuración).
- [x] 7.2 Escribir `tests/rules/users.rules.spec.ts` con `@firebase/rules-unit-testing` contra `firestore.rules`: sin sesión no se lee `/users/u1/books/b1`; `u1` con su email en `/allowlist` sí lee y escribe su árbol; `u2` no lee el árbol de `u1`; verificar que `npm run test:integration` pasa (localmente con Java, o en CI en 8.2).

## 8. CI

- [x] 8.1 Crear `.github/workflows/ci.yml` (pull_request a `dev` y `main`, push a `dev`; setup-node con `.nvmrc` y caché npm, setup-java Temurin 21, `npm ci`, `lint`, `format:check`, `typecheck`, `test`, `test:integration`, `build`); verificar la sintaxis con `npx prettier --check .github` y lectura cruzada contra los scripts de `package.json`.
- [x] 8.2 Abrir el PR hacia `dev` y verificar que el workflow termina en verde, incluida la prueba de reglas contra el emulador.

## 9. Documentación

- [x] 9.1 Reescribir `README.md` del repo para Cadence: qué es, requisitos (Node 24.17 vía nvm, Java 21 para el emulador, caché local de npm), scripts y su significado, flujo de ramas y enlace a `openspec/specs/README.md` y `docs/design/`; verificar que cada comando documentado corre tal como está escrito.
- [x] 9.2 Anotar en `MEMORY.md` (bitácora, local) el cierre del change 0 y las líneas base de tiempo de `test` y `test:integration`.

## 10. Verificación final

- [x] 10.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` y verificar que todos terminan en verde en la misma sesión, con `git status` limpio salvo lo commiteado.
