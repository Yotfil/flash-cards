# Especificación de Producto y Arquitectura
## App de Repetición Espaciada — "Anki Mejorada"

> **Propósito de este documento.** Es la especificación completa para construir la aplicación. Está escrito para ser ejecutado por Claude Code sin ambigüedades: cada decisión de producto, datos, ingeniería, UX y diseño ya está tomada aquí. Cuando algo quede deliberadamente abierto, se indica de forma explícita. El contrato de ingeniería y las reglas permanentes del proyecto viven en el archivo complementario **`CLAUDE.md`**, que Claude Code debe leer al inicio de cada sesión.

---

## Índice

1. Tesis del producto y norte
2. Principios rectores
3. Stack tecnológico
4. Concepto de "libros" y jerarquía de contenido
5. Convención de importación
6. Modelo de datos (Firestore)
7. Sistema de calificación
8. Pantallas y flujos
9. Estados vacíos, de carga y de error
10. Dirección visual
11. Estrategia de UI y componentes
12. Roadmap por fases y criterios de aceptación
13. Backlog de funcionalidades futuras

---

## 1. Tesis del producto y norte

La aplicación es una herramienta de **repetición espaciada centrada en el contenido**: bonita, rápida, abrible en cualquier dispositivo, que reduce la fricción de estudiar y —en fases posteriores— ayuda a entender en qué eres débil y a *usar* lo aprendido, no solo a recordarlo.

El punto de partida no es competir con el algoritmo de Anki (el motor de programación FSRS ya resuelve eso, ver §7). La ventaja está en cuatro cosas que Anki hace mal:

1. **UX limpia y rápida**, opuesta a la interfaz intimidante de Anki.
2. **Organización por "fuentes/libros"** en lugar de mazos planos.
3. **Baja fricción** para crear contenido y para calificar.
4. **Analítica de debilidades** (fase posterior) que te dice qué reforzar o aprender después.

**Cambio de categoría (visión a largo plazo).** Anki es una herramienta de *memoria*: ayuda a recordar. Esta app aspira a ser una herramienta de *aprendizaje* donde la memoria (Anki/FSRS) es solo un módulo, sobre el que se agregan las capas que Anki ignora: meter buen contenido (autoría), entender qué se falló (diagnóstico) y **usar lo aprendido** (aplicación, p. ej. conversación con IA). Esas capas son el foso defensivo del producto, pero entran de forma progresiva (ver §12 y §13).

**Caso de uso inicial y prioritario:** estudio de vocabulario de inglés (palabras y su traducción), con phrasal verbs como primer ejemplo concreto. El diseño, sin embargo, debe servir para **cualquier materia** (ver Principio 1).

**Resultado final esperado:** una app web instalable (PWA) que abre desde celular y computador, a la que el usuario agrega "libros" y, poco a poco, nuevas funcionalidades.

---

## 2. Principios rectores

Estos cinco principios condicionan **todas** las decisiones del proyecto. Cualquier feature nuevo se mide contra ellos.

### Principio 1 — Materia-agnóstico
La unidad de estudio NO se modela como "palabra + traducción", sino como **anverso + reverso genérico**. Una tarjeta de inglés (`to give up` → `rendirse`), una de medicina (`Taquicardia` → `FC > 100 lpm en reposo`) y una de comunicación no verbal (`Microexpresión` → `expresión facial breve e involuntaria…`) son estructuralmente idénticas. La misma app estudia cualquier tema sin código extra. La diferencia entre materias es, a lo sumo, una etiqueta (`subject`) en el libro. Cada feature nuevo debe funcionar para cualquier materia, o quedar marcado explícitamente como "solo idiomas".

### Principio 2 — Esquema listo / UI después
El esquema de datos se diseña desde ya con los campos opcionales que el futuro necesitará (pronunciación, audio, ejemplo, notas, etc.), aunque la UI del MVP todavía no los use. Así, cuando se agreguen esas funcionalidades, **no hay que migrar datos**. Los campos nacen, la interfaz los expone después.

### Principio 3 — Costo-consciencia primero
El MVP y las primeras fases **no dependen de servicios de pago por uso**. Todo lo que cueste por llamada (la IA, principalmente) se posterga, se introduce de forma progresiva y medible, y siempre con optimización de uso como requisito. Toda funcionalidad de IA se diseña detrás de una **frontera de servicio única** (Cloud Functions) que es el punto donde luego se aplica control de gasto (caché, límites por usuario, conteo de tokens, cambio de modelo). El documento distingue entre *costo de infraestructura base* (bajo y predecible, Firebase) y *costo por uso de IA* (apagado hasta decidir encenderlo).

### Principio 4 — Diseñar para la extensión
Los datos **privados** cuelgan del usuario (`/users/{uid}/…`); los datos **compartidos** viven en colecciones de nivel superior con sus propias reglas de acceso. Toda capacidad nueva (IA, social, lo que venga) entra detrás de una frontera clara —una colección nueva o un servicio nuevo— sin deformar lo que ya existe. Los campos de uso futuro se siembran como opcionales y apagados. El modelo nunca se "rompe" para crecer; se *extiende*.

### Principio 5 — Costo de cambio bajo en el diseño
Toda decisión visual (color, tipografía, espaciado) vive como **design token semántico** en un punto único (la configuración de Tailwind). Cambiar la identidad = una indicación sobre un solo archivo, aplicada de forma coherente, sin iteraciones repetidas. Prohibido el valor literal de color/fuente en los componentes (regla verificable; ver `CLAUDE.md`).

---

## 3. Stack tecnológico

**Stack del MVP:**

- **Frontend:** Angular, como **PWA** (instalable, offline, abre en móvil y escritorio).
- **Lenguaje:** TypeScript en **modo estricto**.
- **Programación de repaso:** **ts-fsrs** (implementación oficial de FSRS en TypeScript).
- **Backend / datos:** **Firebase** — Firestore (base de datos), Auth (usuarios), Hosting (despliegue).
- **Validación de datos externos:** **Zod**, en la frontera (importación, y a futuro respuestas de IA y datos que llegan de la red).
- **Estilos:** **Tailwind CSS** (su configuración es el archivo de tema único; ver §10 y §11).
- **Calidad:** ESLint + Prettier + TypeScript strict mode.

