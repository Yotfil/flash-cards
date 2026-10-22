# Design

## Context

Ver `proposal.md` (Why). Estado observado en `dev` al 2026-10-21:

- `app.config.ts` registra `provideRouter([])`, `provideCore()` y el service worker; `App` pinta "Cadence". Tras `plataforma-datos-y-offline` registrará también `provideFirebase()`.
- `src/styles.scss` ya contiene todo el sistema de tokens (familias oscuras, variante clara bajo `prefers-color-scheme: light` guardada por `:not([data-theme='dark'])` y bajo `[data-theme='light']`, `prefers-reduced-transparency`, `prefers-reduced-motion`, utilidades `glass`, `glass-soft`, `press`, anillo de foco). Nadie fija `data-theme` todavía.
- `index.html`: `lang="es"`, `viewport-fit=cover`, `noscript`, `theme-color` por esquema, barra iOS translúcida.
- Verificado en `node_modules`: `resource()` es `@publicApi 22.0`; el router exporta `withViewTransitions`; `@angular/cdk` 22.2.4 exporta `dialog`, `a11y` y `overlay`; Tailwind 4 aplica la variante `hover:` solo bajo `(hover: hover)`.
- Referencia visual aprobada: `docs/design/cadence-prototipo-extendido.html` (navegación con píldora, composición de escritorio a 224 px de barra lateral, contenido con padding ancho).
- Código viejo de referencia en `backup/old-version` (`features/shell`, `shared/{empty-state,error-state,icon,modal,version-footer}`): se reescribe con TDD; el modal viejo no gestionaba el foco (hallazgo 2).

Decisiones del explore: hallazgos 1 y 2 y transversales 1 y 2 en `docs/hallazgos-codigo-actual.md`; deltas en su tabla.

## Goals / Non-Goals

**Goals:**
- Que `autenticacion-y-acceso` solo tenga que añadir guards y sustituir `/login` y `/sin-acceso`; que cada sección sustituya su página provisional.
- Que ninguna pantalla posterior tenga que decidir cómo se ve cargar, vacío, error, un diálogo o sin conexión.
- Cumplir el presupuesto de acrílico del ADR 0003 en el propio caparazón.

**Non-Goals:**
- Guards, sesión, perfil y el control de tema.
- Un diálogo de confirmación genérico (lo trae `libros`, primer caso real).
- Pruebas automatizadas de layout responsive (jsdom no calcula layout).

## Decisions

### 1. Mapa de rutas completo con página provisional (`app.routes.ts`, capa raíz; `features/shell/pending-page`)

`app.routes.ts` declara: `''` → `hoy`; el caparazón (`ShellComponent`, `loadComponent`) con hijos `hoy`, `biblioteca`, `importar`, `biblioteca/:bookId`, `biblioteca/:bookId/:chapterId`, `progreso`, `ajustes`; fuera del caparazón `login`, `sin-acceso`, `repaso`, `practicar`; `**` → `''`. Cada hoja carga bajo demanda `PendingPageComponent` (estado vacío con título "Pronto" y mensaje "Esta pantalla llega en un próximo paso."). Cada capacidad sustituye su `loadComponent`; `autenticacion-y-acceso` añade `canActivate`.

*Por qué:* los escenarios de la spec citan `/importar` y las pantallas completas; el branch deploy muestra el caparazón real navegable. *Alternativa descartada:* declarar solo las rutas del caparazón (cada capacidad tocaría el mapa y el shell a la vez).

### 2. Caparazón y navegación (`features/shell/shell`, `features/shell/main-nav`; capa UI)

- `ShellComponent`: contenedor de altura `100dvh` con `flex-col-reverse` en móvil y `md:flex-row` en escritorio; `<main>` es la única región con scroll y centra el contenido con `max-w-(--content-max-width)` y padding; `<router-outlet>` dentro; el indicador sin conexión arriba del contenido.
- `MainNavComponent`: `<nav aria-label="Navegación principal">` con la utilidad `glass` (desenfoque `blur-glass-nav`), zona segura inferior con la utilidad nueva `safe-bottom`, cuatro `<a routerLink>` con `ariaCurrentWhenActive="page"` y `routerLinkActive`, icono encima de la etiqueta en móvil y a la izquierda en escritorio, marca "Cadence" con el icono `spark` visible solo en escritorio. La píldora es un `<span aria-hidden>` absoluto cuya posición se calcula con una variable CSS `--nav-index` (0 a 3, o `-1` = oculta) fijada por el componente a partir de la URL (`Router.events` → `toSignal`, primer segmento); se desliza con `transition` de `--duration-base`, anulada por la regla global de reducir movimiento.
- Los destinos de navegación y sus textos viven en `features/shell/shell.copy.ts` (ADR 0002: copy por feature).

