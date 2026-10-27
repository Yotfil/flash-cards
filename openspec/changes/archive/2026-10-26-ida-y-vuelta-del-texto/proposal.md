# Proposal

## Why

La revisión de la 1.0.0 encontró que "un archivo = un libro" no siempre cierra en las dos direcciones. Una tarjeta de programación como «map | map :: (a -> b) -> [a] -> [b]» o «#include | incluye un archivo» se exporta, y al volver a importarla cambia de campo, se vuelve capítulo o arrastra a otras a un capítulo que no existía, sin ningún aviso (EX-01). Un esqueleto de libro con capítulos y sin tarjetas se exporta, pero no se puede volver a importar (EX-04). Al importar un libro, la previsualización anuncia repetidas que el listado nunca marca (IM-06), un archivo equivocado de miles de líneas congela la lista de omitidas (IM-10) y los capítulos no se nombran, así que un `#` de más pasa sin verse (IM-11). Además, dos exportaciones del mismo contenido pueden salir en distinto orden (EX-05). El usuario decidió cada punto el 2026-10-26 (decisiones 13 a 17 de la sexta sesión); este change los aplica.

## What Changes

- **EX-01 (dec. 13)** Antes de entregar, la exportación vuelve a leer su propio texto con el parser de la importación. Si alguna tarjeta no volverá igual (se omitirá, cambiará de campo o de tipo, se volverá capítulo o caerá en otro capítulo), el diálogo dice "N tarjetas no volverán igual al importarlas:" con sus anversos. No impide entregar. Un capítulo sin nombre (de versiones anteriores) se exporta como `# Capítulo sin nombre`. Los escapes (`\#`, `\|`, `\::`) quedan para más adelante.
- **EX-04 (dec. 14)** Importar un libro con capítulos y 0 tarjetas se permite: el botón dice "Importar 8 capítulos" ("Importar 1 capítulo"). Sin capítulos ni tarjetas sigue deshabilitado. Importar tarjetas en un capítulo no cambia.
- **IM-06 (dec. 15)** Al importar un libro, las repetidas se cuentan dentro de cada capítulo del texto, que es como las marca el listado.
- **IM-10 (dec. 16)** La lista de líneas omitidas muestra las primeras 100 y "y N más"; el conteo total sigue exacto. El mismo tope rige la lista de tarjetas que no volverán igual (EX-01).
- **IM-11 (dec. 17)** Al importar un libro, la previsualización nombra cada capítulo con su número de tarjetas ("Unidad 1 · 24"), bajo "Tarjetas por capítulo"; con más de 5 capítulos, la lista va plegada.
- **EX-05 (sin decisión)** El orden del listado (y, por él, el de la exportación) desempata al final por el texto tal cual: dos exportaciones del mismo contenido dan siempre el mismo texto.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `exportacion-de-libros`: capítulo sin nombre, comprobación de la ida y vuelta con su aviso, libro sin tarjetas que sí vuelve, orden estable.
- `importacion`: botón con capítulos y sin tarjetas, repetidas por capítulo al importar un libro, tope de omitidas, capítulos nombrados en la previsualización.
- `tarjetas`: desempate final del orden del listado por el texto tal cual.

## Impact

- Servicios puros: `buildBookPackage` (nombre del capítulo vacío), `serializeBookPackage` (expone la línea de una tarjeta y de un encabezado), nueva `cardsThatWontReturn`, `ExportService.loadPackage` (la lista en el resultado), `ImportService.previewForBook` (repetidas por capítulo), `compareCardsForDisplay` (desempate).
- UI: diálogo de exportar (aviso con lista), previsualización de la importación (capítulos y tope), página "Importar un libro" (botón con capítulos), copy de biblioteca e importación; un ayudante compartido para "las primeras N y «y N más»".
- Sin cambios de datos, reglas, índices ni lecturas. El repositorio de importación ya escribe capítulos sin tarjetas.

## Fuera de alcance

- Escapes en la convención de texto (`\#`, `\|`, `\::`): la decisión 13 los deja para más adelante.
- Avisar en la importación (no en la exportación) de líneas ambiguas escritas a mano.
- Señalar el aplanado de saltos de línea: la spec ya lo acepta como la forma de escribir un campo en una línea.
- IM-12 (lecturas de la cola) y los puntos 7, 8 y 10: changes propios en la misma rama.