**Sobre un backend propio.** Firebase YA es un backend gestionado. No se está construyendo una app "sin backend". La pregunta no es "¿agrego un backend?" sino "¿en algún momento conviene cambiar este backend gestionado por uno propio?". Respuesta: **no es una meta**, es una opción diferida. Se justificaría solo cuando aparezca lógica que no encaje en el modelo de Firebase (operaciones que tocan a muchos usuarios a la vez —rankings de retos sociales, procesar mazos compartidos—, trabajos pesados/programados, lógica compleja que se quiera testear fuera del cliente, o independencia de Google).

Camino intermedio antes de un backend propio: mover lógica sensible o pesada a **Cloud Functions** (código de servidor dentro del ecosistema Firebase), que da robustez sin mantener infraestructura.

La migración futura está **habilitada por la arquitectura de repositorios** (Ports & Adapters, ver `CLAUDE.md`): el acceso a datos vive detrás de una capa de repositorios, así que mover una parte de Firebase a un backend propio es reemplazar una implementación por detrás, no reescribir la app. Se registra en el roadmap como **"punto de reevaluación"**, atado a la aparición de features sociales pesados o volumen real — no como pendiente que se carga desde ya.

---

## 4. Concepto de "libros" y jerarquía de contenido

**Jerarquía conceptual:** Biblioteca → Libro → Capítulo → Tarjeta.

- **Libro:** una fuente de estudio. Puede ser un libro real (Cialdini, Voss), un curso de idioma, o un bloque temático (p. ej. "Phrasal Verbs más usados", "Cardiología"). **Un archivo importado = un libro.**
- **Capítulo:** subdivisión del libro (un tema o capítulo real). Equivale al "mazo" de Anki.
- **Tarjeta:** la unidad de repaso (anverso/reverso).

**Alcance del MVP — "el libro como organizador" (Opción A).** El usuario crea el libro como contenedor y agrega tarjetas, ya sea a mano o **importando** un archivo de texto (ver §5). NO se genera contenido automáticamente desde PDF/EPUB con IA en el MVP; eso es "el libro como insumo" (Opción B), que pertenece al backlog (§13).

**Nota de implementación sobre la jerarquía física:** aunque conceptualmente es Libro → Capítulo → Tarjeta, **las tarjetas se almacenan en una colección plana** con un campo `bookId` y `chapterId` (ver §6), no anidadas en subcolecciones. Razón: la cola diaria necesita consultar "todas las tarjetas vencidas de todos los libros" en una sola query, lo cual es directo con tarjetas planas y engorroso con tarjetas enterradas. Los capítulos sí son documentos propios porque son pocos y siempre se ven en el contexto de su libro.

---

## 5. Convención de importación

Define cómo se crea/importa un libro desde un archivo de texto. Especificada al detalle para que el parser se implemente sin inventar nada. **El "copiar y pegar texto" queda fuera del MVP**; el camino del MVP es **subir un archivo** `.txt` o `.md`.

### 5.1 Principio base

- **Un archivo = un libro.**
- El **nombre del libro** sale del nombre del archivo sin extensión (`Phrasal Verbs.txt` → libro "Phrasal Verbs"). En la pantalla de importación se muestra precargado y **editable**.
- Extensiones aceptadas: `.txt` y `.md`.
- Codificación obligatoria: **UTF-8** (necesario para acentos de inglés y, enseguida, francés).

### 5.2 Las tres clases de línea

El parser lee el archivo línea por línea. Cada línea es una de tres cosas:

1. **Encabezado de capítulo** — empieza con `#`. El texto después del `#` (recortado) es el nombre del capítulo. Ej.: `# Phrasal Verbs - Básicos`.
2. **Tarjeta** — cualquier línea con contenido que no empiece con `#`. Lleva anverso y reverso separados por el separador (ver 5.3). Ej.: `to give up | rendirse`.
3. **Línea en blanco** — se ignora por completo. Sirve para legibilidad; se permiten las que se quiera.

### 5.3 El separador

- Separador principal: la barra vertical **`|`** (pipe). Elegido en vez de la coma porque las frases de ejemplo de idiomas casi siempre llevan comas y la romperían; el pipe casi nunca aparece en texto natural.
- **Regla de detección, por línea:**
  - Si la línea tiene `|`, se parte ahí.
  - Si **no** tiene `|` pero sí tiene un **tabulador**, se parte por el tabulador (para quien pega desde Excel/Google Sheets, donde el separador natural es el tab; da además compatibilidad con exportaciones de Anki).
  - Si no tiene ninguno de los dos, la línea es **inválida** (ver 5.4).
- Se parte **en el primer separador únicamente**. Todo lo anterior al primer separador es el anverso; todo lo posterior es el reverso. Esto permite que el reverso contenga pipes (`to look forward to | esperar con ansias | tener ganas de` → anverso = `to look forward to`, reverso = `esperar con ansias | tener ganas de`).
- Los espacios al inicio y final de cada lado se **recortan siempre**.

### 5.4 Reglas de borde

Lo que hace robusta la convención. **Ninguna línea mala aborta la importación completa**: se importa todo lo válido y se entrega un reporte de lo que saltó, con número de línea.

- **Tarjetas antes del primer `#`:** se agrupan en un capítulo por defecto, con nombre sugerido editable. No falla.
- **Archivo sin ningún `#`:** válido. Todo se trata como un solo capítulo (nombre por defecto, editable).
- **Línea sin separador** (no es `#`, no tiene `|` ni tab): malformada. No se importa; se reporta con su número de línea.
- **Anverso o reverso vacío** (`to give up |` o `| rendirse`): inválida (flashcard a medias). No se importa; se reporta.
- **`#` sin nombre** (línea que es solo `#`): encabezado inválido; se reporta.
- **Espacios y líneas en blanco:** siempre se recortan/ignoran, nunca generan error.

