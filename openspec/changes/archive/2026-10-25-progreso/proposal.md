# Proposal

## Why

Progreso es la lectura sobria de "dónde estoy": pendientes y repasadas de hoy, cómo califiqué y cómo se reparte mi colección. En la 0.1.1 su mayor problema no era suyo: visitar Progreso recalculaba la cola de Hoy y pisaba el ajuste de nuevas (hallazgo 5), ya resuelto por `cola-diaria`. Lo que queda es implementar la pantalla sobre esos contratos con el rediseño Cadence y hacer que funcione sin red con lo que el dispositivo tiene.

## What Changes

Implementa la spec base `openspec/specs/progreso/spec.md` con las decisiones de su explore (2026-10-24):

- **Pendientes hoy** = la cola BASE de `cola-diaria` (topes por libro, sin el ajuste de la sesión); **Repasadas hoy** y las cuatro barras de calificación salen del contador del día que `sesion-de-repaso` incrementa por calificación. Una sola carga por visita, reutilizando el servicio de cola.
- **Tu colección**: tres conteos agregados por cuenta (nuevas / en aprendizaje / dominadas) con barra apilada en matices del acento. Nace la agregación por cuenta junto a la que `libros` ya hace por libro.
- **Fallos por separado** (hallazgo nuevo del explore): si falla la carga de la cola o del contador, error de toda la pantalla; si la colección no se puede contar, los paneles del día se muestran y la sección avisa con su propio Reintentar.
- **Sin conexión** (transversal 6 aplicado a una pantalla de lectura): Progreso muestra el día desde la caché y la sección de colección dice "Necesitas conexión para contar tu colección."; al volver la red, el conteo se pide solo.
- **El estado vacío** solo se decide cuando el conteo llegó y es 0.
- **Alcance conservado** (hallazgos 8 y 9): sin historial, sin desglose por libro, sin racha (vive en Hoy), sin "N suspendidas"; "Dominadas" se mantiene por coherencia con el libro. Voz Cadence con plural real.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `progreso`: colección por estado, estado vacío y estados de carga y error (MODIFIED); sin conexión (ADDED).

## Impact

- **Código:** `domain/ports/book.repository.ts` (`countCollectionByState`), `infrastructure/firestore/book.repository.firestore.ts`, `services/progress/` (servicio y funciones puras de filas y proporciones), `features/progreso/` (página, tres componentes de sección, copy), `app.routes.ts` (`/progreso` deja de ser provisional).
- **Depende de:** `cola-diaria` (`DailyQueueService.refresh`, `baseQueue`, `todayStats`, `status`), `sesion-de-repaso` (incrementos del contador), `libros` (patrón `totalsFor`, `countCardsByState`), `navegacion-y-shell` (`ConnectivityPort`, `EmptyState`, `ErrorState`, `Skeleton`).
- **Dependencias nuevas:** ninguna. **Datos:** sin campo ni índice nuevos (las agregaciones por `scheduling.state` en toda la cuenta usan el índice automático de un solo campo).

## Fuera de alcance

- Métricas por semana, mes o racha; desglose por libro; conteo de suspendidas; lectura del historial de repasos.
- Cambiar "Dominadas" por otro término (decisión de `libros`).
