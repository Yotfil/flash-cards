# Design

## Context

Ver `proposal.md` (Why). Estado esperado de `dev` cuando este change se ejecute (tras `autenticacion-y-acceso`):

- `SessionService` con `state`, `user()` (perfil cargado, `UserSettings` completo gracias a los defaults del esquema), `signOut()`; `UserRepository.save(user)`; `requireSessionUser`. `DEFAULT_NEW_CARDS_PER_DAY` en `domain/models/study-defaults.ts`; `ThemePreference` en `domain/models/theme-preference.ts`.
- `ThemeService.preference` (signal escribible, aplica al documento y recuerda en el navegador), `VersionFooterComponent`, `IconComponent`, `ErrorState`, utilidades `glass-soft` y `press`, patrón de copy por feature, `requireSessionGuard` sobre `/ajustes`, `PendingPageComponent` en `/ajustes`.
- Signal Forms + `validateStandardSchema` ya estrenados en la pantalla de acceso con `authFormSchema`.
- Verificado en Node 24: `Intl.supportedValuesOf('timeZone')` devuelve 418 zonas; `Intl.DateTimeFormat().resolvedOptions().timeZone` la del dispositivo. jsdom expone las mismas API de `Intl`.
- Código viejo de referencia en `backup/old-version/src/app/features/ajustes`: dos controles (número con Guardar, casilla inmediata), fallo de la casilla solo en consola, `updateSettings` en `AuthService`.

## Goals / Non-Goals

**Goals:**
- Una regla de guardado que cualquier ajuste futuro (Práctica con IA) pueda seguir sin pensar.
- Que `libros` solo tenga que leer `user().settings.defaultNewCardsPerDay` y reutilizar `boundedInteger`.
- Que el tema del perfil y el del documento nunca discrepen con sesión activa.

**Non-Goals:**
- Nuevos ajustes que no existan ya en el perfil.
- Diálogos: Ajustes no abre ninguno.

## Decisions

### 1. `SessionService.updateSettings(changes: Partial<UserSettings>)` (capa servicios)

Se añade al servicio de sesión, no a un servicio nuevo: es el único dueño del signal de usuario y así "la sesión refleja el cambio al instante" sale gratis. Flujo: `requireSessionUser(user())` → `merged = { ...user, settings: { ...user.settings, ...changes } }` → `userRepository.save(merged)` → `state.set({ kind: 'active', user: merged })`. Si `save` lanza, el estado no cambia y el error sube a la pantalla. *Alternativa descartada:* `SettingsService` aparte con `SessionService.replaceUser()`: dos dueños del mismo dato.

### 2. Sincronía perfil → tema en `services/settings/profile-theme-sync.ts`

Clase inyectable `ProfileThemeSync` con un `effect`: cuando `session.state()` es `active`, `themeService.preference.set(user.settings.theme)`. Se arranca desde `provideCore` con `provideAppInitializer` (igual que `ThemeService`). Así el perfil manda sobre lo recordado en el navegador y la pantalla Ajustes no necesita sincronizar nada al cargar. Al cambiar el tema desde Ajustes, la pantalla llama primero a `themeService.preference.set(nuevo)` (se ve al tocar) y luego a `updateSettings({ theme })`; si falla, repone el anterior en ambos.

### 3. Helper de guardado inmediato `features/ajustes/immediate-setting.ts` (puro, capa UI)

`createImmediateSetting<T>(persisted: () => T, save: (value: T) => Promise<void>, logger: Logger)` devuelve `{ value: Signal<T>; saving: Signal<boolean>; error: Signal<string | null>; change(value: T): Promise<void> }`: `change` fija `value` optimista, marca `saving`, llama a `save`; en fallo repone `persisted()`, registra en `Logger` y fija `error` con el texto de `ajustes.copy.ts`; en éxito limpia `error`. Lo usan la casilla, los dos selectores y el tema (cuatro casos reales; la abstracción nace con ellos). `error` se pinta con `role="alert"` junto al control.

### 4. Campo numérico con Signal Forms y entero acotado compartido