**Nombre del capítulo por defecto** (para tarjetas sin capítulo o archivo sin `#`): **toma el nombre del libro**.

### 5.5 Flujo de importación de punta a punta

1. El usuario sube el `.txt`/`.md`.
2. El parser procesa el archivo **en memoria, sin escribir nada todavía**.
3. La app muestra una **pantalla de previsualización** con: nombre del libro (editable), nº de capítulos detectados, nº de tarjetas válidas, y una lista visible de **líneas problemáticas** (número de línea + motivo).
4. El usuario revisa, ajusta el nombre si quiere, y confirma.
5. **Solo al confirmar** se escribe en Firestore.

Principio de UX: el usuario nunca guarda a ciegas. Ve qué entra y qué se salta antes de comprometer nada.

### 5.6 Ejemplo completo

Archivo `Phrasal Verbs.txt`:

```
# Movement & Direction
to give up | rendirse, darse por vencido
to look forward to | esperar con ansias

# Present Perfect
I have lived here for 5 years | He vivido aquí por 5 años
She has just left | Ella acaba de irse
```

Produce: libro "Phrasal Verbs", 2 capítulos ("Movement & Direction" con 2 tarjetas, "Present Perfect" con 2), 4 tarjetas válidas, 0 errores. La coma en el primer reverso no causa problema, porque el separador es `|`.

### 5.7 Fuera del MVP (extensiones futuras de la convención)

Apuntado para no sobrecargar ahora; son extensiones que NO rompen la convención: comentarios dentro del archivo (marcador tipo `//`), tarjetas multilínea (reversos con varios párrafos), tags por tarjeta, y tipos de tarjeta especiales (cloze, audio).

### 5.8 Formatos secundarios y futuros

- **CSV:** aceptado como entrada secundaria por compatibilidad con Excel/Sheets/Anki. No es el camino principal.
- **JSON:** formato de **exportación e intercambio** entre usuarios, generado por la app (nunca escrito a mano). Robusto, lleva toda la jerarquía. Futuro.
- **Importar mazos de Anki (`.apkg`):** futuro. Muy valioso (hay miles de mazos hechos) pero el `.apkg` es una base SQLite comprimida; parsearlo es un mini-proyecto aparte. No va en el MVP.

---

## 6. Modelo de datos (Firestore)

### 6.1 Dos decisiones de estructura

1. **Todo cuelga del usuario.** Cada dato vive bajo `/users/{uid}/…`. Las reglas de seguridad se vuelven triviales y blindadas ("solo accedes a lo tuyo"), sin campo `userId` en cada documento. Multi-usuario desde el día uno.
2. **Contenido y programación separados, en el mismo documento de tarjeta.** La tarjeta guarda *qué dice* (anverso, reverso, opcionales) y *cuándo toca repasarla* (estado FSRS) en un mismo doc, en bloques distintos. Una sesión de repaso lee un solo documento por tarjeta (barato), y el estado FSRS queda agrupado y listo para entregárselo casi tal cual a ts-fsrs.

### 6.2 Mapa de colecciones

```
/users/{uid}                          → perfil y ajustes globales
/users/{uid}/books/{bookId}           → metadatos del libro
/users/{uid}/chapters/{chapterId}     → capítulos (campo bookId)
/users/{uid}/cards/{cardId}           → tarjetas: contenido + estado FSRS (plana)
/users/{uid}/reviewLogs/{logId}       → historial de repasos (append-only)
/users/{uid}/dailyStats/{YYYY-MM-DD}  → contadores del día
```

### 6.3 `users/{uid}` — usuario y ajustes

```
displayName: string
email: string
createdAt: timestamp
settings: {
  timezone: string        // ej. "America/Bogota" — define cuándo es "hoy"
  dayStartHour: number     // ej. 4 — el día de estudio empieza a las 4am
                           //   (un repaso a la 1am cuenta como el día anterior)
  theme: string            // "light" | "dark" | "system"
}

// --- Campos sociales (Principio 4: sembrados, apagados, sin efecto en el MVP) ---
handle: string?            // nombre de usuario único y público (futuro)
photoURL: string?          // avatar (futuro)
isSearchable: boolean       // default false — ¿otros pueden encontrarme? (privacidad)
```

`timezone` y `dayStartHour` no son adorno: definen el límite del "día" para el tope de tarjetas nuevas y para las estadísticas diarias.

### 6.4 `books/{bookId}` — el libro (la "fuente")

```
name: string
subject: string            // "language-en" | "medicine" | "nonverbal" | "general" | ...
                           //   MVP: solo se guarda. Futuro: adapta UI y moldes de práctica (Principio 1)
studyDirection: string     // "forward" | "both" (default "forward") — ver 6.9 bidireccional
newCardsPerDay: number     // default 20 — la "tanda" de nuevas
maxReviewsPerDay: number   // default 200 (0 = sin tope) — evita días inmanejables
order: number              // orden del libro en la biblioteca
cardCount: number          // opcional, denormalizado; actualizado en import/borrado masivo
createdAt: timestamp
updatedAt: timestamp
```

### 6.5 `chapters/{chapterId}` — el capítulo

```
bookId: string
name: string
order: number              // orden dentro del libro (orden de aparición en el import)
createdAt: timestamp
updatedAt: timestamp
```

### 6.6 `cards/{cardId}` — la tarjeta (el corazón)

