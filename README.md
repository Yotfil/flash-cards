# Cadence

App web (PWA) de repetición espaciada, serena y de baja fricción, para móvil y escritorio, online y
offline. Materia-agnóstica: el primer caso de uso es vocabulario de inglés, pero una tarjeta es
siempre un anverso y un reverso genéricos. El repositorio se llama `flash-cards`; el producto,
**Cadence**.

> Estado: **reescritura en curso** sobre `dev`, capacidad por capacidad, guiada por specs
> (OpenSpec) y TDD. `main` sigue desplegando la versión anterior (0.1.1) hasta alcanzar la
> paridad; el código viejo vive en la rama `backup/old-version`.

## Requisitos

- **Node 24.17** (`nvm use` lee `.nvmrc`).
- **Java 21** para el emulador de Firestore (`brew install openjdk@21`), solo para
  `npm run test:integration`. Sin Java, esas pruebas corren igual en CI.
- Caché local de npm: el proyecto usa `.npm-cache/` para esquivar permisos rotos en la caché
  global. Si `npm` falla con `EACCES`, prefija el comando con
  `npm_config_cache="$(pwd)/.npm-cache"`.

## Comandos

| Comando                    | Qué hace                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm start`                | Servidor de desarrollo en `http://localhost:4200/`.                                    |
| `npm run build`            | Build de producción en `dist/flash-cards/browser` (con service worker).                |
| `npm run lint`             | ESLint, incluidas las fronteras de capas.                                              |
| `npm run format:check`     | Prettier en modo comprobación (`npm run format` corrige).                              |
| `npm run typecheck`        | TypeScript estricto sobre app, pruebas unitarias e integración.                        |
| `npm test`                 | Pruebas unitarias (Vitest, una pasada). `npm run test:watch` para el ciclo rojo-verde. |
| `npm run test:integration` | Pruebas contra el emulador de Firestore (reglas y repositorios).                       |

CI (`.github/workflows/ci.yml`) corre exactamente esos comandos en cada PR hacia `dev` y `main`.

## Arquitectura

Ports & Adapters en `src/app/` (ADR 0001), con las fronteras exigidas por ESLint:

| Capa              | Responsabilidad                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `domain/`         | Modelos y puertos. TypeScript puro, sin Angular ni librerías.                            |
| `services/`       | Lógica de negocio pura (cola diaria, programación, parser). Habla con puertos.           |
| `infrastructure/` | Adaptadores de los puertos: Firestore, ts-fsrs, consola. Único lugar con esas librerías. |
| `features/`       | Pantallas: pintan y capturan eventos. Usan `services/` y `shared/`.                      |
| `shared/`         | UI reutilizable y presentacional.                                                        |
| `core/`           | Raíz de composición: enlaza puertos con adaptadores, manejador global de errores.        |
| `testing/`        | Fakes en memoria de los puertos, solo para `*.spec.ts`.                                  |

Stack: Angular 22 standalone (zoneless), TypeScript estricto, Tailwind 4 con tokens semánticos en
`src/styles.scss` (archivo de tema único del sistema visual Cadence), Firebase SDK web directo,
ts-fsrs, Zod, Signal Forms, Angular CDK, Vitest, Netlify.

## Especificaciones y diseño

- `openspec/specs/`: las 14 capacidades como specs base (comportamiento observable). Índice y
  orden de implementación en `openspec/specs/README.md`.
- `openspec/changes/`: el change en curso, con proposal, design (incluido su plan de pruebas) y
  tasks.
- `docs/design/`: la guía de rediseño UI/UX Cadence y los prototipos interactivos aprobados.

## Flujo de trabajo

Cada capacidad es un change de OpenSpec y una rama `feature/<spec-id>` sacada de `dev`:
`opsx:explore` (decisiones de esa capacidad) → `opsx:propose` → `opsx:apply` con TDD →
PR hacia `dev` con CI en verde → `opsx:archive` → se borra la rama. Commits atómicos.