- `shared/forms/bounded-integer.schema.ts`: `boundedInteger(min, max, message)` = `z.number().int().min(min).max(max)` con el mismo `message` en las tres reglas (y `z.coerce` no: el `<input type="number">` ya entrega número vía `Field`; `NaN` por campo vacío falla `required`).
- `features/ajustes/settings-form.schema.ts`: `{ defaultNewCardsPerDay: boundedInteger(0, 999, 'Escribe un número entre 0 y 999.') }`.
- `form(model, (p) => validateStandardSchema(p, settingsFormSchema))`; `canSave = computed(() => valid && value !== persisted && !saving)`; estado de resultado `idle | saving | saved | error`; cualquier edición vuelve a `idle`.

### 5. Zonas horarias en `services/settings/time-zones.ts` (puro)

`supportedTimeZones(): readonly string[]` (envuelve `Intl.supportedValuesOf('timeZone')`, con la zona guardada añadida si no estuviera en la lista para que el selector nunca la pierda) y `deviceTimeZone(): string`. La pantalla calcula `deviceDiffers = computed(() => deviceTimeZone() !== user.settings.timezone)` y pinta el aviso con la acción "Usar esta zona" que llama a `change(deviceTimeZone())` del mismo helper. Selector nativo `<select>`: 418 opciones funcionan bien con el selector nativo del móvil; sin búsqueda.

### 6. Pantalla `features/ajustes/ajustes-page` (capa UI)

Una sola página con secciones `<section aria-labelledby>`; cada sección una tarjeta `glass-soft`. Controles: casilla nativa; `<select>` para zona y hora (`0..23` → `HH:00`); tema como grupo de tres botones con `role="radiogroup"` y `aria-checked`; campo numérico con `inputmode="numeric"`; "Cerrar sesión" con `signingOut`; `<app-version-footer>` al final. Textos en `ajustes.copy.ts`. Sin subcomponentes: la página tiene cuatro controles y cada uno es un bloque pequeño; si Práctica con IA la hace crecer, se extraen entonces.

### 7. Ruta

