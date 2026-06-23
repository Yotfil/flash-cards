# CLAUDE.md

> Instrucciones permanentes para Claude Code en este proyecto. Se leen en cada sesión. La especificación completa de producto vive en `/Users/yotfil/Documents/Yotfil/Programming/Claude/flash-cards/docs/especificacion-anki-mejorada.md`; este archivo destila lo que se necesita para escribir código correctamente. Ante conflicto, la especificación manda en *qué* construir; este archivo manda en *cómo*.

## Qué es el proyecto

App web (PWA) de repetición espaciada, abrible en móvil y escritorio. Primer caso de uso: vocabulario de inglés. **Materia-agnóstica**: el mismo sistema sirve para cualquier tema. No es "otro Anki": el valor está en UX limpia, baja fricción, organización por "libros", y (a futuro) aplicación del conocimiento y diagnóstico de debilidades.

## Stack

- **Angular** (PWA, offline) · **TypeScript** estricto (`strict: true`)
- **Tailwind CSS** (su config = archivo de tema único, tokens semánticos)
- **ts-fsrs** (algoritmo de programación; NO reimplementar algoritmos)
- **Firebase**: Firestore + Auth + Hosting
- **Zod** (validación en la frontera)
- **ESLint + Prettier**

## Los 5 principios rectores (resolver ambigüedades a su favor)

1. **Materia-agnóstico** — tarjeta = anverso/reverso genérico, NUNCA "palabra/traducción". La materia es solo una etiqueta (`subject`) en el libro.
2. **Esquema listo / UI después** — los campos futuros (pronunciation, audio, example, notes) existen en el modelo desde ya; la UI del MVP solo expone front/back.
3. **Costo-consciencia primero** — nada de servicios de pago-por-uso en MVP/fases tempranas. La IA entra después, progresiva, medida, y SIEMPRE detrás de una frontera de servicio única (Cloud Functions).
4. **Diseñar para la extensión** — datos privados bajo `/users/{uid}/...`; datos compartidos (futuro social) en colecciones de nivel superior. Se extiende, no se rompe. Campos futuros: opcionales y apagados.
5. **Calidad mantenible** — legible por un junior, por capas, debuggeable.

## Contrato de ingeniería (reglas verificables, aplican a CADA archivo)

- **Legibilidad sobre cleverness.** Nombres completos y descriptivos. Funciones cortas, una sola cosa. Explícito y aburrido > ingenioso y compacto.
- **Arquitectura por capas (Ports & Adapters):**
  - UI (componentes): solo pinta y captura eventos. No conoce Firestore ni FSRS.
  - Lógica de negocio (servicios): cola diaria, programación, parser. Código puro.
  - Acceso a datos (repositorios): ÚNICA capa que habla con Firestore.
  - ts-fsrs y Firestore entran como adaptadores detrás de una interfaz.
