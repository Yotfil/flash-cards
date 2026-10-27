# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado del código en `origin/dev` (`0b3964f`), verificado el 2026-10-26:

- `services/cards/normalize-card-text.ts` solo recorta, pasa a minúsculas y colapsa espacios. Lo usan cinco sitios: `card-duplicates.ts` (listado y aviso del formulario), `count-repeated-lines.ts` (previsualización de la importación), `sort-cards-for-display.ts` (orden del listado y de la exportación), `generate-quiz.ts` (distractores) y `written-answer.ts` (corregir lo escrito).
- `services/practice/generate-quiz.ts` hace una pregunta por tarjeta y solo excluye de los distractores la respuesta propia; `QuizQuestion` lleva un único `answer`.
- `services/practice/written-answer.ts`: `SYNONYM_SEPARATORS = /[,;/]/`.
- `services/practice/practice.service.ts` devuelve el número de preguntas; el detalle del libro pasa un `emptyMessage` fijo al `StudyLaunchButton`. Sin red, la lectura del libro devuelve lo guardado y, si no hay nada, `[]` sin error (sonda de integración de la revisión).
- Foco: `written-question` enfoca su campo por pregunta (`effect` sobre `questionId`); `practica-page` enfoca "Siguiente" al responder; `multiple-choice-question`, `practice-summary` y `session-summary` (cierre del repaso y de la práctica con IA) no mueven el foco.

## Goals / Non-Goals

**Goals:**
- Una sola definición de "texto normalizado" para todas las comparaciones (decisión 3), sin tocar lo guardado.
- La corrección de la práctica en servicios puros, probada sin pantalla.
- El foco gestionado por el componente que aparece, con el mismo patrón que ya usa la pregunta de escribir.

**Non-Goals:**
- Cambiar datos, reglas, índices o el número de lecturas.
- Recortar enunciado y respuesta, o deduplicar el registro del fallo al leer el libro (informativos de la revisión).
- Una directiva genérica de foco: tres usos con formas distintas (por pregunta, al aparecer) no la justifican aún.

## Decisions

