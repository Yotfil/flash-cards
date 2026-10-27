# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado del código en la rama única `feature/pendientes-de-la-revision` (`2ac24a4`), verificado el 2026-10-26:

- **EX-01 abierto.** `services/export/serialize-book-package.ts` escribe sin escapes (por spec) y nadie relee el texto: `ExportService.loadPackage` arma `text` y los conteos, y el diálogo solo muestra el resumen. `buildBookPackage` copia `chapter.name` tal cual: un capítulo sin nombre sale como `# ` y el parser lo omite ("Encabezado de capítulo sin nombre."), con sus tarjetas cayendo en el capítulo anterior.
- **EX-04 abierto.** `importar-libro-page.component.ts`: `canImport` exige `validCount() > 0`; el botón dice `importLabel(validCount)` ("Importar 0"). El repositorio (`import.repository.firestore.ts`) ya escribe capítulos sin tarjetas.
- **IM-06 abierto.** `ImportService.previewForBook` cuenta con `countRepeatedLines(draftsOf(parse), [])`, y `draftsOf` junta las tarjetas de todos los capítulos; el listado (`findDuplicateCardIds`) marca por capítulo.
- **IM-10 abierto.** `ImportPreviewComponent.omitted` mapea todos los errores y la plantilla pinta un `li` con icono por cada uno, sin tope.
- **IM-11 abierto.** La previsualización solo cuenta capítulos ("N capítulos"); no los nombra.
- **EX-05 casi resuelto, abierto en el borde.** `compareCardsForDisplay` desempata por `createdAt`; desde CD-02 las importadas nacen escalonadas, pero las importadas antes de ese arreglo comparten fecha y el orden lo decide el almacén.

## Goals / Non-Goals

**Goals:**
- Que el usuario sepa, antes de entregar el archivo, qué tarjetas no volverán igual, usando el mismo parser de la importación como juez (una sola gramática).
- Que el esqueleto de un libro (capítulos sin tarjetas) cierre la ida y vuelta.
- Una previsualización que diga lo mismo que el listado dirá después (repetidas por capítulo, capítulos con nombre) y que aguante un archivo equivocado.

**Non-Goals:**
- Escapes en la convención (decisión 13: más adelante).
- Cambiar el parser, el repositorio, los datos o las lecturas.
- Señalar el aplanado de saltos de línea (ver D2).

## Decisions

### D1. "Capítulo sin nombre" lo pone el paquete (servicio puro, `build-book-package.ts`)
`buildBookPackage` nombra cada capítulo con `chapter.name.trim() || UNNAMED_CHAPTER_NAME` (`'Capítulo sin nombre'`, junto a `ORPHAN_CHAPTER_NAME`). Es el mismo texto con que la Biblioteca muestra esos capítulos (`chapterDisplayName`, copy de la feature); la capa de servicios no puede importar copy de una feature, así que el literal vive en los dos sitios, cada uno con su comentario. El resumen ya cuenta el capítulo; no cambia.

### D2. La comprobación de la ida y vuelta, línea a línea con el parser (servicio puro, `cards-that-wont-return.ts`)
`cardsThatWontReturn(pkg: BookPackage): CardContentDraft[]` devuelve, en el orden del texto, las tarjetas **tal como se escriben** que no volverán igual.

El parser lee línea a línea y la única memoria entre líneas es "el capítulo actual". Por eso basta releer **cada línea sola** con `parseImportText` y llevar ese único estado:
- Por capítulo, se relee su encabezado (`serializeChapterHeader`). Si no vuelve como un capítulo con ese nombre, ninguna de sus tarjetas vuelve a su sitio: van todas.
- Por tarjeta, se relee su línea (`serializeCardLine`). Vuelve igual si da exactamente una tarjeta, sin errores, igual a la tarjeta tal como se escribe (tipo, anverso, reverso, ejemplo). Si la línea abre un capítulo (empieza por `#`), esa tarjeta no vuelve y **las siguientes del mismo capítulo tampoco** (caerían en el capítulo nuevo).

Así, la lista vacía equivale a que el texto entero vuelve idéntico: una prueba lo fija comparando con `parseImportText(serializeBookPackage(pkg))` sobre la matriz de la revisión. Se nombran también las que solo cambian de capítulo (escena del preprocesador: "pragma" cae en el capítulo "include…"), porque "no volverán igual" debe ser verdad para cada una.

