# ADR 0001 — Arquitectura por capas (Ports & Adapters)

- **Estado:** Aceptada
- **Fecha:** 2026-06-23
- **Contexto fase:** Fase 0 — Fundaciones (Tarea 4)

## Contexto

El contrato de ingeniería (`CLAUDE.md`) exige una arquitectura por capas con una frontera de
datos única, tipado fuerte de punta a punta y código legible por un junior. Además, la
especificación anticipa cambios estructurales futuros sin reescribir la app: posible migración
de Firestore a un backend propio (§3) y la entrada de IA detrás de una frontera de servicio única
(Principio 3). Necesitamos una estructura que aísle el núcleo de las decisiones de infraestructura.

## Decisión

Adoptamos **Ports & Adapters (arquitectura hexagonal)** sobre `src/app`, con seis capas y una
regla de dependencias que apunta hacia el dominio:

| Capa | Responsabilidad | Puede depender de |
| --- | --- | --- |
| `domain/` | Modelos (interfaces) y puertos (interfaces). TS puro. | — (nada) |
| `services/` | Lógica de negocio pura (cola diaria, scheduling, parser). | `domain/` |
| `infrastructure/` | Adaptadores que implementan los puertos (Firestore, ts-fsrs). | `domain/` + libs externas |
| `features/` | UI por pantalla; pinta y captura eventos. | `services/`, `shared/`, tipos de `domain/` |
| `shared/` | UI reutilizable y presentacional. | tipos de `domain/` |
| `core/` | Raíz de composición: conecta puertos con adaptadores (DI), arranque, guards. | todas (para enchufarlas) |

Mecánicas de apoyo:

- **Puertos como interfaces** en `domain/ports`; sus implementaciones en `infrastructure/`.
  ts-fsrs y Firestore entran **solo** como adaptadores detrás de su puerto.
- **Inyección de dependencias** de Angular para enlazar puerto → adaptador, declarada en `core/`.
- **Alias de TypeScript** (`@domain/*`, `@services/*`, …) para que las importaciones reflejen la
  capa y delaten cruces indebidos.
- **Validación con Zod en la frontera** (`infrastructure/`): los datos de Firestore son externos
  y se validan antes de convertirse en modelos del dominio.

## Consecuencias

**A favor**
- El núcleo (dominio + servicios) es testeable sin Firestore ni Angular; ahí se concentran las
  pruebas (calibración del rigor del contrato).
- Cambiar de proveedor de datos = nuevo adaptador en `infrastructure/`, sin tocar dominio, UI ni
  servicios. Habilita el "punto de reevaluación de backend" de la especificación §3.
- Límites explícitos y legibles: cada README dice qué puede importar cada capa.

**En contra / costos**
- Más carpetas e indirección (puerto + adaptador) que un CRUD directo. Se asume a conciencia por
  el valor a futuro; **no** se crean abstracciones especulativas: una capa se llena cuando hay un
  caso real (no antes).

## Alternativas consideradas

- **Componentes hablando directo con Firestore:** más rápido al inicio, pero acopla la UI al
  proveedor y rompe la frontera de datos única del contrato. Descartada.
- **Servicios que mezclan lógica y acceso a datos:** difumina la capa testeable y ata el negocio
  a Firestore/ts-fsrs. Descartada.

## Pendiente / a revisitar

- Posible refuerzo de los límites con tooling (p. ej. `eslint-plugin-boundaries`) si los cruces
  indebidos se vuelven un problema real. Por ahora se documentan en los README de cada capa.
