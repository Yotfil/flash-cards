# features — UI por pantalla

Los componentes de cada pantalla. **Solo pintan y capturan eventos**; toda la lógica vive en
`services/`. Una carpeta por área de la navegación (especificación §8): `hoy/`, `biblioteca/`,
`progreso/`, `ajustes/`, más el repaso a pantalla completa.

## Reglas

- **No conoce Firestore ni ts-fsrs.** No importa de `infrastructure/`. Habla con `services/`
  (lógica) y usa tipos de `domain/` solo para tipar lo que muestra.
- Usa los componentes presentacionales de `shared/` (incl. `EmptyState`/`ErrorState`).
- **Cero literales de color/fuente** (contrato): siempre tokens semánticos de Tailwind.
- Responsive + accesibilidad como base: teclado, contraste, etiquetas semánticas,
  `prefers-reduced-motion`, diferenciadores no solo por color.