"Tal como se escribe" (`writtenCard`, exportado por el serializador junto a sus dos funciones de línea): los campos aplanados y recortados con el mismo `flatten`, el reverso de una cloze vacío, y sin ejemplo si queda vacío. **Decidido por Claude:** el aplanado de saltos de línea no cuenta como "no vuelve igual": la spec ya lo acepta como la forma de escribir un campo en una línea y no mueve contenido de campo ni de capítulo; avisarlo llenaría el aviso de tarjetas de vocabulario con reversos en varias líneas. Puede vetarse en el PR.

Alternativas descartadas: parsear el texto entero y alinear capítulos y tarjetas (frágil cuando una tarjeta se vuelve capítulo); dar al parser números de línea por tarjeta (cambia un tipo que usan la importación, los paquetes y la práctica para un solo uso).

### D3. El resultado de `loadPackage` lleva la lista; el diálogo la pinta (servicio + UI)
`ExportPreview` gana `cardsThatWontReturn: readonly CardContentDraft[]`, calculado en `loadPackage` con D2 (puro, milisegundos). `ExportBookDialogComponent` pinta, bajo el resumen y solo si hay alguna, un bloque `data-wont-return`: el encabezado `wontReturnHeading(n)` ("1 tarjeta no volverá igual al importarla:" / "N tarjetas no volverán igual al importarlas:") y una lista de anversos con el icono `alert` en `text-text-faint`, texto `text-text-dim` y `max-h-60 overflow-y-auto` (el mismo trato que las líneas omitidas de la importación, sin color de error: avisa, no falla). No es `role="alert"`: aparece con el resumen al cargar, no interrumpe. Las acciones no cambian.

### D4. "Las primeras 100 y «y N más»" como pieza compartida (UI compartida, `@shared/text/limited-list.ts`)
Dos casos reales en este change (líneas omitidas e IM-10; tarjetas que no vuelven y EX-01): `limitList(items, max = LISTED_AT_MOST)` devuelve `{ shown, hiddenCount }` y `andMore(n)` da "y N más". `LISTED_AT_MOST = 100` (decisión 16). Cada lista mapea solo las `shown` (no arma 20000 textos para pintar 100).

### D5. Repetidas por capítulo al importar un libro (servicio puro, `ImportService.previewForBook`)
`repeatedCount = suma por capítulo de countRepeatedLines(chapter.cards, [])`. `previewForChapter` no cambia: en un capítulo, todo el texto cae en el mismo destino y se compara también con lo que ya tiene. `draftsOf` desaparece si nadie más lo usa.

### D6. Capítulos nombrados en la previsualización (UI, `import-preview`)
Con `showChapters` y al menos un capítulo, la previsualización pinta "Tarjetas por capítulo" y un `li` por capítulo con `chapterCountLine(name, n)` = "Unidad 1 · 24" (el texto de la decisión 17; el título le da sentido al número). Con más de `CHAPTERS_SHOWN_OPEN = 5` capítulos, va dentro de un `<details>` cerrado cuyo `<summary>` es ese título (nativo: teclado y lector sin código). **Decidido por Claude:** el umbral de 5 (un libro de vocabulario típico trae 8–12 unidades; el conteo "12 capítulos" ya está arriba) y que la lista salga también con un solo capítulo (muestra el nombre del capítulo por defecto). Las listas llevan `data-chapter-list` y `data-omitted-list` para que las pruebas no dependan del orden de los `li`.

### D7. El botón con capítulos y sin tarjetas (UI, `importar-libro-page`)
`canImport = (validCount() > 0 || chapterCount() > 0) && valid && !importing && online`. El texto: `importBookLabel(cards, chapters)` = `importLabel(cards)` si hay tarjetas, si no "Importar 1 capítulo" / "Importar N capítulos". El diálogo de importar tarjetas en un capítulo sigue con `validCount > 0` (los encabezados no crean capítulos ahí). El servicio y el repositorio ya escriben capítulos vacíos: se fija con una prueba de servicio y una de integración.

### D8. Desempate final por el texto tal cual (servicio puro, `sort-cards-for-display.ts`)
`compareCardsForDisplay` añade, tras `createdAt`, `compareExactly(a.front, b.front) || compareExactly(a.back, b.back)` por unidades de código (`a < b ? -1 : a > b ? 1 : 0`): `localeCompare` puede dar 0 entre textos distintos (formas NFC/NFD), las unidades de código nunca. Lo usan el listado, la exportación y la cola al desempatar: los tres ganan estabilidad sin cambiar ningún orden que ya estaba decidido.

