# Design

## Context

Ver `proposal.md` → Why. Lo que hay hoy (verificado sobre `dev` = `411ba2d`, 2026-10-26):

- Toda lectura de lista es una promesa única (`getDocs`) dentro de un `resource` de Angular con `loader`: `BooksService.books`, `PracticePackagesService.packages`, `ChaptersService.chapters`, `CardsService.cards`, `DailyQueueService.data` y `.streak`, `ProgressService.collection`. No hay escuchas en vivo ni lecturas solo-caché en ningún sitio.
- `DailyQueueService.refresh()` recarga `data` **y** `streak`; `ProgressService.refresh()` llama a ese `refresh()` y recarga `collection`. `collection` es un `resource` cuyos `params` dependen de `online()`: al perder la red el recurso se vacía y al volver (en cualquier pantalla) recuenta (3 agregaciones `getCountFromServer`).
- La caché persistente de Firestore (IndexedDB, multipestaña) está activa en `provide-firebase.ts`. Con ella, `getDocs` en línea va al servidor; sin red devuelve la caché. `getDocsFromCache` devuelve lo guardado sin tocar la red (vacío si nunca se leyó).
- Los puertos (`BookRepository.listByUser`, `PracticePackageRepository.listByUser`, `ChapterRepository.listByBook`, `CardRepository.listByChapter` / `listReady`, `DailyStatsRepository.getByDay`) devuelven `Promise<T[]>`; los fakes de `testing/` guardan una sola lista.
- `resource` admite un cargador en flujo (`stream`) que devuelve una señal de `{ value } | { error }` y pasa a "resolved" con el primer valor; cada valor posterior actualiza `value()` sin volver a "loading" (`@angular/core` 22, `ResourceStreamingLoader`).
- Restricciones: capas (UI → servicios → repositorios; Firestore solo en `infrastructure/`), cero `any`, errores explícitos, fakes en `testing/`, legible por un junior.

## Goals / Non-Goals

**Goals:**
- Progreso: cero lecturas de la racha; los 3 conteos agregados solo en la primera visita, tras un cambio local de la colección, en "Reintentar" o cuando no hay conteo y vuelve la red con Progreso abierta.
- Las pantallas de lista pintan de inmediato lo guardado en el dispositivo y se actualizan en su sitio con la lectura del servidor; el esqueleto solo cuando no hay nada guardado.
- El número de consultas al servidor por entrada a una pantalla **no sube** (la fase de caché no toca la red).

**Non-Goals:**
- No se deja de consultar al servidor al navegar (eso es la opción B, con caducidad) ni se abren escuchas en vivo (opción D).
- No se cachean los conteos agregados en el dispositivo (Firestore no lo permite).
- No se toca el service worker, las reglas ni los índices.
- La práctica (quiz), la exportación (`listByBookFromServer`, a propósito del servidor) y la importación no cambian su forma de leer.

## Decisions

### D1. Lectura en dos fases con un cargador en flujo (`stream`), no con dos recursos ni con un "estado parcial" a mano
Cada `resource` de lista pasa de `loader` a `stream`: el flujo lee primero del dispositivo y, si trae algo, lo emite (`{ value }`); después lee del servidor y emite el resultado (`{ value }` o, si falla sin valor previo, `{ error }`). Si la fase de dispositivo no trae nada, no se emite hasta el servidor, así el esqueleto se mantiene.
*Por qué:* es la pieza del framework hecha para "varios valores de una misma carga"; `hasValue()`, `value()`, `status()` y `reload()` siguen significando lo mismo para las pantallas, que no cambian. *Alternativas:* (a) dos recursos (caché y servidor) y un `computed` que elija: duplica estado y "cargando" en cada servicio; (b) un servicio con señales a mano: reimplementa `resource`. *Capa:* servicios.

Para no repetir la secuencia en seis servicios, una función pura en `services/data-loading/` (nombre propuesto `readDeviceThenServer`) recibe dos funciones (`fromDevice`, `fromServer`) y un `Logger`, y devuelve la señal del flujo. Es el "segundo caso real" que pide la abstracción: hay seis. *Reglas que encapsula:*
- Un valor de dispositivo **vacío** cuenta como "nada guardado" (spec: el vacío solo lo decide el servidor).
- Fallo del servidor **con** valor ya emitido: `logger.error` y el valor se queda. Fallo **sin** valor: `{ error }`.
- Fallo de la fase de dispositivo (p. ej. la frontera rechaza un documento guardado): se registra con `warn` y se sigue con el servidor; nunca tumba la carga.
- Cancelación: si el recurso se reinicia (`reload` o cambio de `params`) antes de que llegue el servidor, el resultado tardío se descarta (`abortSignal` del cargador).

