# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Todo componente en su carpeta con cuatro archivos. Cero literales de color, fuente, sombra o duración en `src/app`. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Cerebro: formato de versión, tema y conectividad (unitarias)

- [ ] 1.1 Escribir en rojo `src/app/services/version/version-format.spec.ts` (`formatVersionLine('0.4.0', '99ed108')` → `v0.4.0 · 99ed108`; `formatBuildDate('2026-07-02T16:47:00Z', 'America/Bogota')` → `02/07/2026 11:47`; sin zona usa la del dispositivo) y verificar que falla; implementar `version-format.ts` con `Intl.DateTimeFormat` y verificar que pasa.
- [ ] 1.2 Crear `src/app/domain/models/theme-preference.ts` (`ThemePreference`, `isThemePreference`) y `src/app/domain/ports/theme.port.ts` (`ThemePort` abstracto con `apply` y `remembered`); escribir en rojo `src/app/services/theme/theme.service.spec.ts` con `src/app/testing/fake-theme-port.ts` (arranca con lo recordado; inválido o nulo → `system`; cambiar `preference` llama a `apply` con el valor) y verificar que falla; implementar `theme.service.ts` y verificar que pasa.
- [ ] 1.3 Escribir en rojo `src/app/infrastructure/browser/document-theme.adapter.spec.ts` (jsdom: `apply('dark')` fija `data-theme="dark"` y guarda en `localStorage`; `apply('system')` quita el atributo; `remembered()` devuelve lo guardado y `null` si es inválido; un `localStorage` que lanza no rompe y avisa por `Logger`) y verificar que falla; implementar el adaptador y verificar que pasa.
- [ ] 1.4 Crear `src/app/domain/ports/connectivity.port.ts` (`ConnectivityPort` con `online: Signal<boolean>`) y `src/app/testing/fake-connectivity.ts`; escribir en rojo `src/app/infrastructure/browser/navigator-connectivity.adapter.spec.ts` (jsdom: valor inicial de `navigator.onLine`; despachar `offline` y `online` en `window` cambia la señal; se deja de escuchar al destruir) y verificar que falla; implementar el adaptador y verificar que pasa.

## 2. Componentes compartidos de estado e icono

- [ ] 2.1 Escribir en rojo `src/app/shared/icon/icon.component.spec.ts` (los diez nombres del catálogo renderizan un `<svg>` con `aria-hidden="true"` y `stroke="currentColor"`; tamaños `sm`/`md`) y verificar que falla; crear `IconComponent` (cuatro archivos) y verificar que pasa.
- [ ] 2.2 Escribir en rojo `src/app/shared/empty-state/empty-state.component.spec.ts` (solo título; título + mensaje + acción proyectada en ese orden) y verificar que falla; crear `EmptyStateComponent` y verificar que pasa.
- [ ] 2.3 Escribir en rojo `src/app/shared/error-state/error-state.component.spec.ts` (`role="alert"`; título por defecto "Algo salió mal" desde `error-state.copy.ts`; mensaje opcional; "Reintentar" emite `retry`) y verificar que falla; crear `ErrorStateComponent` y verificar que pasa.
- [ ] 2.4 Escribir en rojo `src/app/shared/skeleton/skeleton.component.spec.ts` (`lines` bloques, `aria-busy="true"`, bloques `aria-hidden`, sin texto; variante `card`) y verificar que falla; crear `SkeletonComponent` con la animación definida por tokens en `styles.scss` y verificar que pasa.
- [ ] 2.5 Escribir en rojo `src/app/shared/version-footer/version-footer.component.spec.ts` (pinta las dos líneas a partir de `APP_VERSION` y `BUILD_INFO`; con commit `sin-git` lo muestra) y verificar que falla; crear `core/app-version.ts` (importa `package.json`) y `VersionFooterComponent` y verificar que pasa, sin colocarlo en ninguna pantalla.

## 3. Diálogos por servicio sobre el CDK

- [ ] 3.1 Escribir en rojo `src/app/shared/dialog/dialog.service.spec.ts` con un componente de prueba que inyecta `AppDialogRef` y `DIALOG_DATA`: `role="dialog"`, `aria-modal`, `aria-label`; el foco pasa al primer control y vuelve al botón de origen al cerrar; Escape resuelve `closed` con `undefined`; tras `setPending(true)` Escape no cierra y el contenedor lleva `aria-busy="true"`; clic en el backdrop no cierra; `close('ok')` resuelve `'ok'`; `size: 'lg'` aplica la clase `dialog-lg`; `html` lleva la clase de scroll bloqueado del CDK. Verificar que falla.
- [ ] 3.2 Implementar `dialog.service.ts` (`DialogService`, `AppDialogRef`, re-export de `DIALOG_DATA`) sobre `@angular/cdk/dialog` según el design 6, y las clases `dialog-backdrop`, `dialog-sm|md|lg` en `styles.scss` (acrílico `glass`, `shadow-card`, `lg` con `max-height: 90dvh` y scroll interno); verificar que 3.1 pasa y que `npm run lint` no acusa literales.

## 4. Caparazón, navegación e indicador sin conexión

