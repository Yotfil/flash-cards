# Arquitectura por capas (Ports & Adapters)

Mapa de carpetas de `src/app`. Cada capa tiene su propio README con el detalle. La regla
de oro: **las dependencias apuntan hacia adentro, hacia el dominio.** El dominio no conoce
a nadie; la UI no conoce la infraestructura.

```
features/         UI: pinta y captura eventos. No conoce Firestore ni ts-fsrs.
   │  usa
   ▼
services/         Lógica de negocio pura (cola diaria, scheduling, parser).
   │  depende de
   ▼
domain/           Modelos (interfaces) + puertos (interfaces). Núcleo, sin framework.
   ▲  implementan
   │
infrastructure/   Adaptadores: repositorios Firestore y ts-fsrs detrás de los puertos.

core/             Composición y transversal: conecta cada puerto con su adaptador (DI),
                  providers, guards e interceptores.
shared/           UI reutilizable y presentacional (EmptyState, ErrorState, botones…).
```

**Por qué así (resumen):** ver `docs/adr/0001-arquitectura-por-capas.md`.

**Cómo leer una dependencia:** si una flecha no existe en el diagrama, esa importación está
prohibida. Ejemplos: `features/` NO importa de `infrastructure/`; `domain/` NO importa de
ninguna otra capa ni de Angular/Firestore/ts-fsrs.

Alias de importación (en `tsconfig.json`): `@core/*`, `@domain/*`, `@services/*`,
`@infrastructure/*`, `@features/*`, `@shared/*`.
