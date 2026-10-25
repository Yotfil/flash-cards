# Proposal

## Why

Las tarjetas ya nacen con su bloque de programación, pero nada sabe calcular qué pasa al calificarlas. Sin este cerebro no hay cola ni repaso: `cola-diaria` necesita los vencimientos y `sesion-de-repaso` necesita los cuatro resultados por grado y el texto de cada intervalo. Es además el único lugar donde entra ts-fsrs, así que su frontera define cómo se prueba todo lo que viene después.

## What Changes

Implementa la spec base `openspec/specs/programacion-espaciada/spec.md` con las decisiones de su explore (2026-10-23):

- **Puerto de programación** de una sola operación: dado el estado de una tarjeta y un instante, los cuatro resultados posibles (nuevo estado, días enteros, vencimiento exacto y valores previos para el historial). El estado inicial no está en el puerto: ya vive en el dominio desde `tarjetas`, y aquí se prueba que coincide con el del algoritmo.
- **Previsualizar al mostrar, calcular al calificar** (hallazgo 3): la previsualización es informativa; lo que se guarda se calcula con el instante de la calificación y su último repaso es exactamente ese instante. El puerto lo hace posible al ser puro; `sesion-de-repaso` hace la doble llamada.
- **Intervalos con minutos y horas** (hallazgo 4): el texto sale del vencimiento exacto ("1 min", "10 min", "8 días"), no de los días enteros; "<1 día" desaparece.
- **Adaptador de ts-fsrs** sin dependencias de Angular, con sus parámetros por defecto y una prueba que vigila que esos defaults sigan siendo los de la spec.
- **Fake programable** del puerto para que `sesion-de-repaso` y `cola-diaria` prueben su flujo sin el algoritmo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `programacion-espaciada`: previsualización informativa y cálculo al calificar (MODIFIED); vencimiento exacto en el resultado y último repaso igual al instante (MODIFIED); formato con minutos y horas (MODIFIED); equivalencia del estado inicial con el algoritmo (MODIFIED).

## Impact

- **Código:** `domain/ports` (puerto de programación y tipos de resultado), `domain/models` (grado 1-4), `infrastructure/scheduling` (adaptador ts-fsrs), `services/scheduling` (formato de intervalos), `core/provide-core.ts` (registro), `testing/` (fake), `tests/static/` (defaults de ts-fsrs).
- **Depende de:** `tarjetas` (`CardScheduling`, `CardState`, `initialCardScheduling`).
- **Dependencias nuevas:** ninguna; `ts-fsrs@5.4.1` ya está instalada.
- **Datos:** ninguno. Sin UI, sin Firestore, sin reglas.

## Fuera de alcance

- Guardar el resultado de una calificación (tarjeta + historial + estadísticas, todo o nada) y la doble llamada previsualizar/calificar: `sesion-de-repaso`.
- Qué tarjetas están "listas" y el día de estudio: `cola-diaria`.
- Parámetros FSRS por usuario, optimizador de pesos y aleatorización de intervalos: no existen en la 0.1.1 ni se prometen.
- Pintar los intervalos en los cerebros: `sesion-de-repaso`, que reutiliza el formateador.
