# Proposal

## Why

Con tarjetas, libros y capítulos en su sitio, la única forma de cargar contenido es tarjeta por tarjeta. La importación es la puerta de entrada real de Cadence (un archivo = un libro) y la pantalla que convierte un fallo en algo entendible: el usuario ve qué entra y qué se omite antes de guardar. Deja además el "paquete de libro", la costura que `exportacion-de-libros` usará justo después.

## What Changes

Implementa la spec base `openspec/specs/importacion/spec.md` con las decisiones de su explore (2026-10-24):

- **Gramática de la línea:** primero el ejemplo tras ` :: ` (con espacios; un `::` pegado a texto es contenido), luego cloze si hay hueco válido, y si no, `anverso | reverso` o tabulador. Un cloze con separador se omite con motivo visible (hallazgo 1).
- **Validez única:** tarjetas, capítulos y nombre del libro pasan por los mismos esquemas Zod que los formularios; lo que no pasa se omite con el motivo y su línea (hallazgo 6 de plataforma). Los tres esquemas se mueven a la capa de servicios para compartirlos.
- **Paquete de libro** como salida del parser: nombre, materia, capítulos y tarjetas de contenido, sin programación ni ids.
- **Página "Importar un libro"** en `/importar`: nombre, **materia opcional** (hallazgo 9), texto o archivo y previsualización sólida con capítulos, tarjetas, **repetidas** (hallazgo 2) y líneas omitidas, plural real y botón "Importar N". Los encabezados sin tarjetas crean capítulos vacíos a propósito (hallazgo 10).
- **Escritura del libro** con el documento del libro en el último lote y **borrado compensatorio** si un lote falla (hallazgos 4 y 5 de plataforma).
- **Diálogo "Importar tarjetas"** con "Agregar a las que ya existen" y "Reemplazar todas"; el reemplazo es **atómico cuando cabe en un lote** gracias al delta por operación del ayudante de lotes (hallazgo 3).
- **Error dentro del diálogo o la página**, que solo se cierra con éxito (hallazgo 5). **Sin conexión**, previsualizar sí, confirmar no (transversal 6).
- Nota al inicio del §5 de la especificación apuntando a la spec viva (hallazgo 8).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `importacion`: encabezados, separadores, cloze, previsualización, libro creado, escritura del libro, modos agregar y reemplazar, repetidas y progreso del diálogo (MODIFIED); ejemplo con ` :: `, agregar por lotes sin deshacer y sin conexión (ADDED).

## Impact

- **Código:** `domain` (paquete de libro, puerto de importación, `replaceInChapter`), `services/import` (parser, repetidas, servicio), `services/{books,chapters,cards}` (esquemas movidos), `infrastructure/firestore` (repositorio de importación, `writeInCountedBatches` con delta por operación), `features/importacion` (página, diálogo, previsualización, copy), `capitulo-detail-page`, `app.routes.ts`.
- **Depende de:** `tarjetas`, `libros`, `capitulos`, `ajustes-de-usuario`, `navegacion-y-shell` (contratos listados en el design).
- **Dependencias nuevas:** ninguna. **Datos:** sin campo, índice ni regla nuevos.

## Fuera de alcance

- Exportar un libro: `exportacion-de-libros`, que consume el paquete de libro y la gramática de aquí.
- Casilla "No importar las repetidas": apuntada como extensión; hoy solo se cuentan.
- CSV, JSON, `.apkg`, comentarios `//`, tarjetas multilínea, tags por línea (§5.7 y §5.8).
- Editar el nombre del capítulo por defecto: toma el nombre del libro o del capítulo destino.
- Compensación al agregar en un capítulo: entran los lotes buenos con contador correcto; el reintento anuncia las repetidas.