```
// --- Relaciones ---
bookId: string
chapterId: string
noteId: string             // agrupa tarjetas que comparten contenido (para bidireccional)
direction: string          // "forward" | "reverse" (default "forward")

// --- Contenido (lo que se ve) ---
front: string              // anverso (obligatorio)
back: string               // reverso (obligatorio)
pronunciation: string?     // opcional — fonética/IPA (UI futura)
example: string?           // opcional — frase de ejemplo (muy útil en vocabulario)
audioUrl: string?          // opcional — audio (UI futura, probablemente TTS al vuelo)
notes: string?             // opcional — mnemónico/notas (UI futura)
tags: string[]?            // opcional — filtrado futuro

// --- Programación (estado FSRS; se entrega casi tal cual a ts-fsrs) ---
scheduling: {
  due: timestamp           // CUÁNDO vuelve a tocar — mueve toda la cola
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number            // 0=New, 1=Learning, 2=Review, 3=Relearning (enum ts-fsrs)
  lastReview: timestamp | null
}

suspended: boolean         // apartada del repaso manualmente (default false)
createdAt: timestamp
updatedAt: timestamp
```

- El bloque `scheduling` **espeja el objeto `Card` de ts-fsrs**. Al calificar: se lee el doc, se pasa ese bloque a la librería, se recibe el nuevo estado y se reescribe. Round-trip limpio.
- Los campos opcionales (`pronunciation`, `example`, `audioUrl`, `notes`) son el Principio 2 en acción: existen desde ya; el MVP solo pinta `front`/`back`.

### 6.7 `reviewLogs/{logId}` — historial (append-only)

```
cardId: string
bookId: string             // denormalizado, para analítica por libro sin "joins"
rating: number             // 1=Again, 2=Hard, 3=Good, 4=Easy
state: number              // estado ANTES del repaso
due: timestamp
stability: number
difficulty: number
elapsedDays: number
lastElapsedDays: number
scheduledDays: number
reviewedAt: timestamp      // momento exacto del repaso
durationMs: number?        // tiempo de respuesta → semilla del auto-grading futuro
```

- No se modifica nunca después de escribirse; solo crece. Es el insumo del optimizador de FSRS (parámetros personalizados, futuro) y de toda la analítica.
- **`durationMs` se captura DESDE el MVP** aunque todavía no se use: cuando llegue el auto-grading (calificar por velocidad de respuesta) ya habrá meses de datos históricos.

### 6.8 `dailyStats/{YYYY-MM-DD}` — contador del día

```
date: string               // "2026-06-21" en la zona horaria del usuario
newCardsIntroduced: { [bookId: string]: number }   // para hacer cumplir newCardsPerDay
reviewsCompleted: number
ratingCounts: { again: number, hard: number, good: number, easy: number }
```

Doble función: hace cumplir el tope de nuevas por día (cuántas nuevas se introdujeron hoy) y alimenta las estadísticas básicas del MVP. El ID es la fecha, así que leer/escribir "hoy" es directo.

### 6.9 La query crítica: cómo se arma la cola diaria

Al abrir una sesión (global o de un libro), la cola se arma en dos consultas:

1. **Repasos vencidos:** tarjetas con `scheduling.state != 0` (no nuevas) y `scheduling.due <= finDelDíaActual`, ordenadas por `due` ascendente (las más atrasadas primero). Se despachan **todas** (saltárselas rompe la programación).
2. **Tarjetas nuevas:** tarjetas con `scheduling.state == 0`, limitadas a `newCardsPerDay` menos las ya introducidas hoy (de `dailyStats`). Esta es la "tanda de 20".

Dentro de la sesión, una tarjeta fallada (Again) reaparece a los pocos minutos hasta acertarla; lo maneja ts-fsrs con sus pasos de aprendizaje. Resultado: las débiles vuelven antes, automáticamente, sin un sistema de prioridades aparte.

**Importante (corrección de modelo mental):** el usuario NO elige libremente "estudio 20 o 30". El algoritmo decide qué tarjetas tocan hoy. La perilla real es el **límite de tarjetas nuevas por día** (`newCardsPerDay`). El modo "por tiempo" (estudia 10 min) queda como envoltorio opcional futuro, no como mecanismo principal, porque puede dejar repasos vencidos sin hacer.

### 6.10 Bidireccional

La forma correcta de soportar estudiar `give up → rendirse` Y `rendirse → give up` con programación independiente: **dos documentos de tarjeta que comparten el mismo `noteId`**, uno con `direction: "forward"` y otro `"reverse"`, cada uno con su propio `scheduling`. Editar el contenido actualiza ambos hermanos.

- El esquema ya lo soporta (por eso `noteId` y `direction`).
- **En el MVP se crea solo `forward`.** La generación del hermano inverso queda detrás de `studyDirection: "both"` del libro, como interruptor que se activa después sin migrar nada.
- Pendiente menor (decisión de UX, no de esquema): cuándo/cómo exponer ese interruptor (por libro o por tarjeta).

### 6.11 Índices compuestos (a crear)

Firestore indexa campos sueltos solo; las consultas combinadas requieren índice explícito:

- `cards`: `bookId` + `scheduling.due` (cola por libro)
- `cards`: `bookId` + `scheduling.state` (contar/traer nuevas por libro)
- `reviewLogs`: `bookId` + `reviewedAt` (historial por libro)

### 6.12 Reglas de seguridad (esquema)

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Cada quien accede solo a su propio árbol. Cuando se agregue compartir mazos (datos compartidos), se añadirán reglas específicas para las colecciones de nivel superior (`/friendships/`, `/challenges/`, etc., ver §13); por ahora, aislamiento total.

---

## 7. Sistema de calificación

### 7.1 La restricción de fondo

Por debajo, FSRS piensa en **cuatro grados**: 1=Again, 2=Hard, 3=Good, 4=Easy. Ese número es lo que se pasa a ts-fsrs y lo que se guarda en `reviewLogs.rating`. La interfaz puede verse como se quiera **siempre que emita uno de esos cuatro grados**. La apariencia es libre; el significado aterriza en 4 niveles. Hay un **corte categórico**: o recordaste (Hard/Good/Easy) o no recordaste (Again, que reinicia la programación) — no es un gradiente continuo.

### 7.2 Decisión del MVP: cuatro cerebros 🧠

