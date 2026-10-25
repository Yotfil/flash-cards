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
- `shared/`: `icon` (catálogo en `ICON_NAMES`), `empty-state`, `error-state`, `skeleton`, `dialog`,
  `confirm-dialog` y `menu/action-menu`.

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

**Confirmar una acción que no se deshace.** `ConfirmDialogComponent` (`shared/confirm-dialog`)
recibe la acción y la ejecuta él mismo: muestra el texto de progreso ("Borrando…"), queda ocupado,
y solo se cierra (con `true`) si la acción termina bien; si falla, sigue abierto con el error para
reintentar. Sin red, confirmar está deshabilitado; cancelar no.

```ts
inject(DialogService).open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
  label: '¿Borrar este libro?',
  size: 'sm',
  data: {
    title,
    message,
    detail,
    confirmLabel: 'Borrar',
    pendingLabel: 'Borrando…',
    errorMessage,
    action: () => books.remove(id),
  },
});
```

**Menú de acciones de una fila.** `ActionMenuComponent` (`shared/menu/action-menu`) es el botón
`⋯` con su menú del CDK (teclado, Escape devuelve el foco): recibe `label` (nombre accesible, p. ej.
"Acciones de «to give up»"), `items` (`{ id, label, icon, destructive? }`) y `disabled`, y solo
emite `selected(id)`; la fila decide qué hacer. Su panel es sólido (`menu-panel` en `styles.scss`)
porque flota sobre filas de acrílico.

**Altas y bajas que mueven el contador del libro.** `writeInCountedBatches`
(`infrastructure/firestore/counted-batch.ts`) trocea las operaciones en grupos de
`MAX_BATCH_SIZE - 2` (448): cada grupo es un lote atómico que además suma o resta esas tarjetas del
`cardCount` del libro, con una operación final opcional (`trailing`) que solo va en el último
lote. Si un lote falla, el contador sigue cuadrando con lo que de verdad se escribió. Lo usan el
alta y el borrado de tarjetas y el borrado de un capítulo. Como el borrado de tarjetas va por ids
concretos, un corte a mitad se traduce en `PartialDeletionError(deletedIds)` (dominio): el servicio
quita esas tarjetas de la lista y las descuenta, y reintentar pide solo las que faltan (repetir los
mismos ids las descontaría dos veces).

**Borrados en cascada.** Borrar un libro borra sus tarjetas y capítulos con `BatchWriter` y el
libro en el último lote. Borrar un capítulo borra sus tarjetas con `writeInCountedBatches` y el
capítulo como operación final; reintentar vuelve a consultar lo que queda. El historial de repasos
nunca se borra.

**Programación espaciada.** ts-fsrs entra solo por `SchedulingPort` (`domain/ports/scheduling.port.ts`),
de una sola operación pura: `preview(scheduling, now)` devuelve, para cada grado 1-4, el nuevo
bloque de programación, los días enteros (0 mientras vence en minutos), el vencimiento exacto y
los valores para el historial. `now` es obligatorio: la sesión previsualiza al mostrar la tarjeta
(informativo) y vuelve a calcular con el instante de la calificación, que es lo que se guarda (su
último repaso es ese instante). El adaptador (`infrastructure/scheduling/ts-fsrs-scheduling.adapter.ts`)
no usa Angular y se prueba con fechas fijas; `FakeSchedulingPort` (`testing/`) sirve a quien lo
consuma. `formatInterval(due, now)` (`services/scheduling/`) da el texto de cada cerebro desde el
vencimiento exacto ("1 min", "10 min", "2 h", "6 días", "1 mes"). La app usa los parámetros por
defecto de ts-fsrs; `tests/static/ts-fsrs-defaults.spec.ts` falla si una actualización los cambia.

