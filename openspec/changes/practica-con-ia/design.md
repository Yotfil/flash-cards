# Design

## Context

Ver `proposal.md` (Why) y la spec base `openspec/specs/practica-con-ia/spec.md` (contrato completo; sin delta). Estado esperado de `dev` cuando este change se ejecute (15.º, tras `practica-quiz` y el release 1.0.0):

- De `sesion-de-repaso`: `review-session-state.ts` (núcleo por apariciones, reencolado, `preview`), `ReviewSessionService`, `GradePersistencePort`, `FlipCardComponent` (entrada `card: Card`), `RatingBarComponent` (entradas `previews`, `suggested`, `now`, `showKeyHints`), `SessionSummaryComponent` (textos "Sesión terminada"/"Volver a Hoy" fijos, hueco `[practice]`), `repaso.copy.ts`, teclado y guardias de toque en `RepasoPageComponent`.
- De `practica-quiz`: `HandoffTray<T>`, `SessionTopBarComponent` (shared), `StudyLaunchButtonComponent` con `prepare: () => Promise<number>` y `destination`.
- De `importacion`: `parseImportText`, `CardImportDialogComponent` (`{ bookId; chapterId; chapterName; chapterCards }`, modos agregar/reemplazar, `ImportService.importIntoChapter`), `ImportPreviewComponent`, `cardFormSchema` en `services/cards/`.
- De `tarjetas`: `CardFormDialogComponent` (`{ mode: 'create'; chapterCards } | { mode: 'edit'; card }`, guarda vía `CardsService`), `CardContentDraft`, `hasCloze`, `clozeSegments`, `normalizeCardText`, `ActionMenuComponent`.
- De `cola-diaria`: `studyDayId`, `HoyPageComponent` con las filas por libro y el pliegue; `exportacion-de-libros`: `FileDeliveryPort.copyText`, `FakeFileDelivery`; `ajustes-de-usuario`: `SessionService.updateSettings`, formulario con Guardar y T2, `boundedInteger`; `libros`: `BibliotecaPageComponent`, `ConfirmDialog`; plataforma: `firestore.rules` por colección, `parseDocuments`, `firestoreTimestamp`, `Logger`.
- No hay código viejo: la capacidad no existe en la 0.1.1.

## Goals / Non-Goals

**Goals:**
- Una sesión de práctica propia y pequeña (sin programación, sin reencolado, sin intervalos) que **reutiliza las piezas visuales del repaso** sin tocar su núcleo.
- Un documento por paquete: las reglas "fijar el conjunto del día" y "capacidad" se cumplen con escrituras simples sobre un solo documento.
- Prompt y "para hoy" como funciones puras con la cobertura más densa.

**Non-Goals:**
- Tocar `review-session-state.ts` o `ReviewSessionService`; practicar con FSRS; difíciles del repaso.

## Decisions

### 0. Generalizaciones previas (refactor; segundo caso real)

- **`CardFace`** en `domain/models/card.model.ts`: `Pick<Card, 'cardType' | 'front' | 'back' | 'example'> & { id: string }`. `FlipCardComponent.card` pasa a `CardFace`; `Card` lo cumple estructuralmente; `PracticeItem` también. Sin cambio de comportamiento.
- **`RatingBarComponent.previews`** pasa a opcional (`null`): sin previsualizaciones no pinta intervalo y el `aria-label` es solo la etiqueta (y "(sugerido)" si aplica); `suggested` también opcional. El repaso sigue pasando las suyas.
- **`SessionSummaryComponent`** gana entradas `title`, `countLabel`, `note` (opcional) y `backLabel`, y salida `back`; `RepasoPageComponent` le pasa los textos del repaso y navega a Hoy en `back`. El hueco `[practice]` se mantiene.
- **`CardFormDialogComponent`** acepta en `DIALOG_DATA` un `save?: (draft: CardContentDraft) => Promise<void>` y `existing?: Signal<CardFace[]>` para el aviso de repetida; sin `save`, guarda vía `CardsService` como hoy. Los paquetes pasan su propio `save`.
- **`CardImportDialogComponent`** acepta `target: { kind: 'chapter'; ... } | { kind: 'package'; packageName; existing: Signal<CardFace[]>; remaining: number; save: (drafts) => Promise<void> }`: con `package` oculta los modos (solo agregar), muestra "Caben N más en este paquete." en la previsualización cuando las válidas superan `remaining`, limita el botón a `min(válidas, remaining)` y guarda las primeras N válidas.

