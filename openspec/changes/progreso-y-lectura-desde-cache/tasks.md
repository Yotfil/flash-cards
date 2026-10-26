# Tasks

Orden TDD: cada tarea de código va precedida por su prueba en rojo. Puerta antes de marcar una tarea: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`, más la integración con la plantilla del 8085 y `--project demo-cadence-test`. Un commit por tarea de código (con su prueba).

## 1. Progreso sin racha y conteo en memoria (cerebro)

- [x] 1.1 Prueba en rojo en `daily-queue.service.spec.ts`: `refreshQueue()` recarga la cola (`listReady` +1) y no la racha (`listRecent` sin cambio); `refresh()` sigue recargando ambas. Verificar: la prueba falla porque `refreshQueue` no existe.
- [x] 1.2 Añadir `DailyQueueService.refreshQueue()` y usarlo desde `ProgressService.refresh()`. Verificar: 1.1 en verde y `progress.service.spec` existente en verde.
- [ ] 1.3 Prueba en rojo: `CardCollectionChanges` (`services/progress/card-collection-changes.spec.ts`): `version()` arranca en 0 y `notify()` lo incrementa. Verificar: falla por archivo inexistente.
- [ ] 1.4 Crear `CardCollectionChanges` (servicio `providedIn: 'root'`, señal `version` y `notify()`). Verificar: 1.3 en verde.
- [ ] 1.5 Pruebas en rojo en `progress.service.spec.ts` (con `FakeConnectivity` y `FakeBookRepository`): dos `refresh()` seguidos → 1 conteo; `notify()` entre medias → 2; `retryCollection()` cuenta sin tocar la cola; sin red con conteo previo → `collectionStatus()==='ready'`; sin red sin conteo → `'offline'` y 0 conteos; `enter()` + red que vuelve → 1 conteo; sin `enter()` (o tras `leave()`) + red que vuelve → 0 conteos. Verificar: fallan contra el `resource` actual.
- [ ] 1.6 Reescribir el conteo de `ProgressService` según D4: señales `counts`/`status`, `ensureCounted()`, `countedVersion`, `enter()`/`leave()` y el `effect` de reconexión; mantener `collectionStatus`, `shares`, `isEmpty`, `retryCollection` con la misma forma para la página. Verificar: 1.5 en verde y las pruebas existentes de Progreso en verde.
- [ ] 1.7 Prueba en rojo en `progreso-page.component.spec.ts`: al crear la página se llama `enter()` y al destruirla `leave()`; sin red y sin conteo se lee "Necesitas conexión para contar tu colección.". Verificar: falla.
- [ ] 1.8 Conectar `enter()`/`leave()` en `ProgresoPageComponent` (`ngOnInit`/`DestroyRef`). Verificar: 1.7 en verde.

## 2. Avisar cuando la colección cambia (escritores)

- [ ] 2.1 Pruebas en rojo, una por escritor, de que la operación incrementa `CardCollectionChanges.version`: `review-session.service.spec` (`grade()`), `cards.service.spec` (`create`, `createMany`, `replaceInChapter`, `delete`, `deleteMany`), `chapters.service.spec` (`delete`), `books.service.spec` (`delete`), `import.service.spec` (`importBook`); y una prueba negativa: editar una tarjeta (`update`) no incrementa. Verificar: fallan.
- [ ] 2.2 Inyectar `CardCollectionChanges` en esos servicios y llamar `notify()` tras cada escritura listada (en el repaso, al enviar la nota). Verificar: 2.1 en verde; `npm test` completo en verde.

## 3. Origen de lectura en puertos, adaptadores y fakes

- [ ] 3.1 Prueba en rojo de integración (`book.repository.integration.spec.ts`): `listByUser(uid,'device')` devuelve vacío antes de cualquier lectura y los libros después de `listByUser(uid)`; lo mismo para `listReady(uid, before, 'device')` y `getByDay(uid, dayId, 'device')` en sus specs de integración, y `listByBook`/`listByChapter`. Verificar: fallan por firma (tipos) con la plantilla del 8085.
- [ ] 3.2 Crear `domain/ports/read-source.ts` (`ReadSource = 'device' | 'server'`), añadir el parámetro opcional (por defecto `'server'`) a `listByUser` (libros y paquetes), `listByBook` (capítulos), `listByChapter` y `listReady` (tarjetas) y `getByDay` (indicadores); en los adaptadores de Firestore, `'device'` → `getDocsFromCache`. Verificar: 3.1 en verde; `typecheck` en verde sin tocar llamadores.
- [ ] 3.3 Prueba estática en rojo (`tests/static/layer-boundaries.spec.ts` o una nueva): `getDocsFromCache` solo aparece bajo `src/app/infrastructure/`. Verificar: pasa ya (documenta el contrato); dejarla.
- [ ] 3.4 Pruebas en rojo de los fakes (`fake-book-repository.spec.ts` nuevo o dentro de los specs de servicio): `seedOnDevice(...)` y `listByUser(uid,'device')` devuelve esa lista, `'server'` la de siempre; contadores por origen. Repetir en los fakes de paquetes, capítulos, tarjetas e indicadores. Verificar: fallan.
- [ ] 3.5 Implementar `onDevice` y los contadores por origen en los cinco fakes. Verificar: 3.4 en verde.

## 4. Lectura en dos fases (función pura y servicios)

- [ ] 4.1 Pruebas en rojo de `services/data-loading/read-device-then-server.spec.ts`: dispositivo `[a]` → servidor `[a,b]` emite dos valores; dispositivo `[]` → no emite hasta el servidor; servidor falla con valor previo → valor se queda y `logger.error`; servidor falla sin valor → `{ error }`; dispositivo falla → `logger.warn` y sigue; `abortSignal` abortado → el valor tardío no se emite. Verificar: fallan por archivo inexistente.
- [ ] 4.2 Crear `readDeviceThenServer(fromDevice, fromServer, logger, abortSignal)` que devuelve la señal del flujo para `resource({ stream })`. Verificar: 4.1 en verde.
- [ ] 4.3 Prueba en rojo en `books.service.spec.ts`: con `onDevice=[a]`, `reload()` deja `books.hasValue()` cierto con `[a]` antes de resolver el servidor y `[a,b]` después; `loadFresh()`/`ensureLoaded()` siguen devolviendo la lista del servidor. Verificar: falla.
- [ ] 4.4 Pasar `BooksService.books` a `stream` con `readDeviceThenServer`. Verificar: 4.3 y todo `books.service.spec` en verde.
- [ ] 4.5 Prueba en rojo en `practice-packages.service.spec.ts` (mismo patrón que 4.3) y pasar `packages` a `stream`. Verificar: en verde.
- [ ] 4.6 Prueba en rojo en `chapters.service.spec.ts` y pasar `chapters` a `stream`. Verificar: en verde.
- [ ] 4.7 Prueba en rojo en `cards.service.spec.ts` y pasar `cards` a `stream`. Verificar: en verde.
- [ ] 4.8 Pruebas en rojo en `daily-queue.service.spec.ts`: con libros y candidatas `onDevice` → emite la cola del dispositivo y luego la del servidor; con candidatas `onDevice=[]` → no emite hasta el servidor; `reportOrphans` solo con el servidor; `prepareSession()` sigue usando la lectura del servidor. Verificar: fallan.
- [ ] 4.9 Pasar `DailyQueueService.data` a `stream` (fase de dispositivo = libros + `listReady` + `getByDay` con `'device'`, descartada si libros o candidatas vienen vacías). Verificar: 4.8 y todo el spec en verde.

## 5. Pantallas (comprobación, sin cambios de plantilla previstos)

- [ ] 5.1 Pruebas en rojo de componente: `biblioteca-page.component.spec` (con `onDevice` vacío, esqueleto hasta resolver y nunca "Aún no tienes libros" antes; con `onDevice=[a]`, la lista sale sin esqueleto) y `libro-detail-page.component.spec` (servidor falla con capítulos guardados a la vista → la lista se queda, sin "No pudimos cargar los capítulos"). Verificar: la de "lista sin esqueleto" falla si algún componente mira `status()==='loading'` en vez de `hasValue()`; corregir solo lo que falle.
- [ ] 5.2 Pasar las pruebas de 5.1 ajustando, si hace falta, cómo cada página deriva "cargando" (debe ser "sin valor", no "en curso"). Verificar: 5.1 en verde; `npm test` y `build` en verde.

## 6. Cierre

- [ ] 6.1 Puerta completa (lint, formato, tipos, unitarias, integración con el 8085 y `demo-cadence-test`, build) en verde en el último commit. Verificar: salida de cada comando sin errores; anotar los números en la bitácora.
- [ ] 6.2 Comprobación por CDP (Chrome headless contra el emulador del 8085 con datos sembrados): en la segunda visita a Biblioteca y a Hoy no aparece el esqueleto y el conteo de Progreso no se repite entre dos visitas sin cambios (contar `runAggregationQuery` en la red). Verificar: captura o conteo anotado en la bitácora.
- [ ] 6.3 Actualizar `README.md` (sección de desarrollo: "las pantallas pintan primero lo guardado") si aplica, y la bitácora de `MEMORY.md`. Push de `feature/progreso-y-lectura-desde-cache` y link del PR hacia `dev` con el resumen. Verificar: link entregado.