*Por qué CSS y no JS para móvil/escritorio:* las variantes `md:` de Tailwind bastan y jsdom no calcula layout; el único estado en JS es el índice activo.

### 3. Transición entre pantallas (`app.config.ts`)

`provideRouter(routes, withViewTransitions())`. En `styles.scss`, `::view-transition-old(root)` y `::view-transition-new(root)` con `--duration-view` y `--ease-out-soft`; bajo `prefers-reduced-motion`, `::view-transition-group(*)` sin animación. *Alternativa descartada:* animaciones de router de Angular (dependencia de `@angular/animations`, que el ADR 0002 no conserva).

### 4. Tema aplicado (`domain/ports/theme.port.ts`, `services/theme/theme.service.ts`, `infrastructure/browser/document-theme.adapter.ts`)

- Puerto `ThemePort` (clase abstracta): `apply(preference: ThemePreference): void`, `remembered(): ThemePreference | null`. `ThemePreference = 'light' | 'dark' | 'system'` vive en `domain/models/theme-preference.ts`.
- `ThemeService` (capa servicios): signal `preference`, al construirse lee `remembered()` (inválido → `system`) y cada cambio llama a `apply`. Es la única pieza que `ajustes-de-usuario` conectará al perfil.
- `DocumentThemeAdapter` (infrastructure): `apply` fija `document.documentElement.dataset['theme']` (`light`/`dark`) o lo quita (`system`) y guarda la preferencia en `localStorage` bajo una clave única; `remembered` la lee y valida. Lecturas y escrituras de `localStorage` dentro de `try/catch` con aviso por `Logger` (modo privado puede lanzar).
- Arranque sin destello: `provideCore` registra un `provideAppInitializer` que instancia `ThemeService` antes del primer render.
- Fake `testing/fake-theme-port.ts`.

*Por qué puerto y no acceso directo al DOM desde el servicio:* `services` no toca el navegador (capas por ESLint); el fake deja probar el servicio sin DOM.

### 5. Conectividad (`domain/ports/connectivity.port.ts`, `infrastructure/browser/navigator-connectivity.adapter.ts`, `features/shell/offline-indicator`)

- Puerto `ConnectivityPort`: `readonly online: Signal<boolean>`.
- Adaptador: `navigator.onLine` inicial y eventos `online`/`offline` del `window` (escuchados con `DestroyRef` para limpiar).
- `OfflineIndicatorComponent`: `@if (!online())` pinta `<p role="status">` con el texto de la spec, superficie `glass-soft` (segunda capa permitida junto a la navegación; no anima). Lo inyecta el `ShellComponent` a través del puerto (la UI inyecta puertos del dominio; no hay lógica que justifique un servicio).
- Fake `testing/fake-connectivity.ts` con `setOnline(boolean)`.

*Por qué no el estado de sincronización de Firestore:* el SDK no lo expone de forma estable y "sin red" es la señal que el usuario entiende; Firestore encola solo.

### 6. Diálogos por servicio sobre el CDK (`shared/dialog/dialog.service.ts`, `shared/dialog/dialog-panel.css` vía tema)

