# shared — UI reutilizable

Componentes presentacionales y utilidades de UI que se usan en varias pantallas. **Sin lógica
de negocio.** Reciben datos por `input` y emiten eventos por `output`; no saben de dónde vienen.

## Qué vive aquí (a medida que se necesite)

- `EmptyState`, `ErrorState`, skeletons de carga (especificación §9).
- Primitivas de identidad construidas a mano con Tailwind: botones, inputs, tarjetas, la fila
  de calificación de los 4 cerebros (§11.2).
- Para lo complejo (modales, menús, tooltips), vestir primitivas headless accesibles
  (candidato: Angular CDK, decisión a confirmar — §11.3).

## Reglas

- **No depende** de `services/`, `infrastructure/`, ni `features/`. Como mucho usa tipos de
  `domain/`.
- **Cero literales de color/fuente**: solo tokens semánticos de Tailwind.
- Crear un componente aquí solo cuando aparece el **segundo** uso real (no abstraer antes).
