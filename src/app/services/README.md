# services — Lógica de negocio

El "cerebro" de la app: reglas y casos de uso. **Código puro y testeable** (aquí se concentran
las pruebas, ver calibración del rigor en `CLAUDE.md`).

## Qué vive aquí

- Armado de la **cola diaria** (vencidas + nuevas hasta `newCardsPerDay`, zona horaria, §6).
- **Programación** de repasos: orquesta el `SchedulerPort` (ts-fsrs) sin conocer la librería.
- **Parser de importación** (`.txt`/`.md`, §5) con su previsualización y reporte de errores.

## Reglas

- **Depende solo de `domain/`** (modelos y puertos). Recibe los puertos por inyección de
  dependencias; **nunca** instancia repositorios de Firestore ni llama a ts-fsrs directamente.
- No conoce el DOM, ni componentes, ni `infrastructure/`. Puede ser `@Injectable`, pero su
  lógica no debe depender de Angular para poder probarse en aislamiento.
- Errores explícitos (prohibido `catch` vacío). Validación de datos externos con Zod en la
  frontera **antes** de que entren a esta capa.
