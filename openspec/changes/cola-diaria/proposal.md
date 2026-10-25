# Proposal

## Why

Hoy es la pantalla que resuelve "no me apetece entrar": en un segundo debe decir qué toca estudiar y recompensar el gesto de abrir. La cola diaria es su cerebro y la puerta de entrada a la sesión de repaso; sin ella, "Estudiar este libro" y "Estudiar este capítulo", que `libros` y `capitulos` dejaron apuntados, no tienen a quién llamar. Además la 0.1.1 arrastra dos defectos de fondo: dos definiciones de "tarjeta lista" según por dónde se entre, y un ajuste de nuevas que mezcla libros y que Progreso pisa al visitarlo.

## What Changes

Implementa la spec base `openspec/specs/cola-diaria/spec.md` con las decisiones de su explore (2026-10-24):

- **Una sola definición de "lista"** para Hoy, libro y capítulo: tarjeta no suspendida con vencimiento menor o igual al fin del día de estudio (hallazgo 5 de sesión/programación). Las tres entradas, y el conteo por capítulo, hablan del mismo conjunto.
- **Ajuste de nuevas de la sesión por libro** (requisito MODIFIED): un control por cada libro con nuevas disponibles, que nunca toma tarjetas de otro libro. Vive en memoria ligado al día de estudio, así visitar Progreso o volver de una sesión no lo pisa (hallazgo 5 de práctica/progreso); Progreso ve la cola base. Se retira el aviso "tienes muchos repasos, considera menos nuevas" del código viejo.
- **Racha discreta en Hoy** (delta del rediseño): día de racha = día de estudio con al menos un repaso de cualquier libro; se calcula al vuelo desde los indicadores diarios, sin campo nuevo; con cero no se muestra; si su lectura falla, se omite sin tumbar la cola.
- **Pantalla Hoy rediseñada**: bloque principal con "N tarjetas" + "Listas para repasar hoy" + "Estudiar ahora" y luz orbital mientras haya pendientes; desglose por libro en filas tocables; dos vacíos distintos (sin libros = onboarding; al día = recompensa); fecha local en el subtítulo.
- **"Estudiar este libro" y "Estudiar este capítulo"** cobran vida en las zonas de acciones que dejaron `libros` y `capitulos`, con "Preparando…", doble toque ignorado y fallo como error con "Reintentar", nunca "al día" (hallazgo 4 de libros/capítulos).
- **"N listas" / "al día" por capítulo** en la fila del capítulo, sin topes, desde la misma lectura que usa "Estudiar este libro".
- **Lectura de indicadores diarios** (modelo, esquema y repositorio de lectura): la escritura la añade `sesion-de-repaso`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `cola-diaria`: ajuste de nuevas por libro en vez de total (MODIFIED); estudiar un libro o capítulo con la definición única de "lista" y el caso de fallo (MODIFIED); desglose con filas tocables y meta sin la parte en cero (MODIFIED); estados de Hoy con onboarding, al día, bloque principal, "Preparando…" y recarga por día (MODIFIED); racha de días de estudio (ADDED); conteo de listas por capítulo en el detalle del libro (ADDED); Hoy y estudiar funcionan sin conexión con los datos del dispositivo (ADDED).

## Impact

- **Código:** `domain/models` (indicadores diarios), `domain/ports` (repositorio de indicadores; lecturas de tarjetas listas en el de tarjetas), `infrastructure/firestore` (esquema y repositorio de indicadores; dos consultas nuevas de tarjetas), `services/study-day` (día de estudio, puro), `services/queue` (armado de la cola, racha, servicio de cola, listas por libro, entrega a la sesión), `features/hoy` (pantalla y sus piezas), `features/biblioteca` (botón de estudiar en los dos detalles; línea de listas en la fila de capítulo), `shared/icon` (icono de racha), `app.routes.ts` (`/hoy`), `testing/` (fakes).
- **Depende de:** `tarjetas` (modelo y repositorio de tarjetas), `programacion-espaciada` (estados), `libros` y `capitulos` (servicios, detalles y zonas de acciones), `ajustes-de-usuario` (`timezone`, `dayStartHour`), `navegacion-y-shell` (ruta, estados, iconos, conectividad).
- **Datos:** sin campos ni colecciones nuevas. La consulta por libro usa el índice compuesto `bookId + scheduling.due` ya declarado; la consulta por cuenta y la de indicadores son de un solo campo. Sin cambios en reglas.
- **Hilos para changes posteriores:** `sesion-de-repaso` retira su requisito "listas en este instante" (la selección vive aquí) y añade la escritura de indicadores; `progreso` confirma que su hallazgo 5 queda resuelto.

## Fuera de alcance

- La sesión de repaso en sí (pantalla, cerebros, persistencia): `sesion-de-repaso`. Aquí la ruta `/repaso` sigue siendo la página provisional del caparazón; este change deja la lista curada en un punto de entrega y navega.
- Escribir indicadores diarios: `sesion-de-repaso`.
- Persistir el ajuste de nuevas de la sesión entre recargas del navegador: se decidió no hacerlo; si el uso real lo pide, es un cambio aislado.
- Métricas por libro en Progreso, racha en Progreso: `progreso` si el usuario lo pide.
- Estudio bidireccional (`studyDirection = both`): fuera de 1.0.0 (transversal 7).
