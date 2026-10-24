# Design

## Context

Ver `proposal.md` (Why) y el delta `specs/tarjetas/spec.md`. Estado esperado de `dev` cuando este change se ejecute (tras `capitulos`):

- De `capitulos`: `CapituloDetailPageComponent` con `resolveChapterDetail`, zona de acciones vacía y `<section aria-label="Tarjetas">` provisional pintada solo en `ready`; `ChaptersService.cardCountFor` (conteo por capítulo); `chapterDeletionDetail`; patrón "un `BatchWriter` por grupo con su `increment(-N)`" en `FirestoreChapterRepository.deleteWithCards`.
- De `libros`: `BookRepository.incrementCardCount`, `BooksService.changeCardCount`, `totalsFor`; `ConfirmDialogComponent` con `{ title; message; detail?; confirmLabel; pendingLabel; errorMessage; action }` que bloquea sin red; `pluralize`; `bookFormSchema`.
- De `ajustes-de-usuario`: `createImmediateSetting(persisted, save, logger)` con reversión; `NEEDS_CONNECTION_MESSAGE`.
- De `navegacion-y-shell`: `DialogService`, `EmptyState`, `ErrorState`, `Skeleton`, `IconComponent`, `ConnectivityPort`, `FakeConnectivity`.
- De `plataforma-datos-y-offline`: `parseDocuments`, `firestoreTimestamp`, `InvalidDocumentError`, `BatchWriter`, `MAX_BATCH_SIZE`, `tests/support/firestore-test-environment.ts`.
- Verificado en `node_modules`: `@angular/cdk@22.2.4` exporta `menu` (`CdkMenuTrigger`, `CdkMenu`, `CdkMenuItem`).
- Código viejo de referencia en `backup/old-version` (`domain/models/card.model.ts`, `services/cards.service.ts`, `services/card-duplicates.ts`, `services/cloze/parse-cloze.ts`, `infrastructure/firestore/{card.repository.firestore,schemas/card.schema}.ts`, `features/biblioteca/{card-form-dialog,capitulo-detail}`): se reescribe con TDD. Allí la programación inicial la daba el adaptador de ts-fsrs (`createEmptyCard`), que llega con `programacion-espaciada` (8.º), después de este change (7.º).

## Goals / Non-Goals

**Goals:**
- Que `programacion-espaciada`, `cola-diaria` y `sesion-de-repaso` encuentren hechos el modelo, el esquema y el repositorio de tarjetas, y solo añadan sus lecturas y `updateScheduling`.
- Que `importacion` reutilice `createMany` y el ayudante de lotes con descuento sin tocar la UI de aquí.
- Cerebro puro (normalización, repetidas, orden, cloze) con la cobertura más densa del change.

**Non-Goals:**
- Calificar, cola, repaso, importar: sus changes.
- Bidireccional, mover de capítulo, filtrar, suspender en masa.

## Decisions

### 1. Modelo y puerto (`domain/models/card.model.ts`, `domain/models/card-scheduling.ts`, `domain/ports/card.repository.ts`; capa dominio)

`Card`, `CardScheduling`, `CardState`, `CardType`, `CardDirection` como en la 0.1.1 (compatibles con los datos). `CardContentDraft = { cardType; front; back; example?: string }`.

**Programación inicial como valores puros:** `initialCardScheduling(now: Date): CardScheduling` en `domain/models/card-scheduling.ts` devuelve `{ due: now, stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, learningSteps: 0, reps: 0, lapses: 0, state: CardState.New, lastReview: null }`. Son exactamente los valores que la spec base de `programacion-espaciada` exige ("Una tarjeta nueva nace lista para estudiarse de inmediato"), y no hay algoritmo que reimplementar: es un registro inicial. `programacion-espaciada` añade la prueba de que coincide con `createEmptyCard(now)` de ts-fsrs. *Alternativa descartada:* adelantar el puerto de scheduling y su adaptador a este change: mezcla dos capacidades y obliga a decidir aquí los parámetros del algoritmo.