### D2. Los puertos ganan un origen de lectura explícito, no métodos duplicados
`listByUser`, `listByBook`, `listByChapter`, `listReady` y `getByDay` reciben un último argumento opcional `source: ReadSource = 'server'` con `type ReadSource = 'device' | 'server'` en `domain/ports/read-source.ts`. El adaptador de Firestore traduce `'device'` a `getDocsFromCache` y `'server'` a `getDocs` (que sin red cae a la caché, como hoy). `listByBookFromServer` y `listRecent` (racha) no cambian.
*Por qué:* un parámetro con valor por defecto deja intactos todos los llamadores actuales y las pruebas; un método por origen (`listByUserFromDevice`) duplicaría cinco firmas. *Alternativa descartada:* un `ReadSource` global en el adaptador (estado oculto). *Capa:* dominio (tipo) e infraestructura (traducción).

Los fakes de `testing/` ganan una lista `onDevice` aparte y un contador por origen: `listByUser(uid, 'device')` devuelve `onDevice`, `'server'` la lista de siempre. Sin seed de `onDevice`, `'device'` devuelve vacío (= primera visita).

### D3. Qué lecturas van en dos fases
| Servicio / recurso | Dispositivo | Servidor | Nota |
| --- | --- | --- | --- |
| `BooksService.books` | `listByUser(uid,'device')` | `listByUser(uid)` | `loadFresh()`/`ensureLoaded()` siguen devolviendo la **lectura del servidor** (Hoy y el detalle exigen la lista fresca); el flujo solo adelanta lo pintado. |
| `PracticePackagesService.packages` | `listByUser(uid,'device')` | `listByUser(uid)` | |
| `ChaptersService.chapters` | `listByBook(…,'device')` | `listByBook(…)` | |
| `CardsService.cards` | `listByChapter(…,'device')` | `listByChapter(…)` | |
| `DailyQueueService.data` | libros + `listReady(…,'device')` + `getByDay(…,'device')` | la lectura actual (`read`) | La fase de dispositivo arma la misma `QueueData`; si **alguna** de las tres viene vacía (libros o candidatas), no se emite: Hoy no debe pintar "al día" ni un héroe con menos tarjetas por una caché parcial. `reportOrphans` solo en la fase de servidor. |
| `DailyQueueService.streak` | — | igual | barata y solo en Hoy. (Desde la tarea 1.2 solo se lee cuando Hoy la pide.) |

*Precisión al implementar (tareas 4.8 y 4.9):* los libros de la fase de dispositivo los da `BooksService.loadSaved()`. La cola guarda su última lectura del servidor (en curso o terminada, con su día y si falló) y `prepareSession()` la espera en vez de devolver la cola pintada, que puede ser la guardada: así "Estudiar ahora" nunca arranca con la cola del dispositivo ni repite la lectura; si esa lectura falló, se lee otra vez. Las pruebas de página que retenían lecturas ahora retienen solo las del servidor (sus envoltorios descartaban el origen).
| `ProgressService.collection` | — | agregaciones | ver D4. |