- `DialogService.open<TResult, TData = void>(component, { label, size = 'md', data })` envuelve `Dialog` de `@angular/cdk/dialog` con `disableClose: true`, `ariaLabel`, `ariaModal`, `autoFocus: 'first-tabbable'`, `restoreFocus: true`, `panelClass` por tamaño (`dialog-sm`, `dialog-md`, `dialog-lg`), `backdropClass` y la estrategia de scroll bloqueado. Devuelve `AppDialogRef<TResult>` con `closed: Promise<TResult | undefined>`, `close(result?)` y `setPending(boolean)`.
- Escape: el servicio escucha `keydownEvents` del ref y cierra sin resultado solo si no está pendiente. `setPending(true)` además fija `aria-busy="true"` en el contenedor del CDK. El `backdropClick` se ignora.
- El contenido inyecta `AppDialogRef` y `DIALOG_DATA`. Política (transversal 2): el contenido no cierra en `finally`; cierra solo con éxito y muestra el error en su interior si la acción falla.
- Los estilos del panel (acrílico `glass`, radio, sombra `shadow-card`, `max-h-[90dvh]` con scroll interno en `lg`) viven en `styles.scss` como clases `dialog-*`, porque el contenedor lo crea el CDK fuera de cualquier componente nuestro.

*Por qué por servicio:* el CDK resuelve foco, scroll, apilado y `aria-modal` de forma probada; un cascarón declarativo con `ng-content` obligaría a reimplementarlo (hallazgo 2). *Alternativa descartada:* `<dialog>` nativo (sin devolución de foco garantizada en todos los navegadores ni apilado con overlays del CDK).

### 7. Estados reutilizables (`shared/empty-state`, `shared/error-state`, `shared/skeleton`; capa UI)

- `EmptyStateComponent`: `title` obligatorio, `message` opcional, `<ng-content>` para la acción; centrado, sin acrílico (va sobre el contenido).
- `ErrorStateComponent`: `role="alert"`, `title` por defecto "Algo salió mal" (copy en `error-state.copy.ts`), `message` opcional, botón "Reintentar" que emite `retry`.
- `SkeletonComponent`: `lines` (por defecto 3) y `variant` (`text` | `card`), `aria-busy="true"` y `aria-hidden="true"` en los bloques, brillo con animación cuyo nombre y duración salen de tokens; bajo reducir movimiento la regla global lo detiene.

### 8. Contrato del recurso asíncrono (sin código nuevo aquí)

Cada servicio de lectura expone un `ResourceRef<T>` de Angular (`resource()` o `rxResource`) y la pantalla pinta según `status()`: `loading`/`reloading` → `SkeletonComponent`; `error` → `ErrorStateComponent` con `retry → reload()`; `resolved` con lista vacía → `EmptyStateComponent`; `resolved` con datos → contenido. Primer uso real en `autenticacion-y-acceso` (perfil) y `libros` (lista). Si al tercer consumidor la condición de vacío se repite igual, se extrae un `computed` compartido (segundo caso real, no antes).

### 9. Icono y pie de versión (`shared/icon`, `shared/version-footer`, `core/app-version.ts`)

- `IconComponent`: `name` (catálogo de la spec), `size`; SVG inline por `@switch`, `aria-hidden="true"`, `stroke="currentColor"`, trazo 1.8 como en el prototipo.
- `VersionFooterComponent` pinta `formatVersionLine(version, commit)` y `formatBuildDate(isoDate, timeZone?)` de `services/version/version-format.ts` (funciones puras; `timeZone` por defecto la del dispositivo). `core/app-version.ts` importa `package.json` (`resolveJsonModule`); `BUILD_INFO` sigue generándose en `core/build-info.ts`. El componente no se coloca en ninguna pantalla en este change.

### 10. Tokens nuevos en `styles.scss`

`--content-max-width: 760px` (en `@theme`, para `max-w-(--content-max-width)`), utilidad `safe-bottom` (`padding-bottom: env(safe-area-inset-bottom)`), las clases `dialog-sm|md|lg` y `dialog-backdrop`, la animación del esqueleto y las reglas de View Transitions. Siguen sin existir literales en `src/app`.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación (móvil y escritorio) | `glass` con `blur-glass-nav` | 1 |
| Indicador sin conexión | `glass-soft`, estático | 2 (solo mientras no hay red) |
| Panel de diálogo | `glass` + `shadow-card`; el fondo oscurecido no desenfoca | sustituye a cualquier lista de acrílico mientras está abierto |
| Área de contenido, página provisional, estados vacío/error/esqueleto | sólidas o sin fondo propio | 0 |