Cuatro íconos de **cerebro** en una fila, calificación en **un solo toque**:

| Cerebros | Color | Grado FSRS |
|----------|-------|------------|
| 1 | Rojo | Again |
| 2 | Naranja | Hard |
| 3 | Amarillo | Good |
| 4 | Verde | Easy |

Por qué cerebro y no estrella: las estrellas significan "qué tan bueno es *esto*" (calificar un producto); aquí el usuario se califica **a sí mismo** (qué tan bien recordó). El cerebro apunta a la metáfora correcta (memoria/recuerdo), evita el desfase, y desliga visualmente de Anki. (Se evaluaron y descartaron: rayo ⚡ como alternativa cercana; caritas y planta con sus trade-offs; pulgares/corazones/checks por no escalar a 4 niveles.)

### 7.3 Requisitos del componente de calificación

- **Cada cerebro es un objetivo de toque independiente y amplio**, no una barra de "llenado". Se toca la posición deseada directamente (certero en móvil).
- **Dos estados visuales claros por cerebro:** "activo/lleno" vs "tenue/apagado", para que el conteo (1 activo vs 4 activos) funcione como **diferenciador redundante al color** (accesibilidad/daltonismo: rojo-verde es el par más afectado; ~8% de hombres). El color es refuerzo, no la única señal.
- **Microcopy encima:** "¿Qué tan bien la recordaste?" — ancla la metáfora hacia el usuario (con el cerebro, solo refuerza).
- **Intervalo de retorno visible por opción:** ej. "verde → 6 días". Lo da el preview de ts-fsrs; hace tangible que el sistema responde a la honestidad.
- **Atajos de teclado en escritorio:** teclas 1-4 = 1-4 cerebros.

### 7.4 Naturaleza de la decisión

El componente de calificación es una **pieza de UI intercambiable que solo emite un grado 1-4**. El scheduler y el modelo de datos son indiferentes a su apariencia. Cambiarlo después es trivial y sin migración.

---

## 8. Pantallas y flujos

Diseñadas a nivel de estructura, contenido y comportamiento (no píxeles). Regla guía: limpio, rápido, baja fricción, lo opuesto a la interfaz intimidante de Anki.

**Marco que aplica a todas:**
- **Mobile-first de verdad.** Se diseña primero la pantalla angosta y luego cómo se expande. En móvil: navegación inferior (bottom tabs); en escritorio: esa misma navegación se vuelve lateral y el contenido se centra. Un diseño que respira distinto según el ancho, no dos.
- **La pantalla sagrada es el repaso.** Todo lo demás es andamiaje para llegar ahí.

### 8.1 Entrada / autenticación
Login y registro con Firebase Auth. Correo y contraseña en el MVP (Google fácil de sumar después). Si ya hay sesión, no se ve: abre directo en Home. Deliberadamente aburrida; no es donde está el valor.

### 8.2 Home / Hoy (aterrizaje)
Responde en un segundo a "¿qué estudio ahora?". Contenido:
- Encabezado simple con saludo y, discreto, la racha (elemento opcional de motivación).
- **Bloque protagonista:** "Tienes X tarjetas para repasar hoy" + botón grande **Estudiar ahora** (sesión global, todos los libros mezclados). Si no hay nada, estado vacío amable ("Estás al día", ver §9).
- Lista de **libros** con su pendiente individual ("Phrasal Verbs — 12 por repasar, 8 nuevas"). Tocar un libro entra a su detalle; también puede arrancar sesión solo de ese libro.
- Acceso claro para **crear o importar un libro**.

Jerarquía intencional: lo primero y más grande es estudiar; crear/administrar es secundario. Anki recibe con configuración; esta app recibe con la acción.

### 8.3 Biblioteca / detalle de un libro
Modo "gestión", tranquilo. Contenido:
- Cabecera: nombre, materia (`subject`), totales (tarjetas; dominadas vs en aprendizaje vs nuevas), botón **estudiar este libro**.
- Lista de **capítulos** con su conteo.
- Lista de **tarjetas** (dentro del capítulo): vista compacta anverso → reverso; buscar/filtrar cuando el volumen lo pida.
- Acciones: agregar tarjeta, editar, **suspender** (apartar sin borrar), borrar. Ajustes del libro: nuevas por día, dirección de estudio (interruptor bidireccional, ver 6.10).

### 8.4 Importar un libro
Materializa la convención de §5. Pasos en pantalla:
1. **Seleccionar archivo** `.txt`/`.md`. Nombre del libro precargado y editable.
2. **Previsualización** (clave): capítulos detectados, tarjetas válidas, y sección visible de **líneas problemáticas** (nº de línea + motivo). Nada guardado aún.
3. **Confirmar** → recién aquí se escribe en Firestore.

### 8.5 Crear / editar tarjeta y libro
Formularios simples.
- **Crear libro:** nombre, materia, y ajustes con defaults ya puestos (nuevas/día = 20). Crear = un clic, no un formulario largo.
- **Crear/editar tarjeta:** dos campos protagonistas (anverso, reverso) + a qué capítulo va. Los opcionales (ejemplo, pronunciación, notas) existen en el modelo pero en la UI van **plegados tras un "más opciones"** (Principio 2 hecho interfaz).

### 8.6 Sesión de repaso (el corazón)
Pantalla completa, sin tabs, sin ruido. Flujo de una tarjeta en dos momentos:
- **Momento 1 — pregunta:** solo el anverso, centrado y grande, y un botón único **Mostrar respuesta** (o tocar en cualquier lado / barra espaciadora). El esfuerzo de recordar antes de revelar es donde ocurre el aprendizaje; la UI lo respeta sin distracciones.
- **Momento 2 — calificación:** se revela el reverso (y los opcionales que tenga) y aparecen los **cuatro cerebros** (§7), cada uno mostrando cuándo volverá la tarjeta.

