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
| `npm run emulators`        | Emuladores locales de Firestore (`:8080`) y Auth (`:9099`), con datos persistentes.    |
| `npm run seed:allowlist`   | Autoriza un correo en la lista del emulador: `npm run seed:allowlist -- correo`.       |
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

Los datos del emulador **persisten entre arranques**: al detenerlo con Ctrl+C se exportan a
`.emulator-data/` (ignorada por git) y se importan al volver a arrancar. Borra esa carpeta para
empezar de cero.

La app está en **acceso anticipado**: solo entra quien tiene su correo en la colección `allowlist`.
En el emulador, autoriza un correo una vez (con los emuladores corriendo):

```sh
npm run seed:allowlist -- prueba@ejemplo.com
```

Después crea la cuenta con ese correo en `http://localhost:4200/login`, o entra con
"Continuar con Google": el emulador abre una ventana falsa donde se elige o inventa la cuenta.
Un correo fuera de la lista no crea cuenta; uno de Google fuera de la lista se borra al instante
y la app muestra "sin acceso".

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

## Acceso anticipado en producción

- La lista vive en la colección **`allowlist`** (en minúsculas) del proyecto real. Cada documento
  tiene como id el correo EXACTO con el que la persona entra (Google lo entrega en minúsculas) y se
  crea a mano desde la consola de Firebase; la app nunca escribe en ella.
- Las reglas permiten comprobar un correo exacto sin sesión (para detener un registro no
  autorizado antes de crear la cuenta) y prohíben listar la colección. Al publicar un release que
  cambie `firestore.rules`, despliégalas con `firebase deploy --only firestore:rules`.

## Caparazón y piezas compartidas

- `src/app/app.routes.ts`: el mapa de rutas completo. Cada pantalla carga bajo demanda y, mientras
  su capacidad no llega, pinta `PendingPageComponent`; cada change sustituye su `loadComponent`.
- `features/shell/`: el caparazón (`shell`), la navegación (`main-nav`), el indicador sin conexión
  (`offline-indicator`), la página provisional (`pending-page`), el pie de versión
  (`version-footer`, lo coloca Ajustes) y `shell.copy.ts` con los textos y destinos.
- `shared/`: `icon` (catálogo en `ICON_NAMES`), `empty-state`, `error-state`, `skeleton` y `dialog`.

**Abrir un diálogo.** El contenido es un componente que inyecta `AppDialogRef` y `DIALOG_DATA`; solo
se cierra con éxito (si su acción falla, se queda abierto mostrando el error):

```ts
const ref = inject(DialogService).open<Book, { bookId: string }>(BookFormDialogComponent, {
  label: 'Editar libro', // nombre accesible, obligatorio
  size: 'md', // 'sm' | 'md' | 'lg'
  data: { bookId },
});
const saved = await ref.closed; // undefined si se canceló
// Dentro del contenido: dialogRef.setPending(true) mientras guarda; dialogRef.close(resultado).
```

**Guardar ajustes.** Los controles de elección (casilla, selector, tema) guardan al tocar con
`createImmediateSetting` (`features/ajustes/immediate-setting.ts`): el valor nuevo se ve al
instante, el control queda deshabilitado mientras guarda y, si falla, vuelve al valor guardado con
"No se pudo guardar. Inténtalo de nuevo." junto a él. Los campos de texto guardan con su propio
botón "Guardar", deshabilitado si no hay cambios. Sin red, nada se guarda: la pantalla deshabilita
esos controles y muestra una sola vez `NEEDS_CONNECTION_MESSAGE` (`shared/text/connection.copy.ts`).

**Pintar una pantalla que lee datos.** El servicio expone un `resource()` de Angular y la
plantilla distingue cuatro estados; un fallo nunca se pinta como vacío:

<!-- prettier-ignore -->
```html
@switch (books.status()) {
  @case ('loading') { <app-skeleton [lines]="4" /> }
  @case ('reloading') { <app-skeleton [lines]="4" /> }
  @case ('error') { <app-error-state (retry)="books.reload()" /> }
  @default {
    @if (books.value()?.length) { <!-- contenido --> }
    @else { <app-empty-state title="Tu biblioteca está vacía" /> }
  }
}
```

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
