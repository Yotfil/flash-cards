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
- **Java 21 o superior** para los emuladores de Firebase (`brew install openjdk`), necesarios
  para `npm run emulators` y `npm run test:integration`. El JDK de Homebrew no entra al PATH
  solo: añade `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"` a `~/.zprofile`. Sin Java, las
  pruebas de integración corren igual en CI.
- Caché local de npm: el proyecto usa `.npm-cache/` para esquivar permisos rotos en la caché
  global. Si `npm` falla con `EACCES`, prefija el comando con
  `npm_config_cache="$(pwd)/.npm-cache"`.

## Comandos

| Comando                    | Qué hace                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm start`                | Servidor de desarrollo en `http://localhost:4200/`, contra los emuladores.             |
| `npm run emulators`        | Emuladores locales de Firestore (`:8080`) y Auth (`:9099`), proyecto `demo-cadence`.   |
| `npm run build`            | Build de producción en `dist/flash-cards/browser` (con service worker).                |
| `npm run lint`             | ESLint, incluidas las fronteras de capas.                                              |
| `npm run format:check`     | Prettier en modo comprobación (`npm run format` corrige).                              |
| `npm run typecheck`        | TypeScript estricto sobre app, pruebas unitarias e integración.                        |
| `npm test`                 | Pruebas unitarias (Vitest, una pasada). `npm run test:watch` para el ciclo rojo-verde. |
| `npm run test:integration` | Pruebas contra el emulador de Firestore (reglas, repositorios y configuración).        |

CI (`.github/workflows/ci.yml`) corre exactamente esos comandos en cada PR hacia `dev` y `main`.

## Desarrollo local

En desarrollo la app **nunca toca la nube**: habla con los emuladores de Firestore y Auth bajo el
proyecto `demo-cadence`, que Firebase trata como solo-emulador (no existe en la nube). Hacen falta
dos terminales:

```sh
# Terminal 1: emuladores de Firestore y Auth (Ctrl+C para detenerlos)
npm run emulators

# Terminal 2: la app en http://localhost:4200/
npm start
```

Los datos del emulador se pierden al detenerlo. Hasta que llegue la semilla de la lista de acceso
(capacidad `autenticacion-y-acceso`), un usuario creado en el emulador verá "sin acceso": es el
comportamiento correcto de las reglas, no un fallo.

**Probar contra los datos reales** (proyecto `flash-cards-aca86`): se sirve el build de
producción, que usa `environment.production.ts` y ningún emulador. Nunca con `npm start`.

```sh
npm run build
npx --yes serve@14 -s dist/flash-cards/browser -l 4200
```

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