Con `prefers-reduced-transparency` las tres primeras se vuelven sólidas por los tokens ya definidos. Ninguna superficie de vidrio anima (la píldora de la navegación es un tinte de acento, no vidrio).

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `app.routes.ts` con `loadComponent` por ruta y `PendingPageComponent` | Cada capacidad sustituye su ruta; `autenticacion-y-acceso` añade guards |
| `DialogService.open(component, { label, size, data })` → `AppDialogRef<T>` (`closed`, `close`, `setPending`), `DIALOG_DATA` | Formularios de libro, capítulo, tarjeta, ajustes por libro, importación, confirmaciones |
| Política: el diálogo solo se cierra con éxito | `libros` (ConfirmDialog) y todos los formularios |
| `EmptyState`, `ErrorState` (`retry`), `Skeleton` + contrato de `resource()` (decisión 8) | Toda pantalla que lee datos |
| `ThemeService.preference` (signal escribible) y `ThemePort` | `ajustes-de-usuario` conecta el perfil |
| `ConnectivityPort.online` y `OfflineIndicatorComponent` | `sesion-de-repaso` puede reutilizar el indicador a pantalla completa |
| `IconComponent` con catálogo ampliable | Todas las pantallas |
| `VersionFooterComponent` y `formatBuildDate` | `ajustes-de-usuario` lo coloca al final |
| `shell.copy.ts` como patrón de copy por feature | Todas las features |
| Fakes `FakeThemePort`, `FakeConnectivity` en `testing/` | Specs de pantallas |

## Plan de pruebas