- **Tipado fuerte, cero `any`** (salvo justificación escrita). Modelos como interfaces, respetados de punta a punta.
- **Errores explícitos.** Prohibido `catch` vacío. Cada fallo posible se maneja visible y, donde toca, se comunica al usuario.
- **Validación en la frontera con Zod.** Datos externos (imports, futura IA, datos de Firestore) se validan ANTES de tocarlos.
- **Secretos en variables de entorno** desde el commit cero. `.env.example` versionado, `.env` real en `.gitignore`. NUNCA hardcodear claves.
- **Git: commits atómicos**, pequeños, enfocados, con mensaje claro. Nunca un commit gigante. **Los mensajes de commit NO deben incluir el trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` ni ningún otro `Co-Authored-By` de Claude.** Crea todos los commits sin esa línea.
- **Git: una rama por feature.** Cada feature nuevo se implementa en su propia rama, con la convención **`feature/<nombre-en-kebab-case>`** (ej. `feature/firestore-security-rules`). El trabajo se desarrolla y commitea ahí. Cuando el usuario lo apruebe, se mergea a `main`, pero **NO se borra la rama del feature**: se conservan a propósito para poder revisar el progreso de cada feature y los estados de la app a lo largo del tiempo. (Excepción: cambios de proceso/meta como editar este `CLAUDE.md` pueden ir directo a `main`.)
- **Documentación viva:** README actualizado; comentarios que explican el PORQUÉ (no el qué); ADRs para decisiones estructurales.
- **Design tokens: prohibido el valor literal.** Ningún componente escribe un color o fuente a mano; siempre un token semántico en la config de Tailwind. Cambiar identidad = tocar un solo archivo.
- **Consistencia por herramientas:** ESLint + Prettier + TS strict configurados desde el inicio.
- **Responsive + accesibilidad como base** (no retoque): móvil + escritorio, contraste, teclado, etiquetas semánticas, `prefers-reduced-motion`, diferenciadores no solo por color.

## Calibración del rigor (NO sobre-construir)

- **Pruebas concentradas en el "cerebro"**: parser de importación, armado de la cola, integración con ts-fsrs. UI más liviana. No perseguir 100% de cobertura.
- **Fuera de alcance ahora:** CI/CD, contenedores, microservicios, backend propio, abstracciones especulativas. Firebase Hosting + deploy por comando basta.
- Abstraer cuando el segundo caso real aparece, no antes.

## Modelo de datos (resumen — detalle en la especificación §6)

Todo bajo `/users/{uid}/`:
- `books/{bookId}` — name, subject, studyDirection, newCardsPerDay (def 20), maxReviewsPerDay, order, cardCount
- `chapters/{chapterId}` — bookId, name, order
- `cards/{cardId}` — bookId, chapterId, noteId, direction, front, back, [pronunciation, example, audioUrl, notes, tags] opcionales, `scheduling{}` (espeja Card de ts-fsrs), suspended
- `reviewLogs/{logId}` — append-only; cardId, bookId, rating(1-4), state, ..., reviewedAt, durationMs (capturar desde MVP aunque no se use)
- `dailyStats/{YYYY-MM-DD}` — newCardsIntroduced{bookId}, reviewsCompleted, ratingCounts

Cola diaria = vencidas (state≠0, due≤finDía, todas) + nuevas (state==0, hasta newCardsPerDay menos las de hoy). Índices compuestos: cards(bookId+scheduling.due), cards(bookId+scheduling.state), reviewLogs(bookId+reviewedAt). Reglas de seguridad: `request.auth.uid == uid`.

## Sistema de calificación

4 cerebros 🧠 en fila, un toque. 1=rojo/Again, 2=naranja/Hard, 3=amarillo/Good, 4=verde/Easy → emite grado 1-4 a ts-fsrs. Cada cerebro = objetivo de toque independiente y amplio (no barra de llenado). Conteo redundante al color (daltonismo). Microcopy "¿Qué tan bien la recordaste?". Intervalo de retorno visible por opción (preview de ts-fsrs). Atajos 1-4 en escritorio. El componente solo emite 1-4; cambiar su apariencia no toca scheduler ni modelo.

## Pantallas (detalle en §8)

Nav: **Hoy · Biblioteca · Progreso · Ajustes** (inferior en móvil, lateral en escritorio). Repaso en pantalla completa, sin tabs. Importación con previsualización obligatoria antes de guardar. Estados vacíos/carga/error como componentes reutilizables (`EmptyState`, `ErrorState`); skeletons sobre spinners; offline como modo, no error.

## Dirección visual

"Calma enfocada" (ni la frialdad de Anki ni el ruido de Duolingo). Una familia sans legible con soporte de acentos. Base neutra + UN acento disciplinado (NO azul corporativo ni verde-Duolingo). Claro/oscuro vía tokens semánticos. La escala rojo→verde está RESERVADA para la calificación. Movimiento con propósito, rápido. Voz cálida, breve, humana, serena. **Fijar el sistema de tokens ahora; afinar valores exactos sobre la app real.**

## Reglas de oro del proceso

- No meter un feature nuevo hasta que el anterior esté sólido.
- MVP = lo mínimo usable a diario para estudiar vocabulario de inglés en móvil y escritorio, online y offline.
- Cualquier feature de IA: detrás de la frontera única, con registro de costo y tope por usuario, empezando por la más barata y de mayor valor.
