# infrastructure — Adaptadores

Implementaciones concretas de los **puertos** definidos en `domain/ports`. Es la **única capa
que habla con el mundo exterior** (Firestore, ts-fsrs, almacenamiento, red).

## Qué vive aquí

- **`firestore/`** — los repositorios: la **única** parte del código que importa el SDK de
  Firestore. Traduce documentos ↔ modelos del dominio y **valida con Zod en la frontera**
  (los datos de Firestore son datos externos: se validan antes de usarse).
- **`scheduling/`** — el adaptador de **ts-fsrs** detrás de `SchedulerPort`. No se reimplementa
  el algoritmo (Principio: no reinventar); se envuelve la librería.

## Reglas

- **Implementa** interfaces de `domain/`. Puede depender de `domain/` y de librerías externas.
- **No depende** de `services/` ni de `features/`. Si la UI o un servicio necesita estos
  adaptadores, los recibe por DI a través de su puerto, nunca importando esta carpeta a mano.
- Cambiar de Firestore a otro backend (ver §3) = añadir un adaptador aquí, sin tocar el resto.
