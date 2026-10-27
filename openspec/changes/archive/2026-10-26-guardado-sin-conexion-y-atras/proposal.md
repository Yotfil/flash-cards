# Proposal

## Why

Con un wifi sin internet ("lie-fi"), un diálogo que guarda se queda en "Guardando…" para siempre y sin salida, aunque lo escrito ya está guardado en el dispositivo (L-02, P-04). El "atrás" de Android, con un diálogo abierto, lo cierra y además navega (N-03). Tras practicar, "Salir" apila una entrada nueva y el "atrás" da un recorrido raro (PQ-05). El usuario lo decidió el 2026-10-26 (decisiones 8, 9 y 10 de la sexta sesión).

## What Changes

- **L-02/P-04 (dec. 8):** si un guardado no confirma en unos 6 s, los diálogos de libro (crear, editar, ajustes), capítulo, tarjeta de un capítulo y paquete dicen "Quedó guardado en este dispositivo; se enviará cuando vuelva la red." y dejan cerrar ("Cancelar" pasa a "Cerrar"; Escape y "atrás" cierran). Importar (diálogo del capítulo, su confirmación de reemplazo y la pantalla "Importar libro") dice "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app.", sin prometer que ya quedó guardada, y el diálogo también deja cerrar.
- **N-03 (dec. 9):** con un diálogo abierto, "atrás" solo lo cierra, como Escape, sin cambiar de pantalla; mientras guarda (antes del aviso) no hace nada.
- **PQ-05 (dec. 10):** "Salir" y "Volver…" de la práctica y de la práctica con IA regresan con la entrada anterior del historial; el "Salir" y el "Volver a Hoy" del repaso no dejan la sesión en el historial.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `navegacion-y-shell`: el diálogo deja de estar ocupado tras ~6 s sin confirmar; "atrás" con un diálogo abierto solo lo cierra.
- `libros`, `capitulos`, `tarjetas`: sus requisitos "en vuelo" suman el aviso y el cierre tras ~6 s.
- `importacion`: el diálogo del capítulo y la pantalla "Importar libro" suman su aviso tras ~6 s.
- `practica-quiz`, `practica-con-ia`, `sesion-de-repaso`: salir y volver no dejan la pantalla completa detrás en el historial.

## Impact

- `shared/dialog/dialog.service.ts` (ocupado con plazo, cierre por "atrás"), un ayudante de salida en `shared/navigation/`, la configuración del router (`canceledNavigationResolution: 'computed'`).
- Diálogos de libro, ajustes, capítulo, tarjeta, paquete, importación y confirmación de reemplazo; pantalla "Importar libro"; páginas de práctica, práctica con IA y repaso; copy de cada área.
- Sin cambios de datos, reglas ni lecturas.

## Fuera de alcance

- Los diálogos de borrar (libro, capítulo, tarjeta, paquete) y agregar o editar ítems de un paquete: usan transacciones o lecturas del servidor que no quedan en el dispositivo, así que no pueden decir "Quedó guardado". Siguen ocupados hasta que el servidor responde.
- Detectar el "lie-fi" o reintentar escrituras: Firestore ya las reenvía al volver la red.
- Que una importación cerrada a mitad termine sola si se cierra la app (solo el primer lote queda en el dispositivo).