*Por qué generalizar y no copiar:* son las mismas máquinas de estados (voltear, calificar, cerrar, validar, previsualizar) con otro guardado; copiarlas duplicaría la parte difícil. Los designs de `sesion-de-repaso`, `tarjetas` e `importacion` quedan con la forma anterior; este design es la fuente (se anota en `MEMORY.md`).

### 1. Modelo, esquema y repositorio (`domain/models/practice-package.ts`, `domain/ports/practice-package.repository.ts`, `infrastructure/firestore/`; capas dominio e infraestructura)

```ts
interface PracticeItem { id; cardType; front; back; example?; lastGrade?: Rating; lastPracticedDayId?: string; addedAt: Date }
interface PracticePackage { id; name; capacity; status: 'open' | 'completed'; items: Record<string, PracticeItem>; itemOrder: string[];
                            todaySet?: { dayId: string; itemIds: string[] }; createdAt; completedAt?: Date }
```

- **Un documento por paquete** en `/users/{uid}/practicePackages/{id}`, ítems como **mapa** (`items.{itemId}.lastGrade` se actualiza con rutas punteadas sin reescribir el array) más `itemOrder` para el orden de inserción. Capacidad ≤ 100 → documento pequeño. *Alternativa descartada:* subcolección de ítems: multiplicaría lecturas y la regla "fijar el conjunto del día" exigiría transacciones.
- `PracticePackageRepository`: `listByUser(uid)` (todos, `orderBy('createdAt')`; abiertos y completados se separan en memoria: son decenas como mucho, sin índice compuesto), `create(uid, { name; capacity })`, `rename`, `delete`, `addItems(uid, id, drafts): Promise<PracticeItem[]>` (rechaza si `itemOrder.length + drafts.length > capacity`), `updateItem`, `removeItem`, `fixTodaySet(uid, id, { dayId; itemIds })`, `recordGrade(uid, id, itemId, { grade; dayId })` (un `update` de dos rutas), `complete(uid, id, completedAt)`. Esquema Zod `practicePackageSchema` con compatibilidad (`todaySet` opcional, `lastGrade` opcional). Fake en memoria con fallo por método y `resolveNext/rejectNext` para `recordGrade`.
- `firestore.rules`: `match /practicePackages/{packageId} { allow read, write: if isOwner(uid) && isAllowlisted(); }` + caso en `users.rules.spec`.

### 2. Cerebro puro (`services/practice-ai/`; capa servicios)