Apoyo discreto:
- Contador/barra de progreso de la sesión (tenue, no compite con la tarjeta).
- Salir en cualquier momento sin perder lo hecho (lo respondido se guarda, lo pendiente sigue pendiente).
- Atajos de teclado (espacio = revelar, 1-4 = calificar).

**Cierre de sesión:** pantalla breve y satisfactoria (cuántas repasaste, cómo fue, qué sigue), no un regreso seco al Home. Es el momento de recompensa que cierra el lazo del hábito. (Futuro: la puerta natural a la sesión de aplicación con IA, ver §13.)

### 8.7 Estadísticas / progreso
MVP sobrio y honesto: pendientes hoy, repasadas hoy, distribución de calificaciones, y estado de la colección (nuevas / en aprendizaje / dominadas). El panel de debilidades (leeches, retención por capítulo) es de fase posterior; esta pantalla nace humilde y se diseña para crecer hacia allá.

### 8.8 Ajustes
Perfil, tema (claro/oscuro/sistema), zona horaria y hora de inicio del día (definen cuándo es "hoy"), cerrar sesión. Los campos sociales (handle, avatar) viven aquí también, apagados, esperando su fase.

### 8.9 Mapa de navegación

Cuatro destinos principales (inferior en móvil, lateral en escritorio):

```
Hoy   ·   Biblioteca   ·   Progreso   ·   Ajustes
```

- **Hoy** → botón grande → **Sesión de repaso** (pantalla completa) → **Cierre** → vuelve a Hoy.
- **Biblioteca** → **Detalle de libro** → tarjetas; y también → **Importar** y → **Crear/editar**.
- La **Sesión de repaso** se lanza desde Hoy (global) o desde un libro (filtrada), pero siempre es el mismo componente de pantalla completa.

Dos flujos, dos tonos: **estudiar** (enfocado, sin distracción, pantalla completa) y **administrar** (tranquilo, con navegación). Mantenerlos separados es lo que hace que la app se sienta limpia.

---

## 9. Estados vacíos, de carga y de error

Separan una app pulida de una a medio hacer. Tres principios:

- **El estado vacío es una oportunidad, no un hueco.** Suele ser la primera pantalla de un usuario nuevo. Muestra qué hacer a continuación; enseña y dirige.
- **Cargar nunca debe sentirse como congelado.** Para contenido que carga, se usan **skeletons** (siluetas grises con la forma del contenido que viene), NO spinners. El skeleton hace sentir la app más rápida.
- **Un error dice qué pasó y qué hacer, nunca deja al usuario varado.** Mensaje en lenguaje humano (no códigos técnicos) y siempre una salida (reintentar, volver, entender).

**Estado por estado:**

- **Home — sin libros (el más importante):** primera impresión del usuario nuevo. En vez de "0 tarjetas", bienvenida que orienta + acción única protagonista: **crear o importar tu primer libro**. El vacío *es* el onboarding.
- **Home — con libros, nada pendiente hoy:** estado positivo de recompensa ("Estás al día 🎉") + opciones suaves (estudiar adelantado, agregar tarjetas), sin presionar.
- **Home — cargando:** skeleton del bloque de "hoy" y de la lista de libros.
- **Detalle de libro — libro sin tarjetas:** estado vacío que dirige a las dos formas de llenarlo (agregar a mano / importar).
- **Sesión de repaso — cola completada:** el cierre de sesión (§8.6), que es un estado vacío bien resuelto. Distinto de "no había nada que repasar" (ese caso ni entra a la sesión; se queda en Home con "estás al día").
- **Importación — sin líneas válidas:** la previsualización explica con calma que no se detectaron tarjetas válidas, recuerda el formato (`#` capítulos, `|` separador) y deja reintentar. El fallo se convierte en mini-guía.
- **Progreso — sin datos aún:** mensaje de que las estadísticas aparecerán al empezar a estudiar (promete el valor futuro en vez de mostrar gráficas vacías rotas).

**Errores transversales:**
- **Sin conexión:** como la app es PWA con offline, esto NO es un error, es un **modo**. Indicador discreto: "estás offline, tus repasos se guardarán y sincronizarán al volver". Es parte del diferenciador frente a Anki (donde el offline es engorroso).
- **Fallo al guardar/cargar:** mensaje humano + reintentar. Nunca un código crudo de Firestore en la cara del usuario.
- **Ruta inexistente (404):** pantalla simple que reconoce el tropiezo y devuelve al Home.

**Implementación:** componentes reutilizables `EmptyState` y `ErrorState` configurables (ícono, mensaje, acción), usados en todos lados. Consistencia forzada por estructura, no por copy repetido. El **tono** de estos textos es el primer lugar donde aparece la voz de producto (ver §10).

---

## 10. Dirección visual

A nivel de dirección y principios (no códigos de color finales; esos se afinan sobre componentes reales). Toda decisión visual vive como **design tokens** (Principio 5), implementados vía la configuración de Tailwind (§11).

### 10.1 Norte de identidad
**"Calma enfocada":** una app serena, ordenada y respetuosa de la atención, que invita a volver sin gritar. Sofisticada pero cálida. Ni la frialdad clínica e intimidante de Anki, ni el exceso lúdico y ruidoso de Duolingo. Cuando se abre a estudiar, baja el ruido en vez de subirlo.

### 10.2 Tipografía
- Una sola familia **sans-serif**, alta legibilidad, **buen soporte de acentos** (inglés y enseguida francés). Varios pesos (regular, medio, semibold) dan toda la jerarquía; no combinar tres fuentes.
- Contenido de tarjetas: máxima legibilidad, tamaño generoso (ahí el usuario lee con esfuerzo de memoria).
- Nota futura: los símbolos fonéticos (IPA) requieren una fuente que los soporte. No es problema del MVP, pero la elección tipográfica no debe cerrar esa puerta.