`app.routes.ts`: `/ajustes` carga `AjustesPageComponent` en lugar de la página provisional. El guard ya existe.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` (del caparazón) | 1 |
| Tarjetas de sección | `glass-soft` | 2 |
| Controles, avisos, pie de versión | sólidos o sin fondo | 0 |

Sin diálogos ni listas adicionales: el presupuesto de dos capas se cumple. Nada de vidrio anima.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `SessionService.updateSettings(partial)` | `practica-con-ia` (plantilla y tamaño de lote) |
| `boundedInteger(min, max, message)` en `shared/forms` | `libros` (nuevas y máximo de repasos por libro), `importacion`, `practica-con-ia` |
| `createImmediateSetting` como patrón de guardado inmediato con reversión | Ajustes por libro en `libros` |
| `ProfileThemeSync` arrancado en `provideCore` | Nadie más lo toca |
| `supportedTimeZones()`, `deviceTimeZone()` | `cola-diaria` (día de estudio), pruebas |
| `user().settings.defaultNewCardsPerDay` como siembra | `libros`, `importacion` |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Ajustes del perfil nuevo; Perfil creado antes de los ajustes nuevos | Ya cubiertos en `session.service.spec` y `user.repository.integration.spec` de auth; aquí `session.service.spec` añade: `updateSettings` persiste el perfil completo con los defaults rellenados | unitaria pura |
| Datos de la sesión; Orden de las secciones | `ajustes-page.component.spec` con fake de sesión: nombre y correo bajo "Sesión iniciada como"; los cuatro encabezados en orden y el pie al final | componente |
| Precarga del valor actual; Valor fuera de rango; Valor con decimales; Cero es válido | `bounded-integer.schema.spec`: 1000, 2.5, -1 y vacío fallan con el mensaje; 0 y 999 pasan; `ajustes-page.component.spec`: campo precargado con 15; 1000 muestra el texto y no llama a `save`; 0 guarda | unitaria pura + componente |
| Guardado exitoso; Fallo al guardar; Editar tras guardar; Botón Guardar sin cambios | `ajustes-page.component.spec`: botón deshabilitado con valor igual; cambiar a 5 lo habilita; "Guardando…" y segunda pulsación ignorada; "Guardado." y botón deshabilitado otra vez; repositorio que lanza → mensaje de error y sesión intacta; escribir oculta "Guardado." | componente |
| Desactivar la sugerencia; Fallo al guardar la casilla | `immediate-setting.spec`: `change` optimista, reversión al fallar, `FakeLogger` recibe el detalle, `error` con el texto; `ajustes-page.component.spec`: casilla deshabilitada mientras guarda, vuelve a su valor y muestra el error | unitaria pura + componente |
| Elección guardada al tocar; Elección que no se pudo guardar | Mismos specs del helper y de la página sobre el selector de hora | unitaria pura + componente |
| Cambiar a claro; Fallo al guardar el tema | `ajustes-page.component.spec` con `FakeThemePort`: tocar "Claro" → `ThemeService.preference()` = `light` y `updateSettings({ theme: 'light' })`; con fallo vuelve a `system` en ambos | componente |
| El perfil manda al cargar | `profile-theme-sync.spec`: sesión `active` con `theme: 'light'` y preferencia previa `dark` → `preference()` = `light`; en `signedOut` no toca nada | unitaria pura |
| Elegir otra zona; Dispositivo en otra zona; Dispositivo en la misma zona | `time-zones.spec`: la lista contiene la zona del dispositivo y la guardada; `ajustes-page.component.spec`: seleccionar `Europe/Madrid` guarda; con perfil `America/Bogota` y dispositivo distinto aparece el aviso y "Usar esta zona" guarda la del dispositivo; iguales → sin aviso | unitaria pura + componente |
| Cambiar la hora de inicio | `ajustes-page.component.spec`: elegir "02:00" guarda `dayStartHour: 2`; las 24 opciones en formato `HH:00` | componente |
| Cambiar un ajuste no toca los otros; La sesión refleja el cambio al instante; Actualizar ajustes sin sesión | `session.service.spec`: `updateSettings({ defaultNewCardsPerDay: 5 })` conserva los demás y `user()` cambia al terminar; en `signedOut` lanza "No hay una sesión activa." sin llamar a `save` | unitaria pura |
| Versión visible en Ajustes | `ajustes-page.component.spec`: el pie de versión existe al final; `shell.component.spec` ya garantiza que el caparazón no lo pinta | componente |
| Cerrar sesión | `ajustes-page.component.spec` con `RouterTestingHarness`: "Cerrando sesión…", `signOut` llamado, URL `/login` | componente |
| Crear libro; Editar libro; Cambiar el default no altera libros existentes | `libros` | diferido |
| Sugerencia activa; Sugerencia desactivada | `sesion-de-repaso`; la única fuente del default se fija con una prueba estática: `DEFAULT_AUTO_GRADE_BY_TIME` referenciado por el esquema y por la creación del perfil, sin `?? false` en `src/app` | diferido + estática |
| Estadísticas del día correcto | `cola-diaria` | diferido |

## Risks / Trade-offs

- [`Intl.supportedValuesOf` ausente en navegadores viejos] → `supportedTimeZones()` devuelve al menos la zona guardada y la del dispositivo; el selector sigue funcionando.
- [Doble escritura rápida de dos controles de elección] → cada `change` lee `user()` en el momento de guardar; el último en terminar gana con el perfil completo. Aceptado: son ajustes personales de baja frecuencia.
- [El efecto de sincronía pisa un cambio de tema en vuelo] → el efecto solo reacciona a cambios de `state`; `updateSettings` actualiza `state` con el tema ya elegido, así que converge.
- [Signal Forms con `<input type="number">` entrega `NaN` con el campo vacío] → `required` y `boundedInteger` lo rechazan con el mismo mensaje; se prueba.

## Migration Plan

Cuarto commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos ni reglas. Rollback: revertir el merge.