`CardRepository` (clase abstracta): `listByChapter(uid, chapterId)`, `create(uid, input)`, `createMany(uid, inputs)` (lotes, con `increment(+N)` del libro por lote), `updateContent(uid, cardId, changes: CardContentChanges)` donde `example: string | null` significa "eliminar el campo", `setSuspended(uid, cardId, suspended)`, `deleteWithCount(uid, bookId, cardId)` y `deleteManyWithCount(uid, bookId, cardIds): Promise<number>`. `listByBook`, `listDue`, `countByState` y `updateScheduling` los añaden `cola-diaria`, `progreso` y `programacion-espaciada` al puerto cuando los necesiten.

*Por qué el repositorio escribe en el libro:* el descuento o la suma del contador tiene que ir en el mismo lote atómico que las tarjetas (hallazgo 7). Es el mismo criterio que `capitulos` y `libros`. Fake `testing/fake-card-repository.ts`: mapa en memoria, contador de libro simulado, fallo por método.

### 2. Esquema y repositorio (`infrastructure/firestore/schemas/card.schema.ts`, `card.repository.firestore.ts`; capa infraestructura)

- **Esquema:** `cardType: z.enum(['basic','cloze']).optional()`, `learningSteps: z.number().default(0)`, `suspended: z.boolean().default(false)`, `state: z.number().int().min(0).max(3)`, `lastReview: z.union([firestoreTimestamp, z.null()])`, opcionales `.optional()`. Al escribir, los opcionales ausentes **no se envían** (sin `undefined` en el documento) y `cardType` solo si es `cloze`.
- **`listByChapter`:** `where('chapterId', '==', chapterId)` sin orden del servidor: el orden lo da el servicio (anverso normalizado), que el servidor no puede calcular.
- **`updateContent`:** `example === null` → `deleteField()`; `example` string → se escribe recortado; `undefined` → no se toca.
- **Ayudante de lotes con descuento:** `infrastructure/firestore/counted-batch.ts` exporta `writeInCountedBatches({ firestore, bookRef, operations, delta, trailing? })`: parte las operaciones en grupos de `MAX_BATCH_SIZE - 2` (448), y cada grupo es un `BatchWriter` con sus operaciones más `update(bookRef, { cardCount: increment(delta × grupo.length) })`; el último grupo añade además la operación `trailing` si se pasa (el `delete` del capítulo en `capitulos`, el `set` del libro en `importacion`). Así cada lote queda en 450 como máximo con un tamaño único para los tres consumidores. Devuelve `{ batches; written }` y propaga `BatchCommitError`. Segundo caso real: `capitulos` ya lo hacía en `deleteWithCards` (se refactoriza para usarlo) y aquí lo usan `createMany` (+1) y `deleteManyWithCount` (−1).

### 3. Cerebro puro (`services/cards/`; capa servicios)

- `normalize-card-text.ts`: `normalizeCardText(text)` (recortar, minúsculas, colapsar espacios).
- `card-duplicates.ts`: `findDuplicateCardIds(cards)` (grupos por `front`+`back` normalizados, marca todas), `isDuplicateDraft(draft, cards)` para el aviso del formulario: misma normalización, una sola fuente.
- `sort-cards-for-display.ts`: orden anverso → reverso normalizados → `createdAt`.
- `cloze/parse-cloze.ts`: `hasCloze`, `clozeSegments`, `clozeQuestion`, `CLOZE_BLANK`. `sesion-de-repaso` y `practica-quiz` los reutilizan.
- `cards.service.ts`: `chapterId = signal<string|undefined>`, `cards = resource({ params, loader: listByChapter })`, `openChapter(chapterId)` (relee siempre), `sorted = computed(sortCardsForDisplay)`, `duplicateIds = computed(findDuplicateCardIds)`. Mutaciones locales sobre el recurso: `create(bookId, chapterId, draft)` (recorta, `noteId = crypto.randomUUID()`, `direction = forward`, `scheduling = initialCardScheduling(new Date())`, `suspended = false`, `example` omitido si vacío; añade al recurso y `books.changeCardCount(+1)`), `createMany` (igual, N; lo usa `importacion`), `update(cardId, draft)` (solo contenido; `example` vacío → `null`), `setSuspended(cardId, value)`, `remove(bookId, cardId)`, `removeMany(bookId, ids)` (tras el éxito quita las borradas y resta N). Todas exigen `requireSessionUid`. Los textos de error viven en `biblioteca.copy.ts`.