**Cola diaria.** El día de estudio no rueda a medianoche sino a la hora de inicio del perfil
(`services/study-day/`: `studyDayId`, `endOfStudyDay`, `studyDayAt`, `formatLocalDate`), en su
zona horaria. "Lista" significa lo mismo en todas partes (`services/queue/ready-cards.ts`): no
suspendida y con vencimiento hasta el fin del día de estudio (una nueva vence al crearse); lo usan
Hoy, "Estudiar este libro", "Estudiar este capítulo" y el "N listas" de cada capítulo.
`buildDailyQueue` (puro) aplica los topes de cada libro: la **cola base** (la que ve Progreso) y la
**cola de la sesión**, que suma el ajuste de nuevas de hoy **por libro** (nunca toma nuevas de otro
libro). `DailyQueueService` lee una vez por entrada a Hoy (`refresh`: libros, listas e indicadores
del día) y deriva ambas colas en memoria; el ajuste vive en memoria ligado al día de estudio. La
racha se calcula al vuelo desde los indicadores de los últimos 60 días (`computeStreak`), en un
recurso aparte: si falla se omite sin tumbar la cola. Quien prepara una sesión la deja en
`StudyHandoffService` (`hand`/`take`, una sola entrega) y navega a `/repaso`; el botón compartido
es `StudyLaunchButtonComponent` (`features/estudio/`).

**Sesión de repaso.** Es efímera: `/repaso` solo se abre con una lista entregada en
`StudyHandoffService` (si no, `studyHandoffGuard` lleva a Hoy), la pantalla la consume al entrar y
cada entrada arranca de cero. El núcleo es puro (`services/review/review-session-state.ts`): la
unidad es la **aparición**, y tras calificar una tarjeta que **sigue lista** para hoy vuelve al
final como aparición nueva; si no, sale. El guardado es **optimista**: `ReviewSessionService.grade`
avanza al instante y envía sin esperar un lote atómico (`GradePersistencePort`: tarjeta, historial
e indicadores del día) que el SDK guarda en el dispositivo y sincroniza al volver la red; si el
servidor lo rechaza, la tarjeta vuelve al final con su programación anterior y un aviso. Dos
tiempos: la **latencia de recuerdo** (mostrar → revelar) solo sugiere un grado; la **duración del
repaso** (mostrar → calificar) se guarda en cada registro. El cierre cuenta las tarjetas distintas
y las calificaciones por grado, y deja el hueco `[practice]` para la práctica con IA.

**Importar.** "Un archivo = un libro" (`/importar`) o pegar en un capítulo ("Importar tarjetas").
La convención, línea a línea: `# Nombre` abre un capítulo; `anverso | reverso` (o separado por
tabulador) es una tarjeta básica; un texto con huecos `{{así}}` es una cloze; y `::` con un
espacio a cada lado añade un ejemplo al final (`to give up | rendirse :: I gave up smoking.`). El parser
(`services/import/parse-import-text.ts`) valida con los mismos esquemas Zod que los formularios y
nunca aborta: cada línea que no entra se omite con su motivo y su número, y la previsualización lo
muestra antes de escribir nada. El libro se escribe en lotes con su documento en el último (nunca
aparece a medias) y, si un lote falla, se borra lo escrito; reemplazar un capítulo es atómico si
cabe en un lote (`writeInCountedBatches` con delta por operación).

**Tarjeta nueva.** La programación inicial (`initialCardScheduling`, `domain/models/card-scheduling.ts`)
vive en el dominio, sin depender de ts-fsrs: una tarjeta nueva nace con estado `New`, vence al
crearse y sin repasos. `programacion-espaciada` comprueba que equivale a la de ts-fsrs.

**Pantallas que dependen de dos lecturas.** El detalle de capítulo decide qué pintar con
`resolveChapterDetail` (`services/chapters/chapter-detail-state.ts`), una función pura sobre los
recursos de libros y de capítulos: error de libros, cargando, libro inexistente, error de
capítulos, capítulo inexistente o listo, en ese orden.

**Pintar una pantalla que lee datos.** El servicio expone un `resource()` de Angular y la
plantilla distingue cuatro estados; un fallo nunca se pinta como vacío. Las mutaciones locales
(`books.update(...)`) dejan el recurso en estado `local`, que se pinta como `resolved`
(ejemplo real: `BibliotecaPageComponent`):

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
