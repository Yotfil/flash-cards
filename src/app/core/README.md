# core — Composición y transversal

La **raíz de composición** de la app y lo que es transversal a todo. Aquí se "enchufa" cada
puerto del dominio con su adaptador concreto.

## Qué vive aquí

- **Wiring de DI / providers**: asociar `domain/ports` con sus implementaciones de
  `infrastructure/` (p. ej. `{ provide: CardRepository, useClass: FirestoreCardRepository }`).
  Es el único sitio que conoce a la vez el puerto y su adaptador.
- Configuración de arranque (extiende `app.config.ts`), inicialización de Firebase a partir de
  **variables de entorno** (nunca claves hardcodeadas).
- Guards de ruta, interceptores y servicios singleton verdaderamente globales (sesión, tema,
  estado online/offline).

## Reglas

- Es el único lugar donde se permite conocer puertos **y** adaptadores juntos (para conectarlos).
- No contiene lógica de negocio (eso es `services/`) ni UI de pantallas (eso es `features/`).