### 4. Menú de acciones compartido (`shared/menu/`; capa UI)

`ActionMenuComponent`: un botón de icono `⋯` con `aria-label` que recibe el nombre ("Acciones de «to give up»"), `CdkMenuTrigger` y un `CdkMenu` con `CdkMenuItem` por acción; contrato `items: ActionMenuItem[] = { id; label; icon; destructive? }` y salida `selected(id)`. El panel es `glass` (misma clase `dialog-*`/overlay del CDK que los diálogos), se cierra con Escape y devuelve el foco al botón. *Por qué nace aquí:* la fila de tarjeta tiene tres acciones y dos de ellas cambian de etiqueta; botones de icono como en capítulos no caben en móvil. Segundo caso real previsto: las filas de libro y capítulo si crecen (hoy no se migran).

### 5. Formulario (`features/biblioteca/card-form-dialog`, `card-form.schema.ts`; capa UI)

- Signal Forms con esquema Zod discriminado por tipo: básica `{ front: text(1, 2000, 'El anverso es obligatorio.'), back: text(1, 2000, 'El reverso es obligatorio.'), example: z.string().trim().max(2000).optional() }`; cloze `{ front: text(...).refine(hasCloze, 'Escribe un texto con al menos un hueco marcado con {{…}}.'), example }`. `text()` es un helper local que encadena `trim().min().max()` como `bookFormSchema`.
- `DIALOG_DATA`: `{ mode: 'create'; chapterCards: Signal<Card[]> } | { mode: 'edit'; card: Card }`. Devuelve la `Card` creada o actualizada.
- Selector de tipo solo en `create` (radio "Básica" / "Cloze (rellenar el hueco)"). Cambiar a Básica reactiva la validación del reverso.
- "Más opciones": `<button aria-expanded>` que muestra el `textarea` Ejemplo; abierto de inicio si `card.example` existe.
- Aviso de repetida: `computed(() => mode === 'create' && isDuplicateDraft(value(), chapterCards()))` → `<p role="status">` bajo los campos; sin debounce (es una comparación en memoria sobre decenas de tarjetas).
- Botón principal deshabilitado si inválido, `saving` o `!online()`; sin red, `NEEDS_CONNECTION_MESSAGE` dentro. Error con `role="alert"` dentro; `close(card)` solo con éxito.

### 6. Listado y fila (`features/biblioteca/card-list`, `card-row`; capa UI)

- **`CardListComponent`**: recibe `bookId` y `chapterId`; al iniciar `cards.openChapter(chapterId)`; sustituye la región "Tarjetas" del detalle. Según `status()`: `Skeleton` (3 filas), `ErrorState` con `retry`, `EmptyState` de onboarding con "Crear tarjeta" e "Importar tarjetas" (este último emite `importRequested`, que `importacion` conectará; hasta entonces el detalle lo deja sin destino visible), o cabecera ("Seleccionar", "Importar tarjetas", "Nueva tarjeta") y `<ul>` de filas. Gestiona el modo selección (`selectionMode`, `selectedIds`, `allSelected`, barra con contador `pluralize(n, 'seleccionada', 'seleccionadas')` en `aria-live`), abre el formulario y las confirmaciones, y hace `DestroyRef.onDestroy(() => limpiar selección)`. Tras cualquier borrado, emite `contentsChanged` para que el detalle refresque el conteo del capítulo (`ChaptersService.cardCountFor`).
- **`CardRowComponent`**: entradas `card`, `isDuplicate`, `selectionMode`, `selected`; salidas `edit`, `toggleSelect`, `delete`, `suspendedChange`. `<li>` `glass-soft` + `press`; el cuerpo es un `<button>` que emite `edit` (o `toggleSelect` en selección); etiquetas: "cloze", "Repetida" (con el indicador accesible de la spec), "Suspendida", icono "Tiene ejemplo". `suspended` se gestiona con `createImmediateSetting(() => card.suspended, (v) => cards.setSuspended(card.id, v), logger)`: fila `aria-busy` mientras guarda, error `role="alert"` junto a la fila si falla. En selección, el menú se oculta y aparece la casilla. Atenuación por token (`opacity` de tokens, no literal) más la etiqueta de texto.
- Confirmaciones vía `ConfirmDialogComponent`: individual con `message = anverso` (o `clozeQuestion`) y `detail = "Se pierde su progreso de estudio. No se puede deshacer."`, `action = () => cards.remove(...)`; masiva con los textos de la spec (`bulkDeletionMessage(n)` puro en `biblioteca.copy.ts`), `confirmLabel = "Borrar N"`, `action = () => cards.removeMany(...)`. Con `true`, la masiva cierra el modo selección.