- `pending-items.ts`: `pendingItemIds(pkg, dayId): string[]` = `itemOrder` filtrado por `!lastPracticedDayId || (lastGrade <= 2 && lastPracticedDayId < dayId)` (los `dayId` son `YYYY-MM-DD` comparables como texto). `todayItemIds(pkg, dayId)` = `pkg.todaySet?.dayId === dayId ? pkg.todaySet.itemIds : pendingItemIds(pkg, dayId)`. `hasPracticedToday(pkg, dayId)` = `todaySet?.dayId === dayId`. `hardTodayIds(pkg, dayId)` = del conjunto del día, los con `lastPracticedDayId === dayId && lastGrade <= 2`.
- `build-prompt.ts`: `buildPrompt(template, reviewed: CardFace[], hard: CardFace[]): string`: `termLine(face)` = cloze → `front` sin `{{`/`}}`; básica → `front | back`; sustituye `[[REPASADAS]]`/`[[DIFICILES]]`; marcador ausente → `\n\n<rótulo>\n<lista>` al final con "Reviewed today:" / "Hard today:". `DEFAULT_PROMPT_TEMPLATE` con el texto exacto de la spec.
- `practice-ai-session-state.ts` (puro): `{ packageId; dayId; queue: PracticeItem[]; index; revealed; grades: Record<itemId, Rating>; status }`; `startPracticeSession(items, random)` (baraja, cada ítem una vez), `reveal`, `gradeCurrent(state, rating)` (registra y avanza; en el último → `finished`), `exit`. Sin reencolado ni previsualización: la spec dice "la calificación solo decide si vuelve mañana".
- `practice-ai-session.service.ts`: `PracticeAiSessionService` (`providedIn: 'root'`): `start(prepared: PreparedPracticeAi)`, `reveal()`, `grade(rating)` → `state.set(next)` y **sin `await`** `repo.recordGrade(uid, packageId, itemId, { grade, dayId }).catch(error => { logger.error; alerts.push(texto del repaso de rechazo) })`; `computed`: `current: CardFace`, `revealed`, `progress`, `position/total`, `ratingCounts`, `hardCount`, `reviewedFaces`, `hardFaces`, `status`. `reset()`.
- `practice-packages.service.ts`: `PracticePackagesService`: `packages = resource(listByUser)`, `open`, `completed` (computed), `findById`, `dayId = computed(studyDayId(now, settings))`, `pendingCountFor(id)`, `create/rename/remove/addItems/updateItem/removeItem/complete` con mutación local tras éxito, `prepareTodayPractice(id): Promise<number>` (calcula `todayItemIds`; si `!hasPracticedToday` → `fixTodaySet` (con red; sin red, la escritura queda en la cola del SDK y el conjunto se usa igual) → baraja → `handoff.hand({ packageId; dayId; items })` → devuelve el número), `promptFor(id)` (`buildPrompt(settings.promptTemplate ?? DEFAULT, reviewed, hard)`; para completados, todos en `reviewed` y `hard = []`).
- `PracticeAiHandoffService extends HandoffTray<PreparedPracticeAi>`.

### 3. Ajustes (`services/session`, `features/ajustes`)

`UserSettings` gana `promptTemplate?: string` (ausente = por defecto) y `practicePackageCapacity: number` (esquema con `default(20)`). La página de Ajustes añade la sección "Práctica con IA" al mismo formulario con Guardar: `promptTemplate: z.string().trim().min(1, 'La plantilla no puede estar vacía.')`, `practicePackageCapacity: boundedInteger(5, 100, 'Entre 5 y 100, sin decimales.')`, botón "Restaurar plantilla por defecto" que rellena el campo con `DEFAULT_PROMPT_TEMPLATE` (se guarda como ausente si coincide, para seguir recibiendo mejoras de la plantilla por defecto).

### 4. Pantallas (`features/practica-ia/`; capa UI)

