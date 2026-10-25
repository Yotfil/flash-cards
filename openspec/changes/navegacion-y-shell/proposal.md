# Proposal

## Why

Tras los cimientos de datos, Cadence sigue siendo una pantalla con el nombre del producto. Todas las capacidades siguientes se pintan dentro de un marco común: rutas, navegación Hoy · Biblioteca · Progreso · Ajustes, estados de carga, vacío y error, diálogos accesibles y el tema aplicado. Ese marco debe existir antes, con el rediseño puesto, para que cada pantalla solo traiga su contenido.

## What Changes

Implementa la spec base `openspec/specs/navegacion-y-shell/spec.md` con las decisiones de su explore (2026-10-21):

- Mapa de rutas completo desde ya: las siete rutas del caparazón y las cuatro pantallas completas, con una página provisional única que cada capacidad sustituye. Sin guards: los pone `autenticacion-y-acceso`.
- Caparazón Cadence: navegación en acrílico (inferior en móvil, lateral en escritorio con la marca "Cadence"), píldora que se desliza al destino activo, contenido centrado con ancho máximo en escritorio, transición breve entre pantallas.
- Tema aplicado de verdad: un aplicador fija el atributo de tema del documento según `light`/`dark`/`system` y recuerda la última elección para no arrancar con el tema equivocado (hallazgo 1).
- Diálogos sobre el diálogo del CDK, abiertos por servicio: trampa y devolución de foco, scroll bloqueado, Escape global, "ocupado" bloquea el cierre, panel de acrílico en tres tamaños (hallazgo 2). Política única: un diálogo solo se cierra con éxito.
- Componentes de estado reutilizables: vacío, error con reintento y esqueleto (nuevo), más el contrato del recurso asíncrono sobre `resource()` de Angular (transversal 1).
- Sin conexión como modo: indicador discreto en el caparazón, anunciado a tecnologías de asistencia (nuevo).
- Pie de versión como componente reutilizable que deja de ubicarse en el caparazón.
- Icono SVG de trazo con el catálogo del caparazón, incluidos la chispa de la marca y el de sin conexión.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `navegacion-y-shell`: marca "Cadence"; navegación y diálogos en acrílico con píldora deslizante y contenido centrado; tema oscuro base que sigue al sistema con override (sustituye al "claro por defecto"); acento azul eléctrico y familias de tokens Cadence; modal con gestión de foco y apertura por servicio; catálogo de iconos ampliado; pie de versión sin requisito de ubicación (REMOVED); requisitos nuevos de tema aplicado, esqueleto de carga y modo sin conexión.

## Impact

- Código: `app.routes.ts`, `app.config.ts`; `features/shell/`; `shared/` (estados, icono, diálogo, pie de versión); `services/` (tema); `domain/ports/` (tema, conectividad); `infrastructure/browser/`; `testing/`; `src/styles.scss` (tokens de ancho de contenido y zona segura).
- Dependencias: ninguna nueva; `@angular/cdk` ya está instalado.
- Datos y reglas: sin cambios.

## Fuera de alcance

- Guards de sesión y redirecciones por estado de sesión: `autenticacion-y-acceso`.
- Contenido real de cada sección y pantalla completa: su change.
- Fuente del ajuste de tema y su control: `ajustes-de-usuario`.
- Diálogo de confirmación reutilizable: `libros`, con la política de cierre fijada aquí.
- Indicador sin conexión dentro de Repaso: `sesion-de-repaso`.
- Icono definitivo de la app y afinado de tonos: sobre la app real, después.