### 7. Integración en el detalle del capítulo

`CapituloDetailPageComponent` sustituye la región provisional por `<app-card-list>` en `ready` y refresca `cardCountFor` ante `contentsChanged`. La zona de acciones sigue vacía (la llenan `cola-diaria` y `practica-quiz`). Sin cambios de rutas.

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Barra de navegación | `glass` | 1 |
| Filas de tarjeta | `glass-soft` + `press` (escala; sin desenfoque animado) | 2 |
| Panel del menú `⋯` y de los diálogos | `glass` (overlay del CDK); el fondo oscurecido del diálogo tapa la lista; el menú es pequeño y flota sobre una sola fila | sustituye a la lista / puntual |
| Cabecera del capítulo, barra de selección, estados, esqueleto | sólidos o sin fondo | 0 |

Con `prefers-reduced-transparency`, todo sólido por tokens. El menú abierto sobre las filas es la única vez que un vidrio flota sobre otro: se evita con el panel del menú **sólido** (clase `menu-panel` sin `backdrop-filter`), que es lo que el ADR pide para elementos pequeños sobre acrílico.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `Card`, `CardScheduling`, `CardState`, `CardContentDraft`, `initialCardScheduling(now)` | `programacion-espaciada` (prueba de equivalencia con ts-fsrs), `cola-diaria`, `sesion-de-repaso`, `importacion`, `progreso` |
| `CardRepository` (`listByChapter`, `create`, `createMany`, `updateContent`, `setSuspended`, `deleteWithCount`, `deleteManyWithCount`) y `FakeCardRepository` | `importacion` (`createMany`), `cola-diaria`/`progreso` añaden lecturas, `programacion-espaciada` añade `updateScheduling` |
| Esquema Zod de tarjeta con compatibilidad hacia atrás | Todos los que leen tarjetas |
| `writeInCountedBatches` (`infrastructure/firestore/counted-batch.ts`) | `importacion` (libro al final), `capitulos` (refactor de `deleteWithCards`) |
| `normalizeCardText`, `findDuplicateCardIds`, `isDuplicateDraft`, `sortCardsForDisplay`, `hasCloze`, `clozeSegments`, `clozeQuestion` | `importacion` (repetidas en la previsualización, cloze), `sesion-de-repaso`, `practica-quiz`, `exportacion-de-libros` |
| `CardsService.cards`, `openChapter`, `createMany`, `sorted` | `importacion` (añadir sin recargar), `cola-diaria` ("Estudiar este capítulo" con las tarjetas cargadas), `practica-quiz` |
| `ActionMenuComponent` en `shared/menu` | Filas de libro y capítulo si crecen |
| `CardListComponent.importRequested` | `importacion` conecta su diálogo |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Tarjeta creada desde el formulario; Cada tarjeta es independiente en el MVP; Programación inicial | `cards.service.spec`: `create` entrega `direction = forward`, `suspended = false`, `noteId` no vacío y distinto entre dos tarjetas; `card-scheduling.spec`: `initialCardScheduling(now)` da `state 0`, ceros, `lastReview null`, `due === now` | unitaria pura |
| Tarjeta nueva sin campos futuros; Tarjeta con campos futuros ya presentes; Crear con ejemplo; Ejemplo en blanco no se guarda; Vaciar el ejemplo al editar | `card.repository.integration.spec`: documento creado sin `example` no tiene la clave; con `example` la tiene recortada; `updateContent({ example: null })` elimina el campo y conserva `pronunciation` y `tags` sembrados; `cards.service.spec`: `example` de solo espacios → omitido; vaciar al editar → `null` | integración + unitaria pura |
| Tarjeta sin tipo; Tarjeta básica guardada; Tarjeta cloze guardada; Tarjeta sin bandera de suspensión; Tarjeta anterior a los pasos de aprendizaje; Registro corrupto | `card.schema.spec` (unitaria con objetos planos): sin `cardType` → básica; sin `suspended` → `false`; sin `learningSteps` → 0; sin `front` o `state 4` → falla; `card.repository.integration.spec`: básica no escribe `cardType`, cloze escribe `cloze` y `back ""` | unitaria pura + integración |
| Un hueco válido; Sin marcadores; Marcador vacío no cuenta; Varios huecos; Segmentos con recorte; Texto sin huecos; Hueco al inicio; Pregunta compacta | `parse-cloze.spec`: cada escenario con su texto exacto | unitaria pura |
| Creación válida con espacios sobrantes; Reverso vacío; Texto demasiado largo; Cloze sin huecos; Cloze válida; Volver a Básica reactiva el reverso | `card-form.schema.spec`: recorte, mensajes exactos, 2001 caracteres falla, cloze sin hueco falla con su texto; `card-form-dialog.component.spec`: botón deshabilitado y mensaje al tocar; cambiar de tipo alterna la validación | unitaria pura + componente |
| Repetida al escribir; Mismo anverso con otro reverso; Guardar una repetida avisada; Sin aviso al editar | `card-duplicates.spec`: `isDuplicateDraft` con los casos de la spec; `card-form-dialog.component.spec`: `role="status"` aparece y el botón sigue habilitado; en modo editar nunca aparece | unitaria pura + componente |
| Editar una básica; Editar una cloze; Tocar la fila; Editar una tarjeta con ejemplo | `cards.service.spec`: `update` conserva `scheduling` y `suspended`; `card-form-dialog.component.spec`: modo editar sin selector de tipo, cloze precargada, "Más opciones" abierto con ejemplo; `card-row.component.spec`: tocar el cuerpo emite `edit` | unitaria pura + componente |
| Suspender; Reactivar; Falla al suspender; Las suspendidas siguen contando | `card.repository.integration.spec`: `setSuspended` cambia solo `suspended` y `updatedAt`, `cardCount` intacto; `card-row.component.spec` con `FakeLogger`: "Suspender" → `aria-busy`, etiqueta "Suspendida" y acción "Reactivar"; servicio que lanza → vuelve y `role="alert"` con el texto | integración + componente |
| Borrado confirmado; Borrado cancelado; Falla el borrado | `card.repository.integration.spec`: `deleteWithCount` borra y baja `cardCount` en 1 en el mismo lote, conserva un `reviewLog`; `card-list.component.spec`: confirmación con el anverso y el detalle; `false` → nada; acción que rechaza → la fila sigue (el diálogo abierto lo prueba `confirm-dialog.component.spec`) | integración + componente |
| Alta individual; Alta masiva; Baja masiva; Lista vacía no toca el contador; Fallo a mitad de un borrado masivo; Más de un lote | `counted-batch.integration.spec`: 3 `set` con `+1` → `cardCount` +3 en un lote; 1000 `delete` con `−1` → 3 lotes y −1000; lista vacía → sin escritura; 900 operaciones donde el segundo grupo apunta a un árbol ajeno → `BatchCommitError` y `cardCount` bajó exactamente 448 (`MAX_BATCH_SIZE − 2` del primer grupo); `cards.service.spec`: `changeCardCount` recibe +1, +3, −2 | integración + unitaria pura |
| Orden alfabético agrupando la misma palabra; Desempate por antigüedad; Vista de una cloze; Menú de acciones nombrado | `sort-cards-for-display.spec`: los tres casos; `card-row.component.spec`: cloze con etiqueta y `El […] es […]`; `aria-label="Acciones de «to give up»"` y las tres opciones; `action-menu.component.spec` (shared): abre, Escape cierra, foco vuelve, `selected` emite el id | unitaria pura + componente |
| Normalización; Repetidas con distinta capitalización y espacios; Doble traducción intencional; Tres idénticas; Crear una repetida | `normalize-card-text.spec` y `card-duplicates.spec`: los cinco casos; `card-list.component.spec`: las marcadas muestran "Repetida" | unitaria pura + componente |
| Entrar al modo selección; Seleccionar todas y volver atrás; Cancelar limpia la selección; Salir de la pantalla limpia la selección | `card-list.component.spec`: casillas y barra, menús ocultos, "Seleccionar todas" alterna 5/0, "Cancelar selección" limpia, `destroy` limpia | componente |
| Mensaje en singular; Mensaje en plural; Borrado confirmado (masivo); Falla el borrado masivo | `biblioteca.copy.spec`: `bulkDeletionMessage(1)` y `(4)` exactos; `card-list.component.spec`: confirmación con "Borrar 4"; `true` → quedan las no seleccionadas, modo cerrado, `contentsChanged`; acción que rechaza → selección activa | unitaria pura + componente |
| Doble clic al guardar; Falla el guardado; Éxito limpia el error anterior | `card-form-dialog.component.spec`: un solo `create` con dos envíos; servicio que lanza → abierto con el texto y `role="alert"`; reintento cierra con la tarjeta | componente |
| Crear sin conexión; Listado sin conexión; Vuelve la conexión | `card-form-dialog.component.spec` y `card-list.component.spec` con `FakeConnectivity`: botones deshabilitados con `NEEDS_CONNECTION_MESSAGE`, lista visible, `setOnline(true)` habilita con el texto intacto | componente |
| Carga en curso; Falla la carga; Capítulo vacío | `card-list.component.spec`: esqueleto `aria-busy` sin cabecera; repositorio que lanza → "No pudimos cargar las tarjetas" y Reintentar, sin vacío; vacío → título, frase, dos botones y sin "Seleccionar"; `capitulo-detail-page.component.spec` ampliado: la lista solo en `ready` y `contentsChanged` refresca el conteo | componente |
| Sin sesión | `cards.service.spec`: `signedOut` → "No hay una sesión activa." sin llamar al repositorio | unitaria pura |

## Risks / Trade-offs

- [`initialCardScheduling` diverge de `createEmptyCard` en una versión futura de ts-fsrs] → `programacion-espaciada` fija la prueba de equivalencia; si cambia, se corrige en el dominio y la prueba avisa.
- [Menú flotante sobre filas de acrílico] → panel del menú sólido; el presupuesto de dos capas se mantiene.
- [Aviso de repetida solo contra el capítulo cargado] → documentado en la spec; la importación lo complementa en su previsualización.
- [`createImmediateSetting` por fila: una instancia por tarjeta] → son objetos ligeros con tres signals; con centenares de filas sigue siendo barato. Si molestara, se mueve al servicio con un mapa de estados.
- [Borrado masivo no atómico] → cada lote lleva su descuento; un fallo deja el contador correcto y reintentar termina (mismo criterio que capítulos y libros).
- [`capitulos` se refactoriza para usar `writeInCountedBatches`] → mismo comportamiento, sus pruebas de integración ya lo cubren; se hace al inicio de este change, con sus tests en verde antes y después.

## Migration Plan

Séptimo commit de la rama única `feature/reescritura-cadence` en la fase B. Sin datos, reglas ni índices nuevos. Rollback: revertir el commit.