### 10.3 Color
- **Base neutra y tranquila** (blancos cálidos, grises suaves): el lienzo donde el contenido respira. La mayor parte de la app es neutra a propósito; el protagonismo es para las tarjetas.
- **Un solo color de acento** con personalidad, usado con disciplina (acción principal, elementos activos, toques de identidad). Sugeridos: índigo, teal profundo o terracota. **Evitar** el azul corporativo de siempre y el verde-Duolingo, para desligarse de ambos. La *regla* (un acento, con moderación) queda fija; el valor exacto se afina después.
- **Modo claro y oscuro desde el diseño**, no como parche (mucha gente estudia de noche). Colores definidos como **tokens semánticos** ("color-fondo", "color-texto-principal"), no literales, para que ambos modos funcionen sin reescribir.
- **Escala semántica de la calificación, reservada:** el rojo→naranja→amarillo→verde de los cerebros tiene significado (mal→bien). Esos colores se reservan para eso y se usan con cuidado en el resto, para que no compitan ni confundan. (Si el acento de marca fuera verde, chocaría con el verde de "lo dominé".)

### 10.4 Movimiento y micro-interacciones
- El movimiento da **continuidad y feedback, nunca decora**. Animaciones con propósito: la tarjeta que se voltea, la transición entre tarjetas, el cerebro que confirma el toque, el cierre que celebra brevemente.
- Todo **rápido y discreto** (una animación lenta en una acción repetida cien veces al día es tortura). Prueba de fuego: ¿ayuda a entender qué pasó o solo adorna? Si solo adorna, fuera.
- **Respetar la preferencia del sistema "reducir movimiento"** (accesibilidad).

### 10.5 Voz / tono de los textos
**Cálida, breve, humana, serena.** Habla como un buen mentor, no como un manual técnico ni como un coach eufórico. Celebra sin exagerar, corrige sin culpar, guía sin abrumar. Al terminar una sesión no dice "¡¡INCREÍBLE RACHA!!"; dice algo tranquilo y satisfactorio. Cuando algo falla, habla claro y da la mano. Consistente desde los botones hasta los errores.

### 10.6 Advertencia de prioridad
Para el MVP basta con **fijar el sistema** (tokens, una tipografía, base neutra, un acento, modo claro/oscuro, la regla de movimiento) y construir con valores razonables que luego se afinan. La identidad se pule *sobre la app real*, no en abstracto. El ajuste fino del color exacto es de las últimas cosas, no de las primeras — y es barato gracias a los tokens (Principio 5).

---

## 11. Estrategia de UI y componentes

### 11.1 Tailwind como base
Tailwind para todos los estilos. Su **configuración es el archivo de tema único**: define el acento, fondos, tipografía, espaciados como **tokens semánticos** ("acento", "superficie", "texto-principal"), NO los valores crudos de la paleta de Tailwind regados por las plantillas. Cambiar el acento = tocar ese único punto. (Refuerza Principio 5 y "prohibido el valor literal", ver `CLAUDE.md`.)

### 11.2 Filosofía de componentes
- **Construir a mano con Tailwind** los componentes simples que definen la identidad: botones, inputs, tarjetas, la fila de calificación de cerebros, los estados vacíos.
- **Apoyarse en primitivas headless accesibles** (comportamiento + accesibilidad sin estilo impuesto, vestidas con Tailwind) para lo complejo: modales/diálogos, menús desplegables, tooltips, tabs, switches. La accesibilidad de estos (manejo de foco, teclado) es peliaguda y no se debe reinventar.
- **Evitar** librerías de UI con estilo propio cerrado (p. ej. Angular Material completo): pelean contra la identidad propia y contra Tailwind (dos fuentes de verdad para el color).

### 11.3 Candidato y decisión a confirmar
**Angular CDK** es el candidato natural: da las primitivas de comportamiento accesible sin estilo (es, de hecho, la base sobre la que se construye Angular Material — usarlo *sin* Material da el comportamiento robusto vestido por uno mismo). **La elección final de la librería headless queda marcada como decisión a confirmar al inicio de la implementación**, verificando el estado vigente del ecosistema Angular (el panorama cambia rápido). Lo que queda fijo es la **estrategia**: Tailwind + headless accesible + componentes propios para lo simple.

---

## 12. Roadmap por fases y criterios de aceptación

El roadmap se divide en dos grandes bloques por costo (Principio 3):

- **Bloque sin costo recurrente** (Fases 0-1, y buena parte de 2): toda la app de estudio funciona completa sin gastar por uso. Única infraestructura: Firebase (capa gratuita generosa para uno o pocos usuarios).
- **Bloque con costo por uso** (IA, progresivo y medido): entra de a una funcionalidad, cada una con su medición de gasto antes de la siguiente.

Cada fase termina cuando cumple sus **criterios de aceptación**.

### Fase 0 — Fundaciones
Stack, esqueleto del proyecto, modelo de datos, auth, base PWA, sistema de design tokens en Tailwind, configuración de calidad (ESLint/Prettier/strict).

**Criterios de aceptación:**
- El proyecto compila y corre localmente con la estructura de carpetas definida en `CLAUDE.md`.
- Un usuario puede registrarse, iniciar y cerrar sesión (Firebase Auth).
- Las reglas de seguridad de Firestore aíslan a cada usuario a su propio árbol.
- La app es instalable como PWA y abre en móvil y escritorio.
- El archivo de tema (tokens) existe y los componentes base lo consumen (cero literales de color/fuente).

### Fase 1 — MVP
CRUD de libros/capítulos/tarjetas + importación por archivo + sesión de repaso con FSRS + cola diaria + estadísticas básicas + estados vacíos/carga/error + offline.

