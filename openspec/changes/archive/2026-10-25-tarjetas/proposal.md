# Proposal

## Why

Con libros y capítulos en su sitio, el detalle de un capítulo tiene una región "Tarjetas" provisional: no se puede crear, editar ni borrar la unidad mínima de estudio. Las tarjetas son además el primer documento con bloque de programación, así que su esquema y su repositorio son los cimientos de `programacion-espaciada`, `cola-diaria` y `sesion-de-repaso`.

## What Changes

Implementa la spec base `openspec/specs/tarjetas/spec.md` con las decisiones de su explore (2026-10-23):

- **Lista de tarjetas** del capítulo en filas de acrílico: `anverso → reverso`, cloze con etiqueta y pregunta compacta, marca "Repetida", icono "Tiene ejemplo" y menú "⋯" por fila (Editar · Suspender/Reactivar · Borrar). Tocar la fila abre Editar. Nace el componente de menú compartido.
- **Suspender / Reactivar** desde la fila, guardado al tocar con reversión si falla. La tarjeta sigue visible, atenuada y con la etiqueta "Suspendida"; sigue contando.
- **Formulario** con anverso y reverso protagonistas; "Más opciones" despliega **Ejemplo**, opcional y omitido si queda vacío. Al crear, **aviso de repetida en vivo** contra el capítulo abierto, sin bloquear (hallazgo 2).
- **Borrados** individual y masivo con el `ConfirmDialog` compartido, que se queda abierto si fallan (hallazgo 6); el masivo descuenta el contador del libro en cada lote (hallazgo 7, patrón de `capitulos` extraído a un ayudante común).
- **Sin conexión**, crear, editar, borrar y suspender se deshabilitan (transversal 6).
- Nace el **esquema de tarjeta** con compatibilidad hacia atrás (`cardType`, `learningSteps` y `suspended` ausentes) y el bloque de programación inicial como valores puros, que `programacion-espaciada` contrasta con el algoritmo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tarjetas`: listado, formulario, edición, borrado individual, contador, borrado masivo, acciones en vuelo, estados y validación (MODIFIED); suspender, aviso de repetida, ejemplo en el formulario y sin conexión (ADDED).

## Impact

- **Código:** `domain` (modelo y puerto de tarjetas, programación inicial), `infrastructure/firestore` (esquema, repositorio, ayudante de borrado por lotes con descuento), `services/cards` (servicio, normalización, repetidas, orden, cloze), `shared/menu`, `features/biblioteca` (lista, fila, formulario, copy), `capitulo-detail-page`.
- **Depende de:** `capitulos` (región "Tarjetas" del detalle, `ChaptersService`), `libros` (`ConfirmDialog`, `incrementCardCount`, `changeCardCount`), `ajustes-de-usuario` (`createImmediateSetting`, `NEEDS_CONNECTION_MESSAGE`).
- **Dependencias nuevas:** ninguna (`@angular/cdk/menu` ya viene con el CDK).
- **Datos:** sin campo nuevo. Las consultas por `chapterId` usan el índice automático.

## Fuera de alcance

- Importar tarjetas en el capítulo y detectar repetidas al importar: `importacion`. Aquí el botón solo abre ese flujo.
- Programación al calificar, cola y repaso: `programacion-espaciada`, `cola-diaria`, `sesion-de-repaso`.
- Estudio bidireccional: la opción "Ambos sentidos" se oculta en `libros` (transversal 7); `direction` y `noteId` se quedan en el modelo sin uso.
- Mover tarjetas de capítulo, buscar/filtrar y suspender en masa: no existen en la 0.1.1; quedan anotadas como capacidades futuras.
- `pronunciation`, `notes`, `audioUrl`, `tags`: siguen sin interfaz.