- `PracticePackagesSectionComponent`: en `BibliotecaPageComponent`, debajo de la lista (y del vacío) de libros, `<section aria-labelledby>` "Práctica con IA": esqueleto / error con Reintentar / vacío con la invitación + "Nuevo paquete" / filas `glass-soft` + `press` (nombre, "14 / 20", `todayLabel`: "8 para hoy" · "Ya practicaste hoy" · "Nada para hoy") + "Nuevo paquete" + enlace "Paquetes completados". `PackageFormDialogComponent` (nombre, `bookFormSchema.shape.name`) para crear y renombrar.
- `PackageDetailPageComponent` (`/paquetes/:id`, dentro del caparazón, sección Biblioteca activa): cabecera (← Biblioteca, nombre, "ítems / capacidad", menú ⋯ con Renombrar · Borrar), zona de acciones: `StudyLaunchButtonComponent` "Practicar hoy" (`prepare = prepareTodayPractice`, `destination = ['/practica-ia']`, `emptyMessage` "Nada para hoy.", oculto si completado), "Agregar" (abre `CardFormDialog` con `save = addItems([draft])`), "Importar" (abre `CardImportDialog` con `target: package`), "Copiar prompt de hoy" (`CopyPromptButtonComponent`, deshabilitado con la pista si `!hasPracticedToday`), "Marcar como completado" (`ConfirmDialog`). Lista de ítems: fila con anverso → reverso, etiqueta "Para hoy" o la última calificación como texto ("Bien · ayer"), menú ⋯ Editar · Borrar (ocultos si completado). Con el paquete lleno, Agregar e Importar deshabilitados con "Este paquete está lleno.".
- `CompletedPackagesPageComponent` (`/paquetes/completados`): lista por `completedAt` desc, cada fila → detalle en solo lectura; vacío "Aún no has completado ningún paquete.".
- `CopyPromptButtonComponent` (`features/practica-ia/copy-prompt-button`): entrada `prompt: string | null`, `disabledHint?`; al tocar, `fileDelivery.copyText`; éxito → `role="status"` "Prompt copiado. Pégalo en tu chat de IA." 3 s; fallo → `<textarea readonly>` con el prompt y el aviso. Segundo caso real de `copyText` (el primero fue exportar).
- `PracticeAiTodayBlockComponent` en `HoyPageComponent`, debajo de las filas por libro: oculto sin paquetes; una fila por paquete abierto con pendientes o practicado hoy (`StudyLaunchButton` secundario por fila); "Nada pendiente en tus paquetes." + "Ver paquetes"; error propio con Reintentar. Lee `PracticePackagesService` (su recurso se comparte con la Biblioteca).
- `PracticeAiPageComponent` (`/practica-ia`, fuera del caparazón, `authGuard` + `practiceAiHandoffGuard` → `/biblioteca`): `take()` → `session.start`; `SessionTopBarComponent` (progreso, "4 / 11", Salir → `/paquetes/{id}`), `FlipCardComponent` con `current`, botón "Mostrar respuesta", `RatingBarComponent` con `previews = null`; teclado como el repaso (Espacio, 1-4; sin sugerencia). Al terminar: `SessionSummaryComponent` con `title` "Práctica terminada", `countLabel` "Practicaste N ítems", pastillas por grado, `backLabel` "Volver al paquete", y en `[practice]`: `hardCountLabel` ("5 para reforzar con la IA" / "Ninguno difícil esta vez") + `CopyPromptButtonComponent` con `promptFor(packageId)`. `DestroyRef.onDestroy(() => session.reset())`.
- Textos en `features/practica-ia/practica-ia.copy.ts` (plural real con `pluralize`).

## Superficies con acrílico (ADR 0003)

| Superficie | Tratamiento | Capa visible |
| --- | --- | --- |
| Nav (Biblioteca, detalle, historial, Hoy) | `glass` | 1 |
| Filas de paquete e ítems; bloque de Hoy | `glass-soft` + `press` | 2 |
| Pantalla de práctica: barra superior `glass-soft`; tarjeta, cerebros y cierre SÓLIDOS | como el repaso | 1 + 0 |
| Diálogos (formulario, importar, confirmaciones, nombre) | `glass` (overlay) | sustituye |
| Textarea de respaldo del prompt | sólido | 0 |

Sin vinotinto en la pantalla de práctica (como el repaso); con él en las de gestión. `prefers-reduced-transparency` → sólido por tokens.

## Contratos que deja listos

| Contrato | Para quién |
| --- | --- |
| `CardFace`; `FlipCard`/`RatingBar`/`SessionSummary` parametrizables | Cualquier modalidad futura de estudio |
| `CardFormDialog` y `CardImportDialog` con `save`/`target` | Futuro "mover a otro capítulo", importar en un libro existente |
| `buildPrompt`, `DEFAULT_PROMPT_TEMPLATE`, `CopyPromptButtonComponent` | Futuras variantes de prompt |
| `PracticePackageRepository` y su esquema | Futuro compartir paquetes |

## Plan de pruebas

