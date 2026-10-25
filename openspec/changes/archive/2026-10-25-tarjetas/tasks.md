# Tasks

> Fase B (ejecución, Claude Opus 5.5), en la rama única `feature/reescritura-cadence` y en el orden del README, tras `capitulos`. Cada tarea de código va precedida por su prueba en rojo (skill `tdd`). Antes de marcar una tarea: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` en verde. Componentes en su carpeta con cuatro archivos; cero literales; textos en `features/biblioteca/biblioteca.copy.ts`. Si el design no cuadra con el código: `/opsx:update`, anotar el porqué, no improvisar.

## 1. Dominio y cerebro puro

- [x] 1.1 Crear `src/app/domain/models/card.model.ts` (`Card`, `CardScheduling`, `CardState`, `CardType`, `CardDirection`, `CardContentDraft`, `CardContentChanges`) y `src/app/domain/ports/card.repository.ts` (`listByChapter`, `create`, `createMany`, `updateContent`, `setSuspended`, `deleteWithCount`, `deleteManyWithCount`) con el fake `src/app/testing/fake-card-repository.ts` (mapa en memoria, contador de libro simulado, fallo por método); verificar `npm run typecheck` y `npm run lint`.
- [x] 1.2 Escribir en rojo `src/app/domain/models/card-scheduling.spec.ts` (`initialCardScheduling(now)`: `state 0`, todos los contadores en 0, `lastReview null`, `due === now`) y verificar que falla; implementar y verificar que pasa.
- [x] 1.3 Escribir en rojo `src/app/services/cards/normalize-card-text.spec.ts` (`  To   Give  Up ` → `to give up`) y `card-duplicates.spec.ts` (`findDuplicateCardIds`: distinta capitalización y espacios marca las dos, `get | obtener` vs `get | llegar` no, tres idénticas marca las tres; `isDuplicateDraft`: repetida con otro formato → `true`, mismo anverso otro reverso → `false`) y verificar que fallan; implementar y verificar que pasan.
- [x] 1.4 Escribir en rojo `src/app/services/cards/sort-cards-for-display.spec.ts` (`banana | fruta`, `Apple | manzana`, `apple | fruta roja` → `apple…`, `Apple…`, `banana…`; empate → la más vieja primero; la entrada no se muta) y verificar que falla; implementar y verificar que pasa.
- [x] 1.5 Escribir en rojo `src/app/services/cards/cloze/parse-cloze.spec.ts` (los ocho escenarios cloze de la spec con sus textos exactos, incluidos `{{}}` y `{{   }}` como literales y el hueco al inicio sin literal vacío) y verificar que falla; implementar `hasCloze`, `clozeSegments`, `clozeQuestion`, `CLOZE_BLANK` y verificar que pasa.
- [x] 1.6 Añadir en rojo a `src/app/features/biblioteca/biblioteca.copy.spec.ts` los casos de `bulkDeletionMessage(1)` y `(4)` (textos exactos de la spec) y `bulkDeleteLabel(4)` → "Borrar 4" y verificar que fallan; implementar con `pluralize` y verificar que pasan.
- [x] 1.7 Escribir en rojo `src/app/features/biblioteca/card-form.schema.spec.ts` (básica: recorta, `"   "` falla con "El anverso es obligatorio." / "El reverso es obligatorio.", 2001 caracteres falla, `example` opcional recortado; cloze: sin hueco falla con "Escribe un texto con al menos un hueco marcado con {{…}}.", con hueco pasa y no exige reverso) y verificar que falla; implementar `cardFormSchema` por tipo y verificar que pasa.

## 2. Cerebro: servicio de tarjetas (unitarias con fakes)

- [x] 2.1 Escribir en rojo `src/app/services/cards/cards.service.spec.ts`, bloque "recurso": `openChapter('c1')` lee con el uid de la sesión y, repetido, relee; repositorio que lanza → `status() === 'error'`; `signedOut` → "No hay una sesión activa." sin llamar; `sorted` y `duplicateIds` derivan del recurso; verificar que falla; implementar `CardsService` con `resource()` y verificar que pasa.
- [x] 2.2 Añadir en rojo el bloque "crear y editar": `create` entrega `direction forward`, `suspended false`, `noteId` no vacío y distinto en dos llamadas, `scheduling` igual a `initialCardScheduling`, recorta `front`/`back`, omite `example` vacío, no escribe `cardType` en básica, añade al recurso y llama a `books.changeCardCount(bookId, +1)`; `createMany` con 3 → +3, con lista vacía no llama al repositorio; `update` envía solo contenido (`example` vacío → `null`) y conserva `scheduling` y `suspended` en el recurso; verificar que falla; implementar y verificar que pasa.
- [x] 2.3 Añadir en rojo el bloque "suspender y borrar": `setSuspended` refleja en el recurso y relanza si falla sin cambiar nada; `remove` quita del recurso solo tras el éxito y llama a `changeCardCount(−1)`; `removeMany` con `[1, 3]` deja solo la 2 y llama con −2; con lista vacía no llama al repositorio; repositorio que lanza → relanza y el recurso no cambia; verificar que falla; implementar y verificar que pasa.

## 3. Infraestructura (integración con emulador)

- [x] 3.1 Escribir en rojo `tests/firestore/counted-batch.integration.spec.ts` (3 `set` con `delta +1` → un lote y `cardCount` +3; 1000 `delete` con `−1` → 3 lotes y −1000; lista vacía → sin escritura; `trailing` solo en el último lote; 900 operaciones donde el segundo grupo apunta a un árbol ajeno → `BatchCommitError` y `cardCount` bajó exactamente 448) y verificar que falla; implementar `writeInCountedBatches` en `src/app/infrastructure/firestore/counted-batch.ts` y verificar que pasa.
- [x] 3.2 Refactorizar `FirestoreChapterRepository.deleteWithCards` para usar `writeInCountedBatches` con el `delete` del capítulo como `trailing`; verificar que `chapter.repository.integration.spec` sigue en verde sin cambios.
- [x] 3.3 Escribir en rojo `src/app/infrastructure/firestore/schemas/card.schema.spec.ts` (objetos planos: sin `cardType` → básica; sin `suspended` → `false`; sin `learningSteps` → 0; `pronunciation` y `tags` conservados; sin `front` o `state 4` → falla) y verificar que falla; implementar `cardDocumentSchema` y verificar que pasa.
- [x] 3.4 Escribir en rojo `tests/firestore/card.repository.integration.spec.ts`, bloque "CRUD": `create` básica sin `cardType` ni `example` en el documento; cloze con `cardType cloze` y `back ""`; con `example` lo escribe recortado; `listByChapter` filtra por `chapterId`; `updateContent({ example: null })` elimina el campo y conserva `pronunciation` y `tags` sembrados; `setSuspended` cambia solo `suspended` y `updatedAt`; documento corrupto → `InvalidDocumentError`; verificar que falla; implementar `FirestoreCardRepository` (sin borrados aún) y verificar que pasa.
- [x] 3.5 Añadir en rojo el bloque "contador": `createMany` de 3 sobre `cardCount 10` → 13 en el mismo lote; `deleteWithCount` baja 1 y conserva un `reviewLog`; `deleteManyWithCount` de 2 → −2 y devuelve 2; verificar que falla; implementar con `writeInCountedBatches` y verificar que pasa; enlazar `CardRepository` en `provide-core.ts`.

## 4. Componentes compartidos y diálogo

- [x] 4.1 Escribir en rojo `src/app/shared/menu/action-menu/action-menu.component.spec.ts` (botón con el `aria-label` recibido; abrir muestra los `items` con sus etiquetas; elegir uno emite `selected(id)` y cierra; Escape cierra y devuelve el foco al botón; el panel lleva la clase sólida `menu-panel`) y verificar que falla; crear `ActionMenuComponent` sobre `@angular/cdk/menu` y la clase `menu-panel` en `styles.scss` (sin literales en el componente) y verificar que pasa.
- [x] 4.2 Escribir en rojo `src/app/features/biblioteca/card-form-dialog/card-form-dialog.component.spec.ts`:
  - Modo crear: "Nueva tarjeta", radio Básica/Cloze con Básica por defecto; anverso/reverso de solo espacios deshabilitan y muestran su mensaje al tocar; cambiar a Cloze muestra "Texto con huecos", oculta el reverso y exige hueco; volver a Básica reactiva el reverso.
  - "Más opciones" plegado por defecto, despliega Ejemplo; en editar con ejemplo aparece desplegado.
  - Aviso "Ya tienes una tarjeta igual en este capítulo." con `role="status"` cuando `isDuplicateDraft` es verdadero, botón habilitado; nunca en modo editar.
  - Modo editar: "Editar tarjeta", "Guardar", sin selector de tipo, cloze precargada.
  - Cancelar y Escape cierran sin resultado; "Guardando…", botones deshabilitados, Escape bloqueado, un solo `create` con dos envíos; servicio que lanza → abierto con el texto y "No se pudo guardar la tarjeta. Inténtalo de nuevo." en `role="alert"`; reintento cierra con la tarjeta.
  - Con `FakeConnectivity` sin red: botón principal deshabilitado con `NEEDS_CONNECTION_MESSAGE`; `setOnline(true)` lo habilita con el texto intacto.

  Verificar que falla; crear el componente con Signal Forms y verificar que pasa.

## 5. Listado

- [x] 5.1 Escribir en rojo `src/app/features/biblioteca/card-row/card-row.component.spec.ts`:
  - Básica `anverso → reverso`; cloze con etiqueta "cloze" y `El […] es […]`; "Repetida" con el indicador accesible cuando `isDuplicate`; icono "Tiene ejemplo" solo con `example`.
  - Menú con `aria-label="Acciones de «to give up»"` y Editar · Suspender · Borrar; en suspendida, "Reactivar", etiqueta "Suspendida" y atenuación por clase.
  - Tocar el cuerpo emite `edit`; en `selectionMode` muestra la casilla, oculta el menú y tocar emite `toggleSelect`.
  - Suspender: `aria-busy` mientras guarda, estado nuevo al terminar; servicio que lanza → vuelve y `role="alert"` con "No se pudo guardar. Inténtalo de nuevo." y `FakeLogger` recibe el detalle.
  - Sin red: menú deshabilitado.

  Verificar que falla; crear `CardRowComponent` (`glass-soft`, `press`, `createImmediateSetting`) y verificar que pasa.
- [x] 5.2 Escribir en rojo `src/app/features/biblioteca/card-list/card-list.component.spec.ts` con `FakeCardRepository` y `FakeConnectivity`:
  - Al iniciar llama a `openChapter`; esqueleto `aria-busy` sin cabecera; error "No pudimos cargar las tarjetas" con Reintentar y sin vacío; vacío con título, frase, "Crear tarjeta" e "Importar tarjetas" (emite `importRequested`) y sin "Seleccionar".
  - Con tarjetas: cabecera con "Seleccionar", "Importar tarjetas", "Nueva tarjeta"; filas en el orden de `sorted`; las repetidas marcadas.
  - "Nueva tarjeta" abre el diálogo con `chapterCards` y la devuelta aparece; editar desde la fila abre con la tarjeta y refleja el cambio.
  - Borrar: confirmación con el anverso (o pregunta compacta) y "Se pierde su progreso de estudio. No se puede deshacer."; `false` → nada; `true` → la fila sale y emite `contentsChanged`; acción que rechaza → la fila sigue.
  - Selección: casillas, barra con "1 seleccionada"/"3 seleccionadas" en `aria-live`, "Eliminar" deshabilitado sin marcadas, menús y "Nueva tarjeta" ocultos, "Seleccionar todas" alterna 5/0, "Cancelar selección" limpia, `destroy` limpia; "Eliminar" abre la confirmación con el mensaje plural y "Borrar 4"; `true` → quedan las no seleccionadas, modo cerrado, `contentsChanged`; acción que rechaza → selección activa.
  - Sin red: "Nueva tarjeta" y "Seleccionar" deshabilitados, lista visible.

  Verificar que falla; crear `CardListComponent` y verificar que pasa.
- [x] 5.3 Ampliar en rojo `src/app/features/biblioteca/capitulo-detail-page/capitulo-detail-page.component.spec.ts`: en `ready` la región "Tarjetas" pinta `app-card-list` con `bookId` y `chapterId`; en los demás estados no (*corregido por `/opsx:update` el 2026-10-25: el detalle no pinta conteo del capítulo, así que `contentsChanged` no tiene nada que refrescar; ver design, sección 7*); verificar que falla; sustituir la región provisional y verificar que pasa.

## 6. Verificación manual y documentación

- [x] 6.1 (Manual) Con emuladores: crear básicas y una cloze, una con ejemplo (icono) y una repetida (aviso y marca); editar y vaciar el ejemplo (el campo desaparece en la UI del emulador); suspender y reactivar; borrar una y varias con selección, comprobando `cardCount` y el conteo del capítulo; con DevTools en "Offline", comprobar acciones deshabilitadas y lista visible; comprobar el menú `⋯` con teclado y lector de pantalla, las dos capas de acrílico y el panel del menú sólido; con reducir transparencia todo sólido. Anotar el resultado en el mensaje del commit.
- [x] 6.2 Actualizar `README.md` (`writeInCountedBatches`, `ActionMenu`, programación inicial en dominio) y anotar en `MEMORY.md` el cierre del change con el tamaño del bundle.

## 7. Cierre

- [x] 7.1 Ejecutar en orden `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build`, y verificar que todos terminan en verde. Luego `/opsx:archive tarjetas` y un único commit de cierre `feat(tarjetas): …` con el código, las pruebas y el archive; push de respaldo de la rama sin abrir PR.