- [ ] 4.1 Escribir en rojo `src/app/features/shell/offline-indicator/offline-indicator.component.spec.ts` con `FakeConnectivity` (sin red: `role="status"` con el texto exacto de la spec; con red: no existe) y verificar que falla; crear el componente (superficie `glass-soft`) y `shell.copy.ts` con el texto, y verificar que pasa.
- [ ] 4.2 Escribir en rojo `src/app/features/shell/pending-page/pending-page.component.spec.ts` (muestra "Pronto" y el mensaje provisional mediante `EmptyStateComponent`) y verificar que falla; crear el componente y verificar que pasa.
- [ ] 4.3 Añadir a `styles.scss` los tokens `--content-max-width` y la utilidad `safe-bottom`; escribir en rojo `src/app/features/shell/main-nav/main-nav.component.spec.ts` con `RouterTestingHarness` (cuatro enlaces en orden con icono y etiqueta; `aria-label="Navegación principal"`; marca "Cadence" con icono `spark`; `/progreso` → `aria-current="page"` solo en Progreso y `--nav-index: 2`; `/biblioteca/b1/c1` → Biblioteca activa; `/importar` → ninguno activo y `--nav-index: -1`) y verificar que falla; crear `MainNavComponent` (acrílico `glass`, píldora con `--duration-base`, variantes `md:`) y verificar que pasa.
- [ ] 4.4 Escribir en rojo `src/app/features/shell/shell/shell.component.spec.ts` (contiene la navegación, el indicador sin conexión cuando no hay red, un `router-outlet`; no contiene el pie de versión) y verificar que falla; crear `ShellComponent` (`h-dvh`, `main` único con scroll y `max-w-(--content-max-width)`) y verificar que pasa.

## 5. Rutas, transición de vista y arranque

- [ ] 5.1 Escribir en rojo `src/app/app.routes.spec.ts` con `RouterTestingHarness` (`/` → `/hoy`; `/esto-no-existe` → `/hoy`; `/hoy`, `/biblioteca`, `/importar`, `/biblioteca/b1`, `/biblioteca/b1/c1`, `/progreso` y `/ajustes` pintan la página provisional dentro del shell con la navegación presente; `/login`, `/sin-acceso`, `/repaso` y `/practicar` la pintan sin navegación) y verificar que falla.
- [ ] 5.2 Crear `app.routes.ts` según el design 1 (todas las hojas con `loadComponent` perezoso a `PendingPageComponent`) y registrar en `app.config.ts` `provideRouter(routes, withViewTransitions())`; reescribir `app.html` para que `App` pinte solo `<router-outlet>` y actualizar `app.spec.ts`; verificar que 5.1 pasa.
- [ ] 5.3 Añadir a `styles.scss` las reglas de View Transitions con `--duration-view` y su anulación bajo `prefers-reduced-motion`; enlazar en `provide-core.ts` `ThemePort` → `DocumentThemeAdapter`, `ConnectivityPort` → `NavigatorConnectivityAdapter` y el `provideAppInitializer` que instancia `ThemeService`; verificar `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` (anotar el tamaño inicial del bundle).

## 6. Pruebas estáticas del sistema visual y la accesibilidad base

- [ ] 6.1 Escribir `tests/static/no-literal-tokens.spec.ts` (ningún archivo de `src/app` contiene colores hexadecimales, `rgb(`, `hsl(` ni `font-family`; `styles.scss` define las familias de tokens de la spec y `--color-danger` separado de `--color-rating-again`) y verificar que pasa; si acusa un literal, corregir el componente, no la prueba.
- [ ] 6.2 Escribir `tests/static/theme-css.spec.ts` (`[data-theme='light']`, `prefers-color-scheme: light` guardado por `:not([data-theme='dark'])`, `prefers-reduced-transparency`, `prefers-reduced-motion` con `::view-transition`), `tests/static/fonts.spec.ts` (sin dominios externos de fuentes; `@fontsource/plus-jakarta-sans` importado) y `tests/static/accessibility-base.spec.ts` (`:focus-visible` con `outline: 2px`, `noscript` con el texto exacto, `lang="es"`, `viewport-fit=cover`) y verificar que pasan con `npm run test:integration`.

## 7. Verificación manual y documentación

- [ ] 7.1 (Manual) `npm run emulators` + `npm start`: en un teléfono o con el emulador de dispositivo del navegador, la barra inferior respeta la zona segura y la píldora se desliza; en escritorio la barra es lateral con la marca y el contenido queda centrado; con "Offline" aparece el indicador y desaparece al volver; con reducir movimiento la píldora y la transición de vista son instantáneas; con reducir transparencia la navegación es sólida; `data-theme` cambia al llamar a `ThemeService` desde la consola. Anotar el resultado en el mensaje del commit.
- [ ] 7.2 Actualizar `README.md` (estructura de `features/shell` y `shared`, cómo abrir un diálogo y cómo pintar los cuatro estados de una pantalla) y anotar en `MEMORY.md` el cierre del change con el tamaño del bundle.

## 8. Verificación final

- [ ] 8.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` y verificar que todos terminan en verde con `git status` limpio.
- [ ] 8.2 `/opsx:archive navegacion-y-shell` (spec base sincronizada con el delta) y un único commit de cierre `feat(navegacion-y-shell): …` con el código, las pruebas y el archive; push de respaldo de la rama sin abrir PR. Verificar con `git log --oneline -1` y `git status` limpio.