| Escenario de la spec | Prueba concreta | Capa |
| --- | --- | --- |
| Practicar un paquete no cambia Hoy ni Progreso; Los ítems no son tarjetas | `practice-ai-session.service.spec`: solo `recordGrade` en el fake de paquetes; `FakeCardRepository`, `FakeDailyStatsRepository` y `FakeGradePersistence` sin llamadas; `practice-packages.service.spec`: `addItems` no toca `FakeCardRepository` ni `incrementCardCount` | unitaria pura |
| Crear un paquete; Varios abiertos; El ajuste cambia con paquetes abiertos | `practice-packages.service.spec`: `create` usa `practicePackageCapacity` del perfil (20) y queda `open` vacío; dos abiertos a la vez; cambiar el ajuste no toca `capacity` de los existentes; `practice-package.repository.integration.spec`: `create`/`listByUser` | unitaria pura + integración |
| Agregar a mano; Pegar más de lo que cabe; Paquete lleno; Ítem cloze a prueba | `practice-package.repository.integration.spec`: `addItems` escribe en `items` e `itemOrder`, rechaza si supera `capacity`; `card-import-dialog.component.spec` (bloque `package`): sin modos, "Caben 2 más en este paquete.", botón "Importar 2", `save` recibe 2 drafts; `package-detail-page.component.spec`: lleno → Agregar/Importar deshabilitados con el texto; cloze aceptada por `cardFormSchema` | integración + componente |
| Día uno; Día dos; Agregar después de practicar; Las de Bien descansan; Cambio de día de estudio | `pending-items.spec`: nunca practicados → pendientes; `lastGrade 1-2` ayer → pendientes; `lastGrade 3-4` → no; `todaySet` fijado hoy → se usa aunque haya nuevos; `practice-packages.service.spec`: `prepareTodayPractice` llama a `fixTodaySet` solo la primera vez del día y devuelve 11 en el caso de la spec; `dayId` con `studyDayId` (01:30 con inicio 4 → día anterior) | unitaria pura |
| Repetir en el día; Conjunto estable | `practice-packages.service.spec`: segunda llamada con `todaySet` de hoy → mismos ids barajados, sin `fixTodaySet`; `pending-items.spec`: `recordGrade` posterior (3) sobre un 1 del mismo día → mañana no pendiente | unitaria pura |
| Calificar un ítem; Sin intervalos; Salir a mitad | `practice-ai-session-state.spec`: `gradeCurrent` registra y avanza, último → `finished`, cada ítem una vez; `practice-ai-session.service.spec`: `grade` llama a `recordGrade` sin esperar, rechazo → alerta y `Logger`; `rating-bar.component.spec`: `previews null` → sin intervalos y `aria-label` solo etiqueta; `practice-ai-page.component.spec`: Salir → `/paquetes/p1`, `reset()` al destruir | unitaria pura + componente |
| Cierre con difíciles; Cierre sin difíciles | `practica-ia.copy.spec`: `hardCountLabel(5)`, `(0)`, `practicedLabel(8)`; `practice-ai-page.component.spec`: resumen con los textos y el botón de copiar | unitaria pura + componente |
| Repasadas y difíciles; Ítem cloze en el prompt; Plantilla sin un marcador; Aún no se practicó hoy | `build-prompt.spec`: 11/8 listas exactas; cloze sin llaves; sin `[[DIFICILES]]` → `\n\nHard today:\n…`; `package-detail-page.component.spec`: botón deshabilitado con la pista si no se practicó hoy | unitaria pura + componente |
| Usuario sin plantilla propia | `build-prompt.spec`: `DEFAULT_PROMPT_TEMPLATE` con las dos listas sustituidas; `practice-packages.service.spec`: `promptFor` usa la plantilla del perfil si existe | unitaria pura |
| Copia exitosa; Portapapeles no disponible | `copy-prompt-button.component.spec` con `FakeFileDelivery`: `copyText` con el prompt, `role="status"` con el texto; fallo → `<textarea readonly>` con el prompt y el aviso | componente |
| Completar; Lleno no es completado; Cancelar | `practice-packages.service.spec`: `complete` tras `ConfirmDialog` true, pasa a `completed` con fecha; 20/20 todo Bien sigue `open`; `package-detail-page.component.spec`: confirmación con el texto; `false` → nada; completado → sin acciones de edición y "Copiar prompt" con todos en repasadas | unitaria pura + componente |
| Sección con paquetes; Sin paquetes; Historial | `practice-packages-section.component.spec`: filas con "14 / 20" y `todayLabel`; vacío con la invitación; `completed-packages-page.component.spec`: orden por `completedAt` desc y vacío | componente |
| Pendientes en dos paquetes; Ya practicado; Falla la lectura | `practice-ai-today-block.component.spec`: dos filas con números y botón; "Ya practicaste hoy · Volver a practicar"; oculto sin paquetes; error con Reintentar; `hoy-page.component.spec`: el bloque principal sigue con el bloque en error | componente |
| Editar la plantilla; Restaurar la plantilla; Capacidad fuera de rango | `ajustes-page.component.spec`: Guardar envía `promptTemplate` y `practicePackageCapacity`; Restaurar rellena el texto por defecto; 3 y 2.5 deshabilitan con "Entre 5 y 100, sin decimales."; plantilla vacía → "La plantilla no puede estar vacía." | componente |
| Practicar sin red; Agregar sin red | `practice-ai-page.component.spec` con `FakeConnectivity` sin red: la sesión arranca y califica; `package-detail-page.component.spec`: Agregar/Importar/Completar/Renombrar/Borrar deshabilitados con `NEEDS_CONNECTION_MESSAGE`; "Practicar hoy" y "Copiar prompt" activos | componente |
| Documento malformado; Reintentar | `practice-package.schema.spec`: sin `name` o `status` inválido → falla; `practice-packages.service.spec`: `InvalidDocumentError` → `status 'error'` y `Logger`; `reload()` tras éxito → `ready` | unitaria pura |
| Regla de seguridad | `users.rules.spec`: dueño escribe en `practicePackages/p1`; otro usuario no | integración |
| Generalizaciones | `flip-card.component.spec` con un `CardFace` sin programación; `session-summary.component.spec` con `title`/`backLabel` y `back`; `card-form-dialog.component.spec` con `save` propio; `repaso-page`, `card-list`, `capitulo-detail-page` specs siguen en verde | componente |

