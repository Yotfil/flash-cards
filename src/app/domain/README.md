# domain — Núcleo del dominio

El corazón de la app, **sin dependencias de framework ni de librerías externas** (ni Angular,
ni Firestore, ni ts-fsrs). Solo TypeScript puro.

## Qué vive aquí

- **`models/`** — las interfaces del modelo de datos (especificación §6): `Book`, `Chapter`,
  `Card`, `ReviewLog`, `DailyStats`, etc. Son el lenguaje compartido por todas las capas.
  Los campos futuros (pronunciation, audio, example, notes) existen desde ya como opcionales
  (Principio 2: esquema listo / UI después).
- **`ports/`** — las interfaces (puertos) que el resto del dominio necesita pero no implementa:
  los repositorios (`BookRepository`, `CardRepository`…) y el puerto del scheduler
  (`SchedulerPort`, que abstrae ts-fsrs). Las implementaciones viven en `infrastructure/`.

## Reglas

- **No importa** de `services/`, `infrastructure/`, `features/`, `shared/`, `core/`, ni de
  Angular/Firestore/ts-fsrs. Si necesitas algo de afuera, exprésalo como un **puerto** (interfaz).
- Solo tipos y, a lo sumo, funciones puras de dominio. Nada con efectos secundarios.