### D4. Progreso: refresco sin racha y conteo en memoria con invalidación explícita
- `DailyQueueService` gana `refreshQueue()` (solo `data`); `refresh()` sigue recargando `data` y `streak` y lo usa Hoy. `ProgressService.refresh()` pasa a `refreshQueue()`.
- `ProgressService.collection` deja de ser un `resource` atado a `online()` y pasa a: una señal `counts: CardStateTotals | null`, una señal `status: 'idle' | 'loading' | 'ready' | 'error'` y un método `ensureCounted()` que cuenta solo si `online()` y (`counts === null` o `stale`). `refresh()` llama a `ensureCounted()`; `retryCollection()` fuerza el conteo. Un `effect` dentro del servicio, activo solo mientras Progreso está abierta (la página llama `enter()`/`leave()` en `ngOnInit`/`ngOnDestroy`, o inyecta `DestroyRef`), pide el conteo cuando `online()` pasa a `true` y no hay conteo. Al perder la red, `counts` se conserva (la spec: se sigue mostrando).
- *Precisión al implementar (tareas 1.5 a 1.8):* `enter()` marca Progreso como abierta **y** hace la visita (`refresh()`), así la página solo llama `enter()` al iniciar y `leave()` al destruirse. El "Reintentar" de toda la pantalla pasa a `retry()` (cola + conteo **forzado**): la spec base de `progreso` ("Reintentar … repite la carga completa, incluido el conteo de la colección") no cambia y `refresh()` ya no fuerza el conteo. El conteo guarda también la cuenta (`uid`): con otra cuenta en el mismo dispositivo se vuelve a contar. Mientras se recuenta tras un cambio se sigue mostrando el conteo anterior; si el recuento falla con red, la sección muestra su error.
- **Invalidación:** un servicio mínimo `CardCollectionChanges` (`services/progress/card-collection-changes.ts`) con `version = signal(0)` y `notify()`. Lo llaman, tras una escritura que cambia estados o cantidad de tarjetas: `ReviewSessionService.grade` (al **enviar** la nota, no al confirmarla: el estado ya cambió en el dispositivo), `CardsService.create/createMany/replaceInChapter/delete/deleteMany`, `ChaptersService.delete` (borra tarjetas), `BooksService.delete` (ídem), `ImportService.importBook`. `ProgressService` guarda la versión con la que contó; `stale = version() !== countedVersion`. Editar anverso/reverso, suspender, mover de orden o renombrar NO notifican (no cambian estado ni cantidad; las suspendidas cuentan igual).
*Precisión al implementar (tareas 2.1 y 2.2):* los escritores esperan su escritura con `CardCollectionChanges.afterWrite(promesa)`, que avisa al terminar **salga bien o mal**: un borrado o una importación cortados a mitad cambian la colección aunque fallen, y un aviso de más solo cuesta un recuento. El repaso avisa al enviar la nota (lo aprobado) y otra vez al responder el servidor, para que un conteo hecho entre medias no quede por bueno.
*Por qué un servicio aparte y no `ProgressService.markStale()`:* evita que tarjetas, capítulos, libros, importación y repaso dependan de Progreso (y arrastren su cola). *Alternativa descartada:* ajustar los conteos en memoria por transición de estado (nuevo → aprendizaje…): exige conocer el estado de cada tarjeta borrada o importada y se descuadra; recontar tras un cambio es exacto y las agregaciones cuestan 3 lecturas. *Capa:* servicios.

### D5. Qué no cambia a propósito
- Frescura entre dispositivos: cada entrada sigue yendo al servidor (PR-01). El usuario puede ver, durante la fracción de segundo entre fases, un libro que acaba de borrar en el otro dispositivo; desaparece al llegar el servidor. Aceptado (es el comportamiento estándar de "mostrar y revalidar").
- Sin indicador de "actualizando": calma; el contenido cambia en su sitio. Las listas tienen `track` por id, así una actualización no recrea filas.
- Superficies: ninguna nueva; sin acrílico añadido (ADR 0003 no se toca).

## Risks / Trade-offs

- [El héroe de Hoy cambia de "42" a "40" al llegar el servidor] → es el mismo salto que hoy entre esqueleto y número, sin el esqueleto; no hay animación del contador (el número solo cambia de texto). Si el usuario tocó "Estudiar ahora" antes de la fase de servidor, `prepareSession()` espera la cola del servidor como hoy (`read()`), no la de caché.
- [Caché parcial en Hoy: el dispositivo tiene tarjetas de un libro y no de otro] → la fase de dispositivo se descarta si libros o candidatas vienen vacías; si vienen parciales pero no vacías, se pinta y se corrige al llegar el servidor (igual que sin red hoy).
- [`getDocsFromCache` lanza si la caché persistente no está disponible (p. ej. navegación privada o IndexedDB bloqueado)] → se trata como "nada guardado" con `warn`; la carga sigue por el servidor.
- [Un flujo que emite dos veces dispara dos renders] → aceptado; los `computed` derivados son baratos (listas de decenas a cientos de elementos).
- [Olvidar un `notify()` en un escritor nuevo] → prueba de contrato en el design: una prueba por escritor listado en D4; y el recuento se fuerza siempre con "Reintentar".
- [Pruebas de integración: la caché en Node es de memoria, no IndexedDB] → `getDocsFromCache` sirve igual (devuelve lo leído antes en ese proceso); basta para probar `'device'` vacío antes de leer y lleno después.

## Plan de pruebas

