# Specs base — fuente de verdad de la reescritura

> Cada carpeta describe UNA capacidad de la app actual (v0.1.1) como comportamiento observable:
> `Purpose` + `Requirements` (SHALL) + `Scenarios` (WHEN/THEN), en español, sin nombres de clases,
> archivos ni librerías. Se escribieron leyendo el código real y sus tests (2026-10-01 / 2026-10-11)
> y reflejan lo que la app HACE hoy, no lo ideal. Las inconsistencias y bugs encontrados al
> escribirlas están en `docs/hallazgos-codigo-actual.md`: decidir ahí qué se corrige en la reescritura.
> Validar con `openspec validate --specs`.

## Mapa de capacidades

| Spec | Qué cubre | Orden sugerido de reescritura |
| --- | --- | --- |
| `plataforma-datos-y-offline` | Datos privados por usuario, reglas de acceso, índices, offline, PWA, cabeceras, validación en la frontera, lotes | 1 (cimientos) |
| `navegacion-y-shell` | Hoy · Biblioteca · Progreso · Ajustes, rutas a pantalla completa, EmptyState/ErrorState, modal, footer de versión, tokens claro/oscuro, a11y | 2 |
| `autenticacion-y-acceso` | Login email/Google, registro, guards, allowlist (early access), perfil al primer acceso, logout | 3 |
| `ajustes-de-usuario` | Ajustes globales (default de nuevas, sugerencia por tiempo, timezone, dayStartHour, theme) | 4 |
| `libros` | CRUD de libros, ajustes por libro, contador, disparador "Estudiar" | 5 |
| `capitulos` | CRUD de capítulos, orden, navegación, disparadores Estudiar/Practicar | 6 |
| `tarjetas` | Modelo materia-agnóstico, básica/cloze, CRUD, repetidas, selección múltiple, borrado masivo | 7 |
| `programacion-espaciada` | Contrato FSRS: estado inicial, transiciones, previsualización, formato de intervalos | 8 (cerebro) |
| `cola-diaria` | Día de estudio, vencidas + nuevas, topes por libro, ajuste de nuevas por sesión, desglose, pantalla Hoy | 9 (cerebro) |
| `sesion-de-repaso` | Pantalla de repaso, revelar, 4 cerebros, sugerencia por tiempo, persistencia todo-o-nada, fin de sesión | 10 |
| `importacion` | Formato de texto, parser con errores por línea, previsualización, agregar vs reemplazar, importar libro | 11 (cerebro) |
| `progreso` | Métricas del día, distribución de calificaciones, colección por estado, eficiencia de lecturas | 12 |
| `practica-quiz` | Mini-quiz por capítulo (opción múltiple + escribir), sin tocar la programación | 13 |

## Cómo se usan

En el proyecto nuevo cada capacidad se implementa como un change de OpenSpec:
`opsx:propose` (copiando los requisitos de la spec base como `## ADDED Requirements`, ajustados con
las decisiones tomadas sobre los hallazgos) → `opsx:apply` con la skill `tdd` → `opsx:archive`.
Las specs base se actualizan solo vía delta de un change (`opsx:sync`), nunca a mano.