**Criterios de aceptación:**
- El usuario crea un libro a mano y le agrega tarjetas (anverso/reverso).
- El usuario importa un libro desde un `.txt`/`.md` siguiendo la convención de §5, con previsualización que reporta líneas problemáticas antes de guardar.
- La cola diaria se arma correctamente (vencidas + nuevas hasta `newCardsPerDay`), respetando zona horaria y hora de inicio del día.
- La sesión de repaso funciona de punta a punta: muestra anverso, revela reverso, califica con los 4 cerebros (con intervalo visible y atajos 1-4), y persiste el resultado vía ts-fsrs.
- Cada repaso escribe un `reviewLog` (incluyendo `durationMs`) y actualiza `dailyStats`.
- Las tarjetas falladas reaparecen en la sesión; las vencidas vuelven antes que las dominadas.
- La pantalla de progreso muestra las estadísticas básicas reales.
- Todos los estados vacíos/carga/error definidos en §9 están implementados con `EmptyState`/`ErrorState`.
- Los repasos hechos offline se guardan y sincronizan al recuperar conexión.
- **Es usable a diario para estudiar vocabulario de inglés** (el caso de uso prioritario).

### Fase 2 — Menos fricción
Auto-grading por tiempo de respuesta, tarjetas cloze, importación CSV, mini-quizzes generados con lógica local (sin IA: opción múltiple, completar la frase), atajos y refinamientos de UX, exportación a JSON.

**Criterios de aceptación (orientativos):**
- El tiempo de respuesta (`durationMs`, ya capturado) se usa para sugerir o asistir la calificación.
- Existe al menos un tipo de tarjeta adicional (cloze) y un modo de quiz generado localmente.
- El usuario puede exportar un libro a JSON e importar CSV.

### Fase 3 — Inteligencia (primer bloque con costo de IA)
Dashboard de debilidades (detección de leeches, retención por capítulo/libro), generación y enriquecimiento de tarjetas con IA, tutor de tarjetas difíciles, y "el libro como insumo" (Opción B: subir PDF/EPUB y generar tarjetas para curar). Aquí entra la **frontera de servicio de IA** (Cloud Functions) con su mecánica de medición de costo (registro por usuario/feature/tokens/costo estimado, topes por usuario y día). Se empieza por la funcionalidad de IA **más barata y de mayor valor** (probablemente la conversación de vocabulario) para validar el modelo de costos en pequeño antes de abrir las demás.

### Fase 4 — Idiomas
Pronunciación (mostrar fonética/IPA) y luego audio (TTS al vuelo del navegador, sin almacenar archivos), tipos de tarjeta para conjugación, mazos específicos de francés/inglés. (Las features de pronunciación/audio se etiquetan "solo idiomas", Principio 1.)

### Fase 5 — Aplicación, optimización y social
- **Aplicación con IA:** sesión de práctica activa al terminar el repaso, con moldes por materia (vocabulario → conversación; medicina → caso clínico; no verbal → interpretación de escenarios). Mismo motor, plantilla por materia. La señal de la práctica puede realimentar al scheduler (usar bien una palabra = evidencia de dominio más fuerte que un clic). *Nota de responsabilidad:* en medicina, la práctica se presenta como ayuda de estudio, no como fuente autoritativa; el temario sale de las tarjetas que el usuario creó y validó.
- **Optimización:** reentrenamiento personalizado de parámetros FSRS desde los `reviewLogs` acumulados (aporta de verdad con cientos de repasos por usuario).
- **Social:** ver §13.
- **Punto de reevaluación de backend propio** (ver §3): se revisa aquí, atado a features sociales pesados o volumen real.

---

## 13. Backlog de funcionalidades futuras

Registradas con visión clara pero fuera del alcance inmediato. No se detallan hasta su ronda de diseño; lo que queda es la puerta abierta y la regla de por dónde entran.

### 13.1 Capa de IA (toda detrás de la frontera de servicio, costo medido y progresivo)
- **Sesión de aplicación** (conversación / caso clínico / interpretación según materia), enganchada al cierre de la sesión de repaso.
- **Generación de mazos por encargo** ("dame los 100 phrasal verbs más usados").
- **Enriquecimiento de tarjetas** (ejemplo, fonética, palabras relacionadas, tarjeta inversa).
- **Tutor de tarjetas difíciles** (explicar distinto, mnemónico, descomponer).
- **"El libro como insumo"** (Opción B): subir PDF/EPUB → extraer y generar tarjetas para curar.
- **Realimentación de la práctica al scheduler.**

### 13.2 Capa social (datos compartidos, en colecciones de nivel superior — Principio 4)
Conlleva decisiones de privacidad y moderación; vive claramente en fase posterior, después de que el núcleo de estudio esté sólido y en uso diario.
```
/friendships/{id}    → relación entre dos usuarios (pendiente/aceptada)
/challenges/{id}     → reto: participantes, libro objetivo, meta, progreso de c/u
/activityFeed/...    → actividad pública para el feed tipo Duolingo
```
- **Reto con un amigo** ("quién domina primero phrasal verbs"): requiere definir qué significa "dominar" (p. ej. % de tarjetas del libro en estado de repaso maduro), calculado desde datos que ya se guardan. El reto lee las tarjetas para calcular un número; no las toca.
- **Perfil social tipo Duolingo:** agregar amigos, ver qué estudian y cómo avanzan. Necesita `/friendships/` + feed, y decisiones de privacidad (qué se expone). El `isSearchable` sembrado en el perfil es la primera piedra.

### 13.3 Generador de libros independiente
Herramienta de autoría donde el usuario crea contenido página/tarjeta a la vez en una UI cómoda, con **exportación multi-formato** (texto plano con la convención `#`/`|`, CSV compatible con Anki, JSON). Reutiliza el módulo de autoría de la app principal (comparten la lógica de escribir contenido estructurado y serializarlo). Posible **producto de entrada** para captar usuarios de Anki. Decisión señalada para su ronda: si exporta a `.apkg` nativo (complejo: SQLite empaquetado) o se queda en CSV para que Anki importe.

### 13.4 Otras
- Modo de estudio "por tiempo" como envoltorio opcional.
- Importación de mazos `.apkg` de Anki.
- Compartir mazos entre usuarios.

---

*Fin de la especificación. El contrato de ingeniería y las reglas permanentes están en `CLAUDE.md`.*
