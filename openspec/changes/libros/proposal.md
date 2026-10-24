# Proposal

## Why

Con sesión, perfil y ajustes, la Biblioteca sigue siendo una página provisional. Los libros son la unidad de organización de todo lo demás (capítulos, tarjetas, cola, importación), así que su lista, su detalle y sus tres diálogos van antes. Es además el primer change que lee y escribe datos del usuario con el patrón de recurso, el primer diálogo de confirmación y el primer uso real del escritor por lotes.

## What Changes

Implementa la spec base `openspec/specs/libros/spec.md` con las decisiones de su explore (2026-10-22):

- Biblioteca con lista de libros en tarjetas de acrílico, esqueleto, vacío como onboarding y error con reintento; se relee cada vez que se abre.
- Detalle del libro con cabecera: nombre, materia, **totales dominadas, en aprendizaje y nuevas** contados en el servidor por estado, sin leer tarjetas; estado de error si la biblioteca falló (hallazgo 5). La lista de capítulos y el botón "Estudiar este libro" llegan con `capitulos` y `cola-diaria`.
- **Borrar un libro borra sus capítulos y tarjetas** por lotes, con el libro en el último lote; historial y estadísticas se conservan; la confirmación dice cuántos capítulos y tarjetas se van (hallazgo 1). Si falla, el diálogo se queda abierto con el error (hallazgo 6).
- Diálogos con el servicio del caparazón y Signal Forms con Zod: nombre recortado y obligatorio (hallazgo 2), materia opcional que vacía queda "general" (hallazgo 7), ajustes por libro con enteros acotados (hallazgo 3). Nace el `ConfirmDialog` reutilizable.
- Modelo y repositorio de libros con incremento atómico del contador, que usarán `tarjetas` e `importacion`.
- Sin conexión, crear, editar, ajustar y borrar se deshabilitan con "Necesitas conexión para guardar cambios." y los totales se omiten (transversal 6). Nace el aviso compartido que respeta `ConfirmDialog`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `libros`: lista, estados, creación, ajustes, cabecera con totales, estudiar y errores dentro del diálogo (MODIFIED); borrado en cascada (REMOVED + ADDED); sin conexión (ADDED).

## Impact

- Código: `domain/models` (libro), `domain/ports` (repositorio de libros, conteos por estado), `infrastructure/firestore` (esquema, repositorio con cascada por lotes y agregaciones), `services/books`, `shared/confirm-dialog`, `features/biblioteca` (lista, detalle, dos diálogos, copy), `app.routes.ts`.
- Dependencias: ninguna nueva.
- Datos: ninguno nuevo. El índice `cards(bookId, scheduling.state)` ya declarado pasa a usarse.

## Fuera de alcance

- Capítulos del detalle y su cascada: `capitulos`.
- Botón "Estudiar este libro" y su comportamiento: `cola-diaria`, con la decisión de que un fallo de carga nunca se pinta como "al día".
- Incrementos del contador al crear o borrar tarjetas: `tarjetas` e `importacion`, sobre el método que nace aquí.
- Importar un libro: `importacion`; aquí los botones solo navegan a `/importar`.
- Reordenar libros y compactar `order`: no existe en la 0.1.1.