Componentes con Vitest + jsdom (builder de Angular), rutas con `RouterTestingHarness`, estáticas en `tests/static/` (runner Node de `test:integration`).

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Las cuatro secciones siempre disponibles; Rutas de cada sección | `shell.component.spec`: cuatro enlaces en orden con icono y etiqueta, `aria-label` de la región; `app.routes.spec`: navegar a cada destino cambia la URL y pinta la página provisional | componente |
| Móvil; Escritorio; El contenido largo no desplaza la navegación | Manual en el branch deploy (teléfono y escritorio); Playwright al cerrar la paridad. La plantilla fija `h-dvh`, `overflow-y-auto` solo en `main` y variantes `md:` | manual |
| Sección activa; Ruta hija mantiene la sección activa; Ruta sin destino propio | `shell.component.spec` con `RouterTestingHarness`: `/progreso` → `aria-current="page"` solo en Progreso y `--nav-index: 2`; `/biblioteca/b1/c1` → Biblioteca activa; `/importar` → ninguno activo y `--nav-index: -1` | componente |
| Detalle de libro dentro del caparazón | `app.routes.spec`: `/biblioteca/b1` renderiza dentro del shell (la navegación está presente) | componente |
| Abrir la app; URL inexistente | `app.routes.spec`: `/` → `/hoy`; `/esto-no-existe` → `/hoy` | componente |
| Repaso sin distracciones; Practicar a pantalla completa | `app.routes.spec`: `/repaso` y `/practicar` no renderizan la navegación | componente |
| Vacío con acción; Vacío solo con título | `empty-state.component.spec` | componente |
| Error con reintento; Título por defecto | `error-state.component.spec`: `role="alert"`, título por defecto, `retry` emite | componente |
| Pantalla cargando; Reducir movimiento (esqueleto) | `skeleton.component.spec`: N bloques, `aria-busy`, sin texto; la quietud la da la regla global (estática: `styles.scss` contiene el bloque de reducir movimiento) | componente + estática |
| Fallo de lectura; Reintentar repite la lectura | Contrato (decisión 8); primera prueba real en `autenticacion-y-acceso` y `libros` | diferido |
| Icono dentro de un texto de acento | `icon.component.spec`: `aria-hidden`, `stroke="currentColor"`, tamaños, los diez nombres renderizan un `<svg>` | componente |
| Foco al abrir y al cerrar; Escape cierra; Escape bloqueado; Tocar el fondo no cierra; Resultado al cerrar; Tamaño grande | `dialog.service.spec` con un componente de prueba: foco en el primer control y vuelta al botón de origen; `role="dialog"`, `aria-modal`, `aria-label`; Escape resuelve `undefined`; con `setPending(true)` Escape no cierra y `aria-busy="true"`; clic en el backdrop no cierra; `close('ok')` resuelve `'ok'`; `size: 'lg'` aplica `dialog-lg`; `html` lleva la clase de scroll bloqueado del CDK | componente |
| La acción falla (diálogo permanece) | Política; se prueba con el primer diálogo real en `libros` | diferido |
| Contenido del pie; Build sin git | `version-format.spec`: `formatVersionLine('0.4.0','99ed108')` y `formatBuildDate('2026-07-02T16:47:00Z','America/Bogota')` → `02/07/2026 11:47`; `version-footer.component.spec` pinta `sin-git` cuando el commit es `sin-git` | unitaria pura + componente |
| El caparazón no lo pinta | `shell.component.spec`: no existe el pie de versión en el DOM del shell | componente |
| Cambiar la identidad; Sin literales en los componentes | `tests/static/no-literal-tokens.spec.ts`: ningún archivo de `src/app` contiene `#[0-9a-fA-F]{3,8}` ni `rgb(` ni `font-family`; `styles.scss` define las familias de tokens de la spec | estática |
| Preferencia del sistema en claro/oscuro; Tema oscuro fijado; Tema claro forzado; Reducir transparencia | `tests/static/theme-css.spec.ts`: `styles.scss` contiene `[data-theme='light']`, el bloque `prefers-color-scheme: light` guardado por `:not([data-theme='dark'])` y `prefers-reduced-transparency`; manual con los conmutadores del sistema | estática + manual |
| Aplicar oscuro; Volver a sistema; Arranque con preferencia recordada; Valor recordado inválido | `theme.service.spec` con `FakeThemePort`; `document-theme.adapter.spec` (jsdom): atributo y `localStorage`, valor inválido ignorado, `localStorage` que lanza no rompe | unitaria pura + unitaria DOM |
| Se pierde la conexión; Vuelve la conexión | `offline-indicator.component.spec` con `FakeConnectivity`: aparece `role="status"` con el texto exacto y desaparece; `navigator-connectivity.adapter.spec` (jsdom): `online`/`offline` despachados en `window` cambian la señal | componente + unitaria DOM |
| Estado activo usa el acento; Botón principal | `shell.component.spec`: el enlace activo lleva la clase del token de acento; el botón principal es de `libros`/`cola-diaria` (sus specs) | componente + diferido |
| Botón de borrar (peligro) | `tests/static/no-literal-tokens.spec.ts`: `--color-danger` y `--color-rating-again` definidos por separado; uso en `libros` | estática + diferido |
| Sin red externa (fuente) | `tests/static/fonts.spec.ts`: `index.html` y `styles.scss` sin dominios de fuentes externos; `@fontsource/plus-jakarta-sans` importado | estática |
| Navegación por teclado; Reducir movimiento; Sin JavaScript | `tests/static/accessibility-base.spec.ts`: `:focus-visible` con `outline: 2px`, bloque `prefers-reduced-motion`, `noscript` con el texto exacto, `lang="es"` y `viewport-fit=cover` | estática |

## Risks / Trade-offs

- [jsdom no calcula layout ni `backdrop-filter`] → responsive y acrílico se verifican a mano en el branch deploy; las pruebas aseguran estructura, atributos y clases.
- [View Transitions no está en todos los navegadores] → el router degrada a cambio instantáneo sin error; aceptado.
- [`localStorage` bloqueado o lleno] → `try/catch` con aviso por `Logger`; la app sigue en `system`.
- [El contenedor del CDK no es un componente nuestro] → sus estilos viven en el archivo de tema como clases `dialog-*`; sigue sin haber literales en componentes.
- [Dos capas de vidrio cuando hay indicador sin conexión y un diálogo abierto] → el diálogo tapa el indicador con el backdrop; el presupuesto se respeta porque la lista de acrílico (futura) queda cubierta.
- [`RouterTestingHarness` con `loadComponent` perezoso] → las pruebas de rutas esperan a `harness.navigateByUrl`; jsdom resuelve los `import()` en memoria.

## Migration Plan

Segundo commit de la rama única `feature/reescritura-cadence` en la fase B, sobre el de `plataforma-datos-y-offline`. Sin datos. Rollback: revertir el merge.
