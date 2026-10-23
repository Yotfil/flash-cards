# Proposal

## Why

Con la sesión y el perfil cargados, la pantalla Ajustes sigue siendo provisional y tres ajustes que ya viven en el perfil (`theme`, `timezone`, `dayStartHour`) no tienen cómo editarse; el tema además no se aplica. Ajustes va antes que Biblioteca porque fija la perilla del ritmo de estudio que siembra cada libro, el tema que ya pinta el caparazón y el día de estudio que la cola necesita.

## What Changes

Implementa la spec base `openspec/specs/ajustes-de-usuario/spec.md` con las decisiones de su explore (2026-10-22):

- Pantalla Ajustes completa en secciones: Sesión, Estudio, Día de estudio, Apariencia, Cerrar sesión y el pie de versión al final (único lugar donde se pinta).
- **Tema, zona horaria y hora de inicio del día editables.** El tema se ve al tocar y se persiste; al cargar la sesión, el tema del perfil manda sobre el recordado en el navegador. La zona horaria se elige de la lista de zonas del dispositivo; si la del dispositivo difiere de la guardada, la pantalla avisa y ofrece usarla con un toque, sin cambiarla sola. Se elimina el requisito "los ajustes sin interfaz no se editan todavía".
- **Regla única de guardado:** los controles de elección (casilla, selectores, tema) guardan al tocar, se deshabilitan mientras guardan y, si falla, vuelven al valor anterior con el error junto al control (hallazgo 4). Los campos de texto numérico guardan con "Guardar", deshabilitado si el valor no cambió (hallazgo 5).
- Validación de entero acotado con un esquema Zod compartido que luego reutilizan los formularios de libro (transversal 3).
- Guardado parcial de ajustes en el servicio de sesión, único dueño del usuario; una sola fuente del valor por defecto de la sugerencia por tiempo (hallazgo 8).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ajustes-de-usuario`: tema, zona horaria y hora de inicio editables (ADDED); pie de versión al final (ADDED); regla de guardado por tipo de control y error visible en la casilla (MODIFIED); entero acotado y botón deshabilitado sin cambios (MODIFIED); pantalla por secciones (MODIFIED); requisito de ajustes sin interfaz (REMOVED).

## Impact

- Código: `services/session` (guardado de ajustes), `services/settings` (zonas horarias, sincronía perfil → tema), `shared/forms` (entero acotado), `features/ajustes` (pantalla, copy, helper de guardado inmediato), `core` (arranque de la sincronía), `app.routes.ts`.
- Dependencias: ninguna nueva.
- Datos: ninguno; los tres campos ya existen en el perfil.

## Fuera de alcance

- Siembra de `defaultNewCardsPerDay` en el formulario de libro y la importación: `libros` e `importacion`.
- Aplicación de la sugerencia por tiempo en el repaso: `sesion-de-repaso`.
- Cálculo del día de estudio con zona y hora: `cola-diaria`.
- Sección "Práctica con IA" (plantilla y tamaño de lote): `practica-con-ia`; aquí solo queda su lugar en el orden de secciones.
- Edición del nombre visible, foto o correo: no existe en la 0.1.1.
