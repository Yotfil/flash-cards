# Proposal

## Why

Tras `libros`, el detalle de un libro tiene una región "Capítulos" provisional y el detalle de capítulo es una página "Pronto". Los capítulos son donde viven las tarjetas: sin ellos `tarjetas` no tiene dónde pintar su lista. Además, borrar un capítulo hoy deja sus tarjetas huérfanas, y esas tarjetas siguen entrando en Hoy sin que ninguna pantalla deje editarlas ni borrarlas.

## What Changes

Implementa la spec base `openspec/specs/capitulos/spec.md` con las decisiones de su explore (2026-10-23):

- **Lista de capítulos** del detalle del libro en tarjetas de acrílico. Cada fila muestra posición, nombre y número de tarjetas contado en el servidor; sin conexión, la fila va sin número. Los botones de icono "Renombrar {nombre}" y "Borrar {nombre}" quedan en la fila. "Añadir un capítulo" va al final, el vacío funciona como onboarding y hay esqueleto y error con reintento.
- **Borrar un capítulo borra sus tarjetas** por lotes, con el capítulo en el último. Cada lote descuenta su parte del contador del libro y el historial se conserva. La confirmación dice cuántas tarjetas se van y no se cierra si el borrado falla (hallazgos 1 y 6).
- **Detalle de capítulo** (pantalla nueva). Resuelve libro y capítulo antes de pintar algo que escriba, con error, "Libro no encontrado" o "Capítulo no encontrado" (hallazgo 9). El enlace de vuelta lleva el nombre del libro. Deja las regiones donde `tarjetas`, `cola-diaria` y `practica-quiz` pondrán lo suyo.
- **Diálogo de capítulo** con Signal Forms y Zod: nombre recortado y obligatorio (hallazgo 2) y error dentro del diálogo.
- **Sin conexión**, crear, renombrar y borrar se deshabilitan con "Necesitas conexión para guardar cambios." (transversal 6, T2).
- "Estudiar este capítulo" gana el caso de fallo (hallazgo 4) y lo implementa `cola-diaria`. "Practicar" sale de esta spec por duplicado: vive en `practica-quiz`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `capitulos`: lista, estados, validación, creación, navegación, estudiar, errores y accesibilidad (MODIFIED); borrado en cascada (REMOVED + ADDED); sin conexión (ADDED); "Practicar" (REMOVED).

## Impact

- **Código:** `domain` (modelo y puerto de capítulos), `infrastructure/firestore` (esquema y repositorio con conteo y cascada), `services/chapters`, `features/biblioteca` (lista, fila, diálogo, detalle de capítulo, copy), `libro-detail-page` y `app.routes.ts`.
- **Depende de:** los contratos de `libros` (`BooksService`, `ConfirmDialog` con `action`, `pluralize`) y del `opsx:update` de `libros` por T2 (`ConfirmDialog` sin red), pendiente.
- **Dependencias nuevas:** ninguna.
- **Datos:** sin campo nuevo. Las consultas por `chapterId` usan el índice automático de un solo campo.

## Fuera de alcance

- Lista de tarjetas del capítulo, su formulario y su importación: `tarjetas` e `importacion`.
- Botón "Estudiar este capítulo" y "N para hoy" por fila: `cola-diaria`.
- Botón "Practicar" y si se ofrece por libro: `practica-quiz`.
- Reordenar capítulos y compactar `order`: no existe en la 0.1.1.
- Limpiar tarjetas que ya quedaron huérfanas en producción por borrados de la 0.1.1: no se tocan y se anota como riesgo.
