# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Puerta antes de cada commit con `bash ../flash-cards/docs/herramientas/commit-verde.sh` (formatea, corre la puerta —lint, formato, tipos, unitarias, integración en el 8085 con `demo-cadence-test` y build— y solo si sale verde marca las tareas y hace commit, sin firmas). Unitarias de un área: `npx ng test --watch=false --include='src/app/<ruta>/**/*.spec.ts'`.

## 1. El orden del listado no depende del almacén (cerebro, EX-05)

- [ ] 1.1 Pruebas en rojo: `sort-cards-for-display.spec` (`Apple | manzana` y `apple | manzana` con la misma fecha, en los dos órdenes de entrada → mismo resultado); `build-book-package.spec` (las mismas en un capítulo, en los dos órdenes → mismo paquete). Verificar: fallan (hoy decide el orden de entrada).
- [ ] 1.2 Implementar D8 en `compareCardsForDisplay` (desempate final por unidades de código) con su comentario. Verificar: 1.1 en verde y el resto de pruebas de tarjetas, cola y exportación en verde.

## 2. Repetidas por capítulo al importar un libro (cerebro, IM-06)

- [ ] 2.1 Prueba en rojo en `import.service.spec`: `# Unidad 1`/`to get | conseguir`/`# Unidad 5`/`to get | conseguir` → `repeatedCount` 0; la misma línea dos veces en un capítulo → 2. Verificar: la primera falla (hoy 2).
- [ ] 2.2 Implementar D5 en `previewForBook`. Verificar: 2.1 en verde y la prueba existente de "Repetidas al importar un libro" en verde.

## 3. Capítulo sin nombre y la comprobación de la ida y vuelta (cerebro, EX-01)

- [ ] 3.1 Pruebas en rojo: `build-book-package.spec` (capítulo `''` y `'   '` → "Capítulo sin nombre"); `export-import-roundtrip.spec` (un capítulo sin nombre vuelve como capítulo aparte, sin líneas omitidas). Verificar: fallan.
- [ ] 3.2 Implementar D1 en `buildBookPackage`. Verificar: 3.1 en verde.
- [ ] 3.3 Pruebas en rojo en `cards-that-wont-return.spec` (función aún sin implementar, que devuelve `[]`): todo vuelve igual → `[]`; `map | map :: …` → "map"; Preprocesador → `#define`, `#include`, `pragma` y no la de un capítulo posterior; `ls | grep`; reverso con salto de línea → `[]`; capítulo de 121 caracteres → todas sus tarjetas; la matriz de 10 casos de la sonda 1; e invariante: lista vacía ⇔ el texto entero vuelve idéntico. Verificar: fallan las que esperan tarjetas.
- [ ] 3.4 Implementar D2: `serializeCardLine`, `serializeChapterHeader` y `writtenCard` exportados por el serializador (que los usa él mismo) y `cardsThatWontReturn`. Verificar: 3.3 en verde y el resto de pruebas de exportación en verde.
- [ ] 3.5 Prueba en rojo en `export.service.spec`: `loadPackage` de un libro con `#include | …` devuelve `cardsThatWontReturn` con esa tarjeta; uno sin problemas, `[]`. Verificar: falla.
- [ ] 3.6 Añadir `cardsThatWontReturn` a `ExportPreview` y calcularlo en `loadPackage` (D3). Verificar: 3.5 en verde.

## 4. Las primeras 100 (UI compartida, IM-10)

- [ ] 4.1 Pruebas en rojo en `@shared/text/limited-list.spec`: 3 elementos → todos y 0 ocultos; 100 → todos; 101 → 100 y 1; 20000 → 100 y 19900; `andMore(19900)` → "y 19900 más". Verificar: fallan (el archivo aún no exporta nada útil).
- [ ] 4.2 Implementar D4 (`limitList`, `andMore`, `LISTED_AT_MOST`). Verificar: 4.1 en verde.
- [ ] 4.3 Prueba en rojo en `import-preview.component.spec`: 20000 líneas sin separador → "20000 líneas se omitirán:", 100 `li` con icono en `[data-omitted-list]` ("Línea 1" a "Línea 100") y "y 19900 más"; adaptar las pruebas existentes de la lista a `[data-omitted-list]`. Verificar: falla (hoy 20000 `li`).
- [ ] 4.4 Aplicar el tope en `ImportPreviewComponent` (mapear solo las mostradas). Verificar: 4.3 en verde.