Cada escenario de los deltas → prueba y capa. Las pruebas se escriben en rojo antes del código (TDD).

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `progreso`: Progreso no lee el historial ni la racha | `progress.service.spec`: `refresh()` no incrementa `listRecent` del fake de indicadores; `daily-queue.service.spec`: `refreshQueue()` recarga `data` y no `streak` | unitaria |
| `progreso`: Segunda visita sin cambios | `progress.service.spec`: dos `refresh()` seguidos → `countCollectionByState` del fake de libros llamado 1 vez | unitaria |
| `progreso`: Volver tras repasar / tras importar o borrar | `progress.service.spec`: `refresh()`, `CardCollectionChanges.notify()`, `refresh()` → 2 llamadas; y una prueba por escritor (`review-session.service.spec`, `cards.service.spec` ×5, `chapters.service.spec`, `books.service.spec`, `import.service.spec`): la operación incrementa `version` | unitaria |
| `progreso`: Reintentar repite solo el conteo | `progress.service.spec`: `retryCollection()` cuenta otra vez y no recarga la cola (`listReady` sin incremento) | unitaria |
| `progreso`: Sin red con conteo previo | `progress.service.spec`: contar en línea, `online=false`, `refresh()` → `collectionStatus()==='ready'` con los mismos `shares()` | unitaria |
| `progreso`: Sin red sin conteo previo | `progress.service.spec`: `online=false` desde el inicio → `collectionStatus()==='offline'`, 0 conteos; `progreso-page.component.spec`: pinta "Necesitas conexión para contar tu colección." | unitaria + componente |
| `progreso`: Vuelve la red con Progreso abierta | `progress.service.spec`: `enter()`, `online=false→true` → 1 conteo | unitaria |
| `progreso`: Vuelve la red en otra pantalla | `progress.service.spec`: sin `enter()` (o tras `leave()`), `online=false→true` → 0 conteos | unitaria |
| `progreso`: Progreso no duplica la lectura del contador (ya cubierto) | sigue la prueba existente | unitaria |
| `nav`: Segunda visita con datos guardados | `read-device-then-server.spec` (función pura): dispositivo `[a]`, servidor `[a,b]` → emite `[a]` y luego `[a,b]`, `status` nunca vuelve a loading; `books.service.spec`: fake con `onDevice=[a]` → `books.hasValue()` cierto antes de resolver el servidor y `value()` = servidor al resolver | unitaria |
| `nav`: Primera visita sin datos guardados | `read-device-then-server.spec`: dispositivo `[]` → no emite hasta el servidor; `biblioteca-page.component.spec`: con `onDevice` vacío se muestra el esqueleto hasta resolver | unitaria + componente |
| `nav`: Lo guardado está vacío | la misma prueba pura (vacío ≡ nada); `biblioteca-page.component.spec`: no aparece "Aún no tienes libros" mientras el servidor no responde | unitaria + componente |
| `nav`: Falla el servidor con contenido guardado a la vista | `read-device-then-server.spec`: dispositivo `[a]`, servidor rechaza → `value()` sigue `[a]`, `logger.error` 1 vez, sin `error`; `libro-detail-page.component.spec` (capítulos): la lista se queda y no sale "No pudimos cargar los capítulos" | unitaria + componente |
| `nav`: Fallo de lectura (sin nada guardado) | `read-device-then-server.spec`: dispositivo `[]`, servidor rechaza → `{ error }`; prueba existente de error de cada página sigue en verde con `onDevice` vacío | unitaria + componente |
| `nav`: Sin conexión con datos guardados | `read-device-then-server.spec`: dispositivo `[a]`, servidor devuelve `[a]` (así se comporta `getDocs` sin red) → un solo valor útil; integración: `listByUser(uid,'device')` vacío antes de leer y con los libros tras `listByUser(uid)` (`book.repository.integration.spec`, y una equivalente para `listReady`/`getByDay`) | unitaria + integración (emulador) |
| `nav`: Reintentar repite la lectura (ya cubierto) | sigue la prueba existente; además `reload()` tras un valor de dispositivo vuelve a leer las dos fases | unitaria |
| Hoy con caché parcial (riesgo) | `daily-queue.service.spec`: fake con libros `onDevice` y candidatas `onDevice=[]` → no emite hasta el servidor; con ambas → emite y luego actualiza; `reportOrphans` solo con el servidor | unitaria |
| Fase de dispositivo que falla (riesgo) | `read-device-then-server.spec`: `fromDevice` rechaza → `logger.warn` y sigue al servidor | unitaria |
| Cancelación (D1) | `read-device-then-server.spec`: `abortSignal` abortado antes de resolver el servidor → no emite el valor tardío | unitaria |
| Capas | `tests/static/layer-boundaries.spec`: ya vigila `services/` → Firebase; `getDocsFromCache` solo aparece en `infrastructure/` (prueba estática de una línea) | estática |

Sin pruebas e2e; la comprobación visual (esqueleto solo en la primera visita) la hace el usuario en el branch deploy.

## Migration Plan

Sin migración de datos ni de reglas. Despliegue normal por merge a `dev` y release. Rollback: revertir el PR; los puertos conservan el valor por defecto `'server'`, así que ningún llamador queda roto a medias.

## Contratos que deja listos

- `ReadSource` en los puertos: la opción B (listas con caducidad) y una futura vista "solo lo guardado" lo reutilizan.
- `readDeviceThenServer`: cualquier recurso de lista nuevo lo adopta en una línea.
- `CardCollectionChanges`: el mismo aviso servirá para invalidar conteos por libro (`totalsFor` del detalle) si se decide cachearlos.
