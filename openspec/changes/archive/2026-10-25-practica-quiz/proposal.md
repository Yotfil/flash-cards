# Proposal

## Why

La práctica es el ejercicio sin consecuencias de Cadence: un mini-quiz corto con feedback inmediato que no toca la programación. En la 0.1.1 arrastraba tres defectos de pantalla (error confundido con "sin tarjetas", sesión fantasma al volver, barra que nunca llegaba al final) y un botón del prototipo sin destino: "Practicar" en el libro. Es la última capacidad original antes del release 1.0.0.

## What Changes

Implementa la spec base `openspec/specs/practica-quiz/spec.md` con las decisiones de su explore (2026-10-24):

- **Práctica por capítulo con las tarjetas ya en memoria** (cero lecturas): el botón "Practicar" aparece solo cuando la lista cargó y hay al menos una básica elegible. Se retiran el aviso "Necesitas algunas tarjetas básicas…" y el fallo de carga al preparar (hallazgo 1).
- **Práctica por libro** (nueva, prototipo aprobado): botón secundario junto a "Estudiar este libro"; lee las tarjetas del libro (la caché basta) y arma el quiz con todo el libro.
- **Bandeja + práctica efímera** (hallazgo 2, transversal 4): cada entrada arranca una práctica nueva; sin bandeja, la ruta redirige a la Biblioteca; al salir o terminar se vacía.
- **Salir y "Volver" van al origen** (capítulo o libro), no a la raíz de la Biblioteca.
- **Barra de progreso por respondidas** sobre el total, que llega al 100 % (hallazgo 3).
- **Reglas conservadas como intención** (hallazgos 4, 6, 7): suspendidas participan, opción múltiple exige 3 distractores o cae a escribir, sin mínimo de tarjetas, cualquier sinónimo de la lista vale.
- Dos generalizaciones con segundo caso real: la bandeja de entrega y la barra superior de sesión, compartidas con el repaso; el botón de lanzamiento acepta otros destinos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `practica-quiz`: inicio desde un capítulo, pantalla completa y resumen final (MODIFIED); inicio desde un libro y práctica efímera (ADDED).

## Impact

- **Código:** `services/practice/` (elegibles, generador, respuesta escrita, núcleo de estado, servicio), `services/handoff/` (bandeja genérica; `StudyHandoffService` pasa a usarla), `domain/ports/card.repository.ts` e `infrastructure/firestore` (`listByBook`), `shared/session-top-bar/` (barra superior extraída del repaso), `features/estudio/study-launch-button` (destino configurable), `features/practica/` (página, preguntas, resumen, copy, guard), `capitulo-detail-page` y `libro-detail-page` (botón "Practicar"), `app.routes.ts` (`/practicar`).
- **Depende de:** `tarjetas` (`CardsService.cards`, `hasCloze`, `normalizeCardText`), `cola-diaria` (`StudyHandoffService`, `StudyLaunchButtonComponent`), `sesion-de-repaso` (`ReviewTopBarComponent`, `studyHandoffGuard` como patrón), `libros`/`capitulos` (páginas de detalle), `navegacion-y-shell` (`IconComponent`, rutas fuera del caparazón).
- **Dependencias nuevas:** ninguna. **Datos:** sin campo ni índice nuevos; la lectura por libro usa el índice automático de `bookId`. No escribe nada.

## Fuera de alcance

- Que la práctica alimente los lotes de `practica-con-ia` (su spec lo excluye).
- Practicar clozes, elegir el número de preguntas, practicar "lo listo de hoy".
- Un mínimo de tarjetas para practicar o una comparación más estricta de la respuesta escrita.