## 5. Capítulos nombrados en la previsualización (UI, IM-11)

- [ ] 5.1 Pruebas en rojo: `importacion.copy.spec` (`chapterCountLine('Unidad 1', 24)` → "Unidad 1 · 24"); `import-preview.component.spec` ("Tarjetas por capítulo" con "Unidad 1 · 2" y "Unidad 2 · 0"; Preprocesador → "Preprocesador · 0" e "include | incluye un archivo · 1"; 12 capítulos → `details` cerrado con 12 `li`; 5 → sin `details`; con `showChapters=false`, sin lista). Verificar: fallan.
- [ ] 5.2 Implementar D6 (copy, `computed` de las líneas de capítulo, plantilla con `<details>` por encima de 5). Verificar: 5.1 en verde.

## 6. Importar el esqueleto de un libro (EX-04)

- [ ] 6.1 Pruebas: `import.service.spec` (texto con 2 encabezados y nada más → el repositorio falso recibe 2 capítulos vacíos y `cardCount 0`, y el resumen dice 2 capítulos y 0 tarjetas); `import.repository.integration.spec` (`importBook` con 2 capítulos sin tarjetas → libro y 2 capítulos, 0 tarjetas). Verificar: pasan ya (fijan la premisa); la integración con la puerta (8085).
- [ ] 6.2 Pruebas en rojo: `importacion.copy.spec` (`importBookLabel(0, 1)` → "Importar 1 capítulo", `(0, 8)` → "Importar 8 capítulos", `(3, 2)` → "Importar 3"); `importar-libro-page.component.spec` (`# Unidad 1`/`# Unidad 2` → "2 capítulos · 0 tarjetas" y "Importar 2 capítulos" habilitado; texto vacío y solo inválidas → deshabilitado); `card-import-dialog.component.spec` (`# A`/`# B` → confirmar deshabilitado). Verificar: fallan las del libro.
- [ ] 6.3 Implementar D7 en la página y en el copy. Verificar: 6.2 en verde.

## 7. El aviso en el diálogo de exportar (UI, EX-01)

- [ ] 7.1 Pruebas en rojo en `export-book-dialog.component.spec` (y `biblioteca.copy.spec` para `wontReturnHeading`): con una que no vuelve, "1 tarjeta no volverá igual al importarla:" y su anverso con icono; con tres, "3 tarjetas no volverán igual al importarlas:"; sin ninguna, sin `[data-wont-return]`; con 150, 100 anversos y "y 50 más"; con aviso, "Descargar .txt" entrega el texto y cierra. Verificar: fallan.
- [ ] 7.2 Implementar D3 en el diálogo y en el copy. Verificar: 7.1 en verde y el resto de pruebas del diálogo en verde.

## 8. Cierre

- [ ] 8.1 README: los párrafos "Importar" y "Exportar" dicen lo nuevo (repetidas por capítulo, tope de 100, capítulos nombrados, esqueleto; la exportación se relee y avisa). Verificar: `npx prettier --check README.md`.
- [ ] 8.2 `openspec archive ida-y-vuelta-del-texto -y` dentro de la rama: las specs base de `exportacion-de-libros`, `importacion` y `tarjetas` llevan el delta. Verificar: `openspec validate --specs --strict` en verde y `openspec list` sin el change.
- [ ] 8.3 Bitácora de `MEMORY.md` y `docs/retome.md` con el punto 6 hecho. Verificar: los dos nombran el change como hecho.