### Superficies (ADR 0003)
Sin superficies nuevas. La previsualización sigue sólida (`bg-surface`); el `<details>` y el aviso del diálogo son texto dentro de superficies que ya existen. Ningún acrílico nuevo.

## Risks / Trade-offs

- [Un libro de programación grande puede mostrar un aviso largo] → Tope de 100 con "y N más" y lista con scroll; el conteo es exacto.
- [El aplanado de saltos de línea no se avisa] → Decidido por Claude (D2); la spec lo declara aceptado.
- [Releer cada línea cuesta una llamada al parser por tarjeta] → Puro y lineal; miles de tarjetas en milisegundos (el parser procesa 50000 líneas en 64 ms, sonda de IM-10).
- [El literal "Capítulo sin nombre" vive en dos capas] → Comentado en ambos; las capas no permiten compartirlo sin mover copy a servicios.
- [El esqueleto se importa con un toque] → Igual que importar tarjetas: nada se escribe sin el botón, y la previsualización nombra cada capítulo.

## Plan de pruebas

Cada escenario de los deltas → prueba y capa. Todas en rojo antes del código (TDD).

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `exportacion-de-libros`: Libro con dos capítulos, Ida y vuelta, Capítulo único y capítulo vacío, Tarjetas que perdieron su capítulo (ya cubiertos) | `serialize-book-package.spec`, `export-import-roundtrip.spec`, `build-book-package.spec` siguen en verde | unitaria |
| `exportacion-de-libros`: Capítulo sin nombre | `build-book-package.spec`: capítulo `''` y `'   '` → "Capítulo sin nombre"; `export-import-roundtrip.spec`: vuelve como 2 capítulos de una tarjeta (sonda 3 de la revisión) | unitaria |
| `exportacion-de-libros`: Libro sin tarjetas (al importarlo nacen) | `import.service.spec` (texto `# Unidad 1`, `# Unidad 2` → el repositorio recibe 2 capítulos vacíos y `cardCount 0`); `importar-libro-page.component.spec` ("Importar 2 capítulos" habilitado, sonda 5) | unitaria + componente |
| `exportacion-de-libros`: Repetidas creadas en el mismo instante | `build-book-package.spec`: `Apple`/`apple` con la misma fecha en los dos órdenes → mismo paquete (sonda 6) | unitaria |
| `exportacion-de-libros`: Salto de línea, Pipe dentro del anverso (ya cubiertos) | `serialize-book-package.spec`, `export-import-roundtrip.spec` siguen en verde | unitaria |
| `exportacion-de-libros`: Todo vuelve igual | `cards-that-wont-return.spec`: básicas con y sin ejemplo, cloze, `std::vector`, capítulos vacíos → `[]` | unitaria |
| `exportacion-de-libros`: Un " :: " dentro del reverso | `cards-that-wont-return.spec`: `map \| map :: …` → la tarjeta "map" | unitaria |
| `exportacion-de-libros`: Tarjetas que empiezan por "#" | `cards-that-wont-return.spec`: Preprocesador → `#define`, `#include`, `pragma`, en ese orden; una tarjeta de otro capítulo posterior no se nombra | unitaria |
| `exportacion-de-libros`: Un pipe en el anverso | `cards-that-wont-return.spec`: `ls \| grep` → nombrada; y la matriz de 10 casos de la sonda 1: cada uno está en la lista o vuelve igual | unitaria |
| `exportacion-de-libros`: Los saltos de línea no cuentan | `cards-that-wont-return.spec`: reverso con `\n` → `[]` | unitaria |
| `exportacion-de-libros`: (invariante de D2) | `cards-that-wont-return.spec`: para cada paquete de la matriz, lista vacía ⇔ `parseImportText(serializeBookPackage(pkg))` da los capítulos tal como se escriben y ningún error | unitaria |
| `exportacion-de-libros`: encabezado que no se lee | `cards-that-wont-return.spec`: capítulo de 121 caracteres → todas sus tarjetas | unitaria |
| `exportacion-de-libros`: (servicio) | `export.service.spec`: `loadPackage` devuelve `cardsThatWontReturn` con las del libro | unitaria |
| `exportacion-de-libros`: aviso en el diálogo, El aviso no impide entregar | `export-book-dialog.component.spec`: con una que no vuelve, "1 tarjeta no volverá igual al importarla:" y su anverso con icono; con tres, plural; sin ninguna, no hay bloque; con aviso, "Descargar .txt" entrega el texto | componente |
| `exportacion-de-libros`: Muchas tarjetas que no vuelven | `export-book-dialog.component.spec`: 150 → 100 anversos y "y 50 más" | componente |
| `exportacion-de-libros`: Abrir el diálogo, Falla la lectura, Reintentar, entrega, copiar, conexión (ya cubiertos) | `export-book-dialog.component.spec`, `libro-detail-page.component.spec` siguen en verde | componente |
| `importacion`: Previsualización con errores, Nada válido, Nada se guarda, Plural en singular (ya cubiertos) | `import-preview.component.spec`, `importar-libro-page.component.spec`, `card-import-dialog.component.spec` siguen en verde | componente |
| `importacion`: Un archivo equivocado de miles de líneas | `import-preview.component.spec`: 20000 líneas sin separador → "20000 líneas se omitirán:", 100 `li` con icono ("Línea 1" a "Línea 100") y "y 19900 más" | componente |
| `importacion`: (ayudante) | `limited-list.spec`: menos de 100, justo 100, 101 y 20000; `andMore` | unitaria |
| `importacion`: Capítulos nombrados con sus tarjetas | `import-preview.component.spec`: "Tarjetas por capítulo" con "Unidad 1 · 2" y "Unidad 2 · 0"; `importacion.copy.spec`: `chapterCountLine` | componente + unitaria |
| `importacion`: Un "#" de más se ve en la lista | `import-preview.component.spec`: "Preprocesador · 0" e "include \| incluye un archivo · 1" | componente |
| `importacion`: Muchos capítulos, lista plegada | `import-preview.component.spec`: 12 capítulos → `details` sin `open` con 12 `li`; 5 → sin `details` | componente |
| `importacion`: en un capítulo no se nombran capítulos | `import-preview.component.spec`: con `showChapters=false`, sin `data-chapter-list` | componente |
| `importacion`: Libro solo con capítulos | `importar-libro-page.component.spec`: "2 capítulos · 0 tarjetas" y "Importar 2 capítulos" habilitado; `importacion.copy.spec`: `importBookLabel` | componente + unitaria |
| `importacion`: En un capítulo, los encabezados no cuentan | `card-import-dialog.component.spec`: `# A` y `# B` → confirmar deshabilitado | componente |
| `importacion`: El esqueleto de un libro | `import.service.spec` (repositorio falso recibe 8 capítulos vacíos, `cardCount 0`); `import.repository.integration.spec`: `importBook` con 2 capítulos sin tarjetas → el libro y sus 2 capítulos existen, 0 tarjetas | unitaria + integración (8085) |
| `importacion`: Repetidas al importar un libro (ya cubierto) | `import.service.spec` sigue en verde | unitaria |
| `importacion`: La misma línea en dos capítulos del libro | `import.service.spec`: `# Unidad 1`/`to get \| conseguir`/`# Unidad 5`/`to get \| conseguir` → 0 repetidas (sonda 3 de importación) | unitaria |
| `importacion`: Repetida contra una existente, dentro del mismo texto, Sin repetidas (ya cubiertos) | `count-repeated-lines.spec`, `import.service.spec` siguen en verde | unitaria |
| `tarjetas`: Orden alfabético, Desempate por antigüedad (ya cubiertos) | `sort-cards-for-display.spec` sigue en verde | unitaria |
| `tarjetas`: Desempate final por el texto | `sort-cards-for-display.spec`: `Apple`/`apple` con la misma fecha, en los dos órdenes de entrada → mismo resultado | unitaria |

Sin e2e. Comprobar el aviso y la lista plegada en un navegador real queda para el usuario en el branch deploy.

## Migration Plan

Sin migración de datos ni de reglas. Despliegue por merge a `dev`. Rollback: revertir el PR; nada guardado depende del cambio.

## Contratos que deja listos

- `cardsThatWontReturn` + `serializeCardLine`/`serializeChapterHeader`/`writtenCard`: el día que lleguen los escapes, la misma prueba de invariante dice si el serializador y el parser cierran; la lista debería quedar vacía para todo lo que el formulario acepta.
- `limitList`/`andMore` (`@shared/text`): cualquier lista que pueda crecer sin control en una pantalla.
- `ExportPreview.cardsThatWontReturn`: la misma comprobación sirve si un día se exporta un capítulo o un paquete.
- `chapterCountLine` y la lista plegable de la previsualización: el patrón para nombrar grupos con su conteo.