### D1. La normalización vive solo en `normalizeCardText` (servicio puro)
`text.normalize('NFC')`, después `’ ‘ ʼ → '` y `“ ” → "`, y lo de siempre (recortar, minúsculas, colapsar espacios). Al estar en la única función que usan las cinco comparaciones, el listado, el aviso del formulario, la importación, el orden y la práctica cambian juntos, como pidió la decisión 3. Alternativa descartada: una función propia de la práctica (dejaría «don’t» y «don't» como no repetidas en el listado). El texto guardado no pasa por aquí: solo las claves de comparación.

### D2. Una pregunta por anverso normalizado (servicio puro, `generate-quiz.ts`)
`generateQuiz` agrupa primero las elegibles por `normalizeCardText(front)`; cada grupo conserva el anverso, el id de la primera tarjeta y sus reversos distintos (clave normalizada, texto de la primera aparición, en orden de aparición). Luego baraja los grupos y toma hasta 10, como hoy con las tarjetas.

`QuizQuestion` gana `acceptedAnswers: readonly string[]` (todos los reversos del grupo); `answer` sigue siendo la respuesta "mostrada": en opción múltiple, una de `acceptedAnswers` elegida con el `random` inyectado; en escribir, la primera. Los distractores excluyen cualquier reverso cuya clave esté en el grupo, y también los reversos de tarjetas del pool con el mismo anverso normalizado (hoy el pool siempre es el mismo conjunto, pero el parámetro existe). La alternancia por posición y la caída a escribir no cambian.

`practice-state.answerCurrent` corrige la escrita con `acceptedAnswers.some((answer) => isWrittenAnswerCorrect(chosen, answer))`; la opción múltiple sigue por igualdad exacta con `answer`. `PracticeFeedback` gana `correctAnswers`: en escribir, `acceptedAnswers`; en opción múltiple, `[answer]` (la opción resaltada). `wrongAnswerLabel(answers)` en `practica.copy.ts` arma «a» / «a» o «b» / «a», «b» o «c».

Alternativa descartada: elegir siempre el primer reverso como correcto en opción múltiple; al azar, las acepciones se reparten entre prácticas.

### D3. Separadores con dígitos (servicio puro, `written-answer.ts`)
`SYNONYM_SEPARATORS = /(?<!\d)[,;/]|[,;/](?!\d)/`: un separador parte salvo que tenga un dígito justo antes y justo después. "3,14", "1/2", "25/12" quedan enteros; "m/s", "ir, irse", "3, 4" (con espacio) siguen partiendo.

### D4. PQ-06: el servicio dice por qué no hay preguntas; la página elige el texto
`PracticeService.prepareBookPractice` devuelve `{ questions: number; nothingOnDevice: boolean }`, donde `nothingOnDevice = cards.length === 0 && !connectivity.online()` (inyecta `ConnectivityPort`, que ya es un puerto de dominio). `prepareChapterPractice` no cambia (sigue devolviendo un número: el capítulo nunca lee).

El detalle del libro (UI) envuelve la preparación: guarda en una señal el texto del vacío (`PRACTICA_COPY.nothingOnDeviceOffline` si `nothingOnDevice`, si no `nothingToPractice`) y devuelve `questions` al botón. `StudyLaunchButton` no cambia: lee `emptyMessage()` al pintar el estado vacío, así que toma el texto que la página dejó listo. Alternativas descartadas: decidir solo con `online()` en la página (diría "este dispositivo aún no tiene tarjetas" a quien sí las tiene pero son cloze) y cambiar el contrato del botón, que comparten Hoy, el capítulo y el libro.

### D5. Foco (UI)
- `multiple-choice-question` recibe `questionId` (como la de escribir) y, con un `effect` sobre él, enfoca su `h2` (`tabindex="-1"`). La página se lo pasa.
- `practice-summary` y `session-summary` enfocan su `h1` (`tabindex="-1"`) en `afterNextRender`. `session-summary` es el cierre del repaso y de la práctica con IA: un cambio cubre los dos.
- Los títulos enfocados no son controles: llevan `focus-visible:outline-none` para no dibujar el anillo de los botones. El anillo de los controles no cambia.
- El enunciado y no la primera opción: tras Intro en "Siguiente", un segundo Intro sobre una opción respondería sin querer.

### D6. `autocorrect="off"` en el campo de escribir (UI)
Atributo estático junto a `autocomplete`, `autocapitalize` y `spellcheck`. Si en el iPhone la "puntuación inteligente" no se apaga con él, D1 ya iguala el apóstrofo.

### Superficies (ADR 0003)
Sin superficies nuevas. La práctica, sus preguntas y los cierres siguen sólidos (`bg-surface`); ningún acrílico nuevo.

## Risks / Trade-offs

- [El orden del listado y de la exportación cambia para textos con comillas tipográficas] → Es el efecto buscado (ordenan igual que su versión recta); el desempate por reverso y antigüedad no cambia.
- [Tarjetas que antes no eran repetidas pasan a serlo] → Solo las que se leen igual; el indicador no bloquea nada.
- ["m" sigue valiendo por «m/s»] → Aceptado en la decisión 5.
- [Siempre «o», nunca «u» ante o-/ho-] → Las respuestas pueden estar en cualquier idioma; es el texto decidido.
- [Con lie-fi, `online()` es cierto y la lectura cae a lo guardado: vacío → "Nada que practicar aún."] → Como hoy; poco probable.
- [El foco en un título sin anillo puede desorientar a quien mira la pantalla] → El lector lo anuncia y el siguiente Tab cae en el primer control, que sí muestra el anillo.

## Plan de pruebas

Cada escenario de los deltas → prueba y capa. Todas en rojo antes del código (TDD). No hay cambios de repositorio, así que la integración solo fija la premisa de PQ-06.

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `practica-quiz`: Capítulo grande / Capítulo pequeño (ya cubiertos) | `generate-quiz.spec`: siguen en verde con anversos distintos | unitaria |
| `practica-quiz`: Mismo anverso con dos acepciones | `generate-quiz.spec`: `bank→banco`, `bank→orilla`, `house→casa` → 2 preguntas; la de "bank" con `acceptedAnswers` `['banco','orilla']` | unitaria |
| `practica-quiz`: Capítulo con sus tarjetas repetidas | `generate-quiz.spec`: 5 tarjetas ×2 → 5 preguntas con anversos distintos (la sonda PQ-02 de la revisión) | unitaria |
| `practica-quiz`: Anversos que solo difieren al escribirse | `generate-quiz.spec`: `Don’t` y `don't` → 1 pregunta con los dos reversos | unitaria |
| `practica-quiz`: Cuatro opciones / Reversos repetidos / Distractores fuera del quiz (ya cubiertos) | siguen en verde | unitaria |
| `practica-quiz`: La otra acepción nunca es distractor | `generate-quiz.spec`: con 6 tarjetas y 50 semillas, cada pregunta de opción múltiple de "bank" tiene exactamente una de banco/orilla y es `answer` | unitaria |
| `practica-quiz`: Cualquier acepción del anverso vale | `practice-state.spec`: pregunta escrita con `acceptedAnswers ['banco','orilla']`, responder "orilla" → correcta | unitaria |
| `practica-quiz`: Apóstrofo tipográfico y recto | `normalize-card-text.spec` (’ ‘ ʼ → ', “ ” → "); `written-answer.spec`: «don’t»/"don't" en los dos sentidos | unitaria |
| `practica-quiz`: Tilde escrita aparte | `normalize-card-text.spec` y `written-answer.spec`: `'rendí'` frente a `'rendí'` | unitaria |
| `practica-quiz`: Los acentos sí importan, Mayúsculas, Fragmentos, Reverso completo, Respuesta distinta, Entrada vacía (ya cubiertos) | `written-answer.spec` sigue en verde | unitaria |
| `practica-quiz`: Un número decimal no se parte / Fecha o fracción | `written-answer.spec`: "3" no vale por "3,14" y "3,14" sí; "25" por "25/12" y "1" por "1/2", no | unitaria |
| `practica-quiz`: Entre letras la barra sigue separando | `written-answer.spec`: "m" vale por "m/s" | unitaria |
| `practica-quiz`: campo sin autocorregir | `written-question.component.spec`: el campo tiene `autocorrect="off"` | componente |
| `practica-quiz`: Fallo al escribir con varias acepciones | `practica.copy.spec`: `wrongAnswerLabel` con 1, 2 y 3 respuestas; `practice-session.service.spec`: en escribir, `feedback().correctAnswers` = las aceptadas; `practice-feedback.component.spec`: pinta "La respuesta era «banco» o «orilla»." | unitaria + componente |
| `practica-quiz`: Fallo en opción múltiple con varias acepciones | `practice-session.service.spec`: en opción múltiple, `correctAnswers` = `[answer]` | unitaria |
| `practica-quiz`: Libro sin red que el dispositivo nunca leyó | `practice.service.spec`: `FakeConnectivity` sin red y libro vacío → `{ questions: 0, nothingOnDevice: true }`; `libro-detail-page.component.spec`: sin red, "Practicar" → "Sin conexión, este dispositivo aún no tiene tarjetas de este libro." y no navega (la sonda PQ-06) | unitaria + componente |
| `practica-quiz`: Sin red con tarjetas guardadas pero ninguna elegible | `practice.service.spec`: sin red y solo cloze → `nothingOnDevice: false`; `libro-detail-page.component.spec`: "Nada que practicar aún." | unitaria + componente |
| `practica-quiz`: Libro sin tarjetas elegibles (con red), Falla la lectura, Libro con tarjetas básicas (ya cubiertos) | siguen en verde con el resultado nuevo | unitaria + componente |
| `practica-quiz`: Libro sin red (premisa) | `tests/firestore/card.repository.integration.spec`: leído con red y después sin red → mismas tarjetas; nunca leído y sin red → `[]` sin error | integración (emulador 8085) |
| `practica-quiz`: Dos prácticas seguidas (barajadas de nuevo) | `generate-quiz.spec`: la prueba existente de dos azares distintos → órdenes distintos sigue en verde | unitaria |
| `practica-quiz`: Primera pregunta de opción múltiple / Avanzar a una de opción múltiple | `practica-page.component.spec`: al abrir, `document.activeElement` es el `h2` del enunciado; responder escrita, "Siguiente" → el `h2` de la siguiente (la sonda PQ-07) | componente |
| `practica-quiz`: Avanzar a una de escribir / Tras responder | `practica-page.component.spec`: foco en el campo y en "Siguiente"/"Ver resultado" (hoy sin prueba: se añade) | componente |
| `practica-quiz`: Resumen | `practica-page.component.spec`: "Ver resultado" → foco en el `h1` "¡Práctica completada!"; `practice-summary.component.spec`: enfoca su título al crearse | componente |
| `sesion-de-repaso`: Cierre con teclado | `session-summary.component.spec`: al crearse, el `h1` tiene el foco; `repaso-page.component.spec`: al terminar la sesión, foco en "Sesión terminada" | componente |
| `practica-con-ia`: Cierre con teclado | `practice-ai-page.component.spec`: al terminar, foco en "Práctica terminada" | componente |
| `tarjetas`: Normalización de apóstrofos y comillas | `normalize-card-text.spec` | unitaria |
| `tarjetas`: Repetidas con apóstrofo tipográfico / con la tilde aparte | `card-duplicates.spec`: `findDuplicateCardIds` marca las dos | unitaria |
| `tarjetas`: Repetida con otro apóstrofo (formulario) | `card-duplicates.spec`: `isDuplicateDraft` con `don't` frente a `don’t` | unitaria |
| `tarjetas`: resto de escenarios (ya cubiertos) | `card-duplicates.spec`, `card-form-dialog.component.spec` siguen en verde | unitaria + componente |
| `importacion` (hereda): repetidas en la previsualización | `count-repeated-lines.spec`: `don’t \| no hacer` en el texto y `don't \| no hacer` en el capítulo → 1 repetida | unitaria |
| orden (hereda) | `sort-cards-for-display.spec`: `“b”` ordena junto a `"b"` | unitaria |

Sin e2e. La comprobación con teclado y lector de pantalla en un navegador real, y el `autocorrect` en un iPhone, quedan para el usuario en el branch deploy.

## Migration Plan

Sin migración de datos ni de reglas. Despliegue por merge a `dev`. Rollback: revertir el PR; nada guardado depende del cambio.

## Contratos que deja listos

- `normalizeCardText` como única definición de "normalizado": EX-01 (ida y vuelta del texto) e IM-06 (repetidas por capítulo, punto 6) la reutilizan tal cual.
- `QuizQuestion.acceptedAnswers` y `PracticeFeedback.correctAnswers`: cualquier tipo de pregunta nuevo (p. ej., invertir anverso y reverso) corrige y explica con ellos.
- `prepareBookPractice` con motivo del vacío: el mismo patrón sirve si "Estudiar este libro" necesita distinguir "sin nada en el dispositivo".
- Títulos enfocables (`tabindex="-1"` + `focus-visible:outline-none`) en los cierres: el patrón para cualquier pantalla que cambie de contenido sin navegar.
