# Specs base — fuente de verdad de la reescritura

> **Estado (2026-10-25): las 15 capacidades están implementadas** (fase B, rama única
> `feature/reescritura-cadence`, un commit por change) y sus changes archivados en
> `openspec/changes/archive/`. Las specs base ya describen la app reescrita: los deltas se
> sincronizaron al archivar (`exportacion-de-libros` y `practica-con-ia` no llevaban delta: su spec
> base ya era la definitiva). Lo que sigue se hace con changes nuevos sobre estas specs.

> Cada carpeta describe UNA capacidad de la app actual (v0.1.1) como comportamiento observable:
> `Purpose` + `Requirements` (SHALL) + `Scenarios` (WHEN/THEN), en español, sin nombres de clases,
> archivos ni librerías. Se escribieron leyendo el código real y sus tests (2026-10-01 / 2026-10-11)
> y reflejan lo que la app HACE hoy, no lo ideal. Las inconsistencias y bugs encontrados al
> escribirlas están en `docs/hallazgos-codigo-actual.md`: decidir ahí qué se corrige en la reescritura.
> Validar con `openspec validate --specs`.

> **Excepción documentada:** `practica-con-ia` no describe código existente: es la primera capacidad
> diseñada directamente como spec base (2026-10-17, vía `opsx:explore`) para implementarse en su turno
> dentro de la reescritura. Añadió un requisito a `sesion-de-repaso` (la sesión recuerda las difíciles).
> `exportacion-de-libros` es la segunda (2026-10-24, vía `opsx:explore`): inverso de `importacion`, entra en 1.0.0.
> `practica-con-ia` se REESCRIBIÓ el 2026-10-24 en su explore (de "lotes de difíciles del repaso" a "paquetes de práctica
> de contenido propio"); la v1 queda en el historial de git. Su requisito añadido a `sesion-de-repaso` (recordar las
> difíciles) sigue vigente: la práctica de un paquete reutiliza esa pantalla y ese dato.

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
| `practica-con-ia` | **Paquetes de práctica**: rama aparte de los libros que el usuario llena a mano o pegando texto (≤ 20 ítems, ajustable), se practica a diario en la pantalla de repaso con los cuatro cerebros SIN FSRS ("para hoy" = nuevos + difíciles de días anteriores, conjunto fijado en la primera práctica del día, repetible), prompt copiable con todo lo repasado hoy y énfasis en lo difícil (`[[REPASADAS]]`/`[[DIFICILES]]`), completado solo a mano, historial. Vive en Biblioteca + bloque en Hoy + Ajustes. Cloze a prueba. **Capacidad nueva** (v1 2026-10-17 como lotes de difíciles; **rediseñada 2026-10-24 en su explore**) | 14 (último; release 1.1.0) |
| `exportacion-de-libros` | Exportar un libro como texto importable (inverso exacto de la importación: `# Capítulo`, `anverso \| reverso :: ejemplo`, cloze), contenido sin progreso; diálogo con resumen, Compartir (hoja del sistema) o Descargar `.txt` según el dispositivo, Copiar texto; necesita conexión. **Capacidad nueva** (propuesta 2026-10-22 en el explore de `libros`; spec base escrita en su explore el 2026-10-24) | 12, justo después de `importacion`; **entra en 1.0.0** (decidido 2026-10-24) |

## Cómo se usan

En el proyecto nuevo cada capacidad se implementa como un change de OpenSpec:
`opsx:propose` (copiando los requisitos de la spec base como `## ADDED Requirements`, ajustados con
las decisiones tomadas sobre los hallazgos) → `opsx:apply` con la skill `tdd` → `opsx:archive`.
Las specs base se actualizan solo vía delta de un change (`opsx:sync`), nunca a mano.