## Risks / Trade-offs

- [Cinco generalizaciones sobre changes del release 1.0.0] → mecánicas y probadas; se hacen al inicio con las pruebas existentes en verde antes y después. Es el precio de reutilizar la pantalla de repaso en vez de copiarla.
- [`fixTodaySet` sin red queda en la cola del SDK] → el conjunto se usa igual en memoria; si el dispositivo nunca sincroniza, otro dispositivo verá el conjunto "sin fijar" y lo recalculará: diferencia tolerable en una práctica sin consecuencias.
- [Documento único con hasta 100 ítems] → ~30 KB como máximo, muy por debajo de 1 MB; una escritura por calificación con dos rutas punteadas.
- [Cloze a prueba] → si se retira, basta rechazar `cardType: 'cloze'` en `addItems` y en el diálogo de importar con destino paquete; los ítems existentes siguen leyéndose.
- [Dos plantillas por defecto en el tiempo] → la plantilla se guarda como ausente cuando coincide con la por defecto, así las mejoras futuras llegan a quien no la personalizó.

## Migration Plan

Decimoquinto commit de la rama única `feature/reescritura-cadence`, después del PR de 1.0.0; entra con el segundo PR (→ 1.1.0). Datos nuevos: colección `practicePackages` (regla nueva en `firestore.rules`, sin índice compuesto) y dos campos opcionales en las preferencias con valores por defecto en el esquema. `skip_specs: true`: el archive solo cierra el change. Rollback: revertir el commit; los documentos de paquetes quedan huérfanos pero inofensivos.
