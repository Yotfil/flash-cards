# Proposal

## Why

La reescritura (ADR 0002) arranca sobre un `dev` que todavía contiene el código de la v0.1.1, sin CI, sin pruebas de integración, con las capas sostenidas solo por convención y con la identidad visual vieja. Antes de implementar la primera capacidad hace falta un terreno limpio donde lint, tipos, pruebas unitarias, integración con el emulador, build y CI estén en verde, y donde el sistema de tokens Cadence (ADR 0003) ya exista para que las pantallas lo consuman.

## What Changes

- **BREAKING (para `dev`, no para producción):** se borra todo `src/app/` de la v0.1.1 y sus 45 specs. El código viejo sigue en `backup/old-version`; `main` sigue desplegando 0.1.1.
- Queda un esqueleto mínimo: componente raíz que pinta "Cadence", arranque de Angular, entornos de Firebase y las carpetas de capas vacías (`domain`, `services`, `infrastructure`, `features`, `shared`, `core`) más `testing/` para fakes compartidos.
- Las capas pasan a exigirse con ESLint (importaciones prohibidas entre capas; Firebase y ts-fsrs solo desde `infrastructure`).
- Sistema de tokens Cadence en el archivo de tema único: paleta oscura primero, variante clara plana, tokens de movimiento, utilidades de acrílico y respeto de "reducir movimiento" y "reducir transparencia". Fuente Plus Jakarta Sans autohospedada en lugar de Source Sans 3.
- Identidad: título, manifest de la PWA y colores de tema pasan a "Cadence" (el icono se diseña después).
- Puerto `Logger` con adaptador de consola y `ErrorHandler` global que enruta todo error no capturado por ese puerto (la parte visible llega con el caparazón).
- Pruebas de integración contra el emulador de Firestore, separadas de las unitarias (`test:integration`), con una primera prueba real sobre las reglas de seguridad vigentes.
- CI mínima en GitHub Actions: lint, formato, tipos, unitarias, integración y build en cada PR hacia `dev` y `main`.
- Angular CDK entra como dependencia (se usa desde el caparazón).
- README del repo reescrito para el proyecto nuevo.

## Capabilities

Este change no implementa ni modifica ninguna spec base de `openspec/specs/`: es solo herramientas, esqueleto y tema. Por eso declara `skip_specs: true`. La primera capacidad con comportamiento observable es `plataforma-datos-y-offline`, que viene después.

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna.

## Impact

- `src/app/**` (borrado y esqueleto nuevo), `src/styles.scss` (tokens Cadence), `src/index.html`, `public/manifest.webmanifest`.
- `package.json`: entran `@angular/cdk`, `@fontsource/plus-jakarta-sans`, `firebase-tools` y `@firebase/rules-unit-testing`; sale `@fontsource/source-sans-3`. Scripts nuevos `test:integration` y `typecheck`.
- `eslint.config.js` (fronteras de capas), `tsconfig.json` (alias `@testing/*`), `firebase.json` (emulador), `vitest.integration.config.ts` (nuevo), `.github/workflows/ci.yml` (nuevo), `README.md`.
- Sin cambios en `firestore.rules`, `firestore.indexes.json`, `netlify.toml` ni en los datos: el esquema queda intacto (compatibilidad total, ADR 0002).
- Requisito local nuevo: Java 21 para el emulador de Firestore (hoy no está instalado en la máquina del usuario); sin él, `test:integration` solo corre en CI.

## Fuera de alcance

- Cualquier pantalla, ruta o navegación: llegan con `navegacion-y-shell`.
- Modelo de datos, puertos de repositorios, reglas nuevas e índices: `plataforma-datos-y-offline`.
- El patrón compartido de recurso asíncrono: se crea con su primer caso real.
- Playwright, icono de la PWA, dominio propio en Netlify, bump de versión.
