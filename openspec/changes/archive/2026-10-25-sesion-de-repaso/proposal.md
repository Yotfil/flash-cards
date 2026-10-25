# Proposal

## Why

La sesión de repaso es donde ocurre el estudio y donde la guía pone el deleite (volteo, cerebros, cierre). La 0.1.1 arrastra tres defectos de fondo que la reescritura debe corregir aquí: las tarjetas falladas no vuelven en la misma sesión aunque la especificación de producto lo exige, cada calificación espera la confirmación del servidor (sin red la sesión se cuelga; con red móvil se siente lenta), y salir o terminar te deja en Biblioteca con una sesión fantasma que reaparece al volver atrás. Además `cola-diaria` ya deja la lista curada en una bandeja de entrega que esta pantalla debe consumir.

## What Changes

Implementa la spec base `openspec/specs/sesion-de-repaso/spec.md` con las decisiones de su explore (2026-10-24):

- **Reencolado por la definición única de "lista"** (hallazgo 1, prioridad A): tras guardar una calificación, si la tarjeta sigue lista para hoy (vence antes del fin del día de estudio) vuelve al final de la sesión; si no, sale. Cubre "Otra vez", los pasos de aprendizaje de las nuevas y el reaprendizaje. La sesión termina cuando no queda nada listo, así Hoy dice "Estás al día" de verdad. **BREAKING** respecto a la spec base, que decía lo contrario.
- **Guardado optimista** (cierra el cabo de T2): la sesión avanza al instante sin esperar al servidor. Los tres documentos (tarjeta, historial, indicadores) van en un solo lote a la cola persistente del SDK, que sobrevive a cerrar la app y sincroniza al volver la red; "todo o nada" se conserva en el almacén. Un rechazo tardío devuelve la tarjeta al final de la sesión con aviso. **BREAKING** respecto a "si falla el guardado, la sesión no avanza".
- **Progreso honesto** (hallazgo 8): barra = tarjetas que ya salieron sobre las distintas; contador "Quedan N".
- **Cierre del rediseño**: "Sesión terminada", "Repasaste N tarjetas" (distintas, plural real), pastillas por calificación, nota "Las que más te costaron volverán antes.", anillo que se completa, "Volver a Hoy" y el hueco del bloque "Práctica con IA".
- **Dos tiempos con nombre** (hallazgo 2): latencia de recuerdo (mostrar → revelar, para la sugerencia, no se guarda) y duración del repaso (mostrar → primer toque, se guarda por aparición).
- **Bandeja de entrega y sesión efímera** (hallazgo 6, transversal 4): entrar a la pantalla toma la lista entregada y arranca siempre de cero; sin lista redirige a Hoy; "Salir" va a Hoy sin cierre ni confirmación; nada se retoma.
- **Visual del delta**: tarjeta sólida con volteo 3D, cerebros SVG grandes con cascada, fila con ancho máximo en escritorio, atajos ocultos en táctil, barra de progreso en acrílico, el reverso muestra el ejemplo si existe, indicador sin conexión reutilizado.
- **Menores**: el servicio rechaza calificar sin revelar (hallazgo 9); la sugerencia lee el ajuste sin valor de respaldo (hallazgo 8 de ajustes); doble llamada al puerto de programación (previsualizar al mostrar, calcular al tocar).
- **Nacen aquí**: el modelo y el esquema del historial de repasos, la escritura atómica de la calificación y la escritura de indicadores diarios que `cola-diaria` dejó pendiente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sesion-de-repaso`: reencolado de las que siguen listas (MODIFIED, invierte el requisito base); guardado optimista con rechazo tardío (MODIFIED de dos requisitos); progreso con barra y "Quedan N" (MODIFIED); cierre rediseñado y rumbo a Hoy (MODIFIED); llegar sin lista redirige a Hoy y la sesión arranca siempre nueva (MODIFIED); Salir va a Hoy (MODIFIED); duración del repaso por aparición (MODIFIED); previsualización informativa y cálculo al tocar (MODIFIED); cloze, ejemplo en el reverso y atajos ocultos en táctil (MODIFIED); indicador sin conexión en la sesión (ADDED); dos requisitos REMOVED por vivir ya en `cola-diaria` y en `ajustes-de-usuario`.

## Impact

- **Código:** `domain/models` (historial, entrada de calificación), `domain/ports` (persistencia atómica de la calificación; `recordReview` no hace falta como método aparte: va dentro del lote), `infrastructure/firestore` (esquema y documento del historial, incrementos de indicadores, adaptador del lote), `services/review` (sesión efímera, sugerencia por latencia, reencolado, resumen), `features/repaso` (pantalla, tarjeta volteable, cerebros, barra, cierre), `shared/icon` (cerebro SVG, check), `styles.scss` (duración de la cascada), `app.routes.ts` (`/repaso`), `testing/` (fakes).
- **Depende de:** `cola-diaria` (`StudyHandoffService`, `isReadyCard`, `endOfStudyDay`, `studyDayId`, modelo de indicadores), `programacion-espaciada` (`SchedulingPort.preview`, `formatInterval`, `FakeSchedulingPort`), `tarjetas` (modelo, cloze, esquema de programación), `ajustes-de-usuario` (`autoGradeByTime`), `navegacion-y-shell` (ruta, iconos, indicador sin conexión, `Logger`).
- **Datos:** sin campos ni colecciones nuevas; el historial usa la colección y el formato de la 0.1.1 (reglas append-only ya publicadas). Sin índices nuevos.
- **Hilos para changes posteriores:** `practica-con-ia` (bloque del cierre, puerto de difíciles, entrega al salir), `practica-quiz` (mismo patrón de sesión efímera), `progreso` ("Repasadas hoy" cuenta calificaciones, no tarjetas).

## Fuera de alcance

- El bloque "Práctica con IA" del cierre y la escritura de lotes: `practica-con-ia`. Aquí la sesión solo conserva y expone la lista de difíciles.
- Leer el historial de repasos: nadie lo lee en 1.0.0; no hay repositorio de lectura.
- Cambiar los pasos de aprendizaje de ts-fsrs (perilla C del explore): se decide tras probar en el móvil, en `programacion-espaciada`.
- Tope a la duración del repaso: quien consuma el dato decidirá.
- Esperar al servidor según `navigator.onLine`: descartado (engañoso).
