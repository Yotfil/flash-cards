# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Puerta antes de cada commit: `bash ../flash-cards/docs/herramientas/puerta.sh` desde el worktree (el guion vive en la copia del usuario, `docs/` no se versiona; lint, formato, tipos, unitarias, integración en el 8085 con `demo-cadence-test` y build). Un commit por par prueba + código. Unitarias de un área: `npx ng test --watch=false --include='src/app/<ruta>/**/*.spec.ts'`.

## 1. Una sola normalización (cerebro, PQ-03)

- [x] 1.1 Pruebas en rojo: `normalize-card-text.spec` (’ ‘ ʼ → ', “ ” → ", `'rendí'` → `'rendí'`, sigue recortando, bajando a minúsculas y colapsando); `written-answer.spec` («don’t»/"don't" en los dos sentidos y la tilde aparte); `card-duplicates.spec` (`findDuplicateCardIds` con `don’t | no hacer` y `don't | no hacer`, y con la tilde aparte; `isDuplicateDraft` con `don't` frente a `don’t`); `count-repeated-lines.spec` (`don’t | no hacer` en el texto contra `don't | no hacer` del capítulo → 1); `sort-cards-for-display.spec` (`“b”` ordena junto a `"b"`). Verificar: fallan porque `normalizeCardText` no unifica.
- [x] 1.2 Implementar D1 en `normalizeCardText` (NFC, apóstrofos y comillas, y lo de siempre) con su comentario del porqué. Verificar: 1.1 en verde y las pruebas existentes de tarjetas, importación, exportación y práctica en verde.

## 2. Separadores con dígitos (cerebro, PQ-04)

- [x] 2.1 Pruebas en rojo en `written-answer.spec`: "3" no vale por "3,14" y "3,14" sí; "25" no vale por "25/12"; "1" no vale por "1/2"; "m" sigue valiendo por "m/s". Verificar: las tres primeras fallan.
- [x] 2.2 Cambiar `SYNONYM_SEPARATORS` según D3 y actualizar el comentario. Verificar: 2.1 en verde y el resto de `written-answer.spec` en verde.

## 3. Una pregunta por anverso (cerebro, PQ-02 y PQ-08)

- [x] 3.1 Pruebas en rojo en `generate-quiz.spec`: `bank→banco`, `bank→orilla`, `house→casa` → 2 preguntas y "bank" con `acceptedAnswers` `['banco','orilla']`; 5 tarjetas ×2 → 5 preguntas con anversos distintos; `Don’t` y `don't` → 1 pregunta con los dos reversos; con 6 tarjetas y 50 semillas, cada opción múltiple de "bank" tiene exactamente una de banco/orilla y es su `answer`. Verificar: fallan (hoy una pregunta por tarjeta y sin `acceptedAnswers`).
- [x] 3.2 Implementar D2 en `generateQuiz` (agrupar, barajar grupos, `acceptedAnswers`, correcta al azar en opción múltiple, distractores sin el grupo) y actualizar su comentario. Verificar: 3.1 en verde y el resto de `generate-quiz.spec` en verde (incluida la de dos azares → órdenes distintos).
- [x] 3.3 Pruebas en rojo: `practice-state.spec` (escrita con `acceptedAnswers ['banco','orilla']`: "orilla" → correcta); `practice-session.service.spec` (`feedback().correctAnswers`: en escribir, las aceptadas; en opción múltiple, `[answer]`); `practica.copy.spec` (`wrongAnswerLabel` con 1, 2 y 3 respuestas: «a» · «a» o «b» · «a», «b» o «c»). Verificar: fallan.
- [x] 3.4 Implementar en `practice-state.answerCurrent`, `PracticeSessionService.feedback` y `wrongAnswerLabel(answers)`. Verificar: 3.3 en verde.
- [x] 3.5 Prueba en rojo en `practice-feedback.component.spec`: con `correctAnswers ['banco','orilla']` pinta "La respuesta era «banco» o «orilla»."; la de una respuesta sigue igual. Verificar: falla.
- [x] 3.6 Pasar `correctAnswers` al feedback (entrada del componente y plantilla). Verificar: 3.5 en verde y `practica-page.component.spec` en verde.
- [x] 3.7 README: un párrafo "Práctica" (una pregunta por anverso, la normalización única de `normalizeCardText` y los separadores con dígitos). Verificar: `npx prettier --check README.md`.

## 4. Libro sin red y sin nada guardado (PQ-06)

- [ ] 4.1 Pruebas de integración en `tests/firestore/card.repository.integration.spec.ts`: leído con red y después sin red → mismas tarjetas; nunca leído y sin red → `[]` sin error. Verificar: pasan ya (fijan la premisa del mensaje); correr con la puerta (8085).
- [ ] 4.2 Pruebas en rojo en `practice.service.spec` con `FakeConnectivity`: sin red y libro vacío → `{ questions: 0, nothingOnDevice: true }`; sin red y solo cloze → `nothingOnDevice: false`; con red y vacío → `false`; con tarjetas → `questions > 0`. Verificar: fallan (hoy devuelve un número).
- [ ] 4.3 Implementar D4 en `PracticeService.prepareBookPractice` (inyecta `ConnectivityPort`). Verificar: 4.2 en verde y las pruebas del libro existentes adaptadas al resultado nuevo.
- [ ] 4.4 Pruebas en rojo en `libro-detail-page.component.spec`: sin red y libro sin nada guardado, "Practicar" → "Sin conexión, este dispositivo aún no tiene tarjetas de este libro." y la URL no cambia; sin red con solo cloze → "Nada que practicar aún."; el texto nuevo en `practica.copy.spec`. Verificar: fallan.
- [ ] 4.5 Implementar en el detalle del libro (envoltorio de `preparePractice` + señal del texto vacío) y `PRACTICA_COPY.nothingOnDeviceOffline`. Verificar: 4.4 en verde y las pruebas existentes de "Practicar" del libro en verde.

## 5. Campo y foco (UI, PQ-03 y PQ-07)

- [ ] 5.1 Prueba en rojo en `written-question.component.spec`: el campo tiene `autocorrect="off"`. Verificar: falla.
- [ ] 5.2 Añadir el atributo (D6). Verificar: 5.1 en verde.
- [ ] 5.3 Pruebas en rojo: `multiple-choice-question.component.spec` (al crearse y al cambiar `questionId`, el foco está en el `h2` del enunciado, que tiene `tabindex="-1"`); `practica-page.component.spec` (al abrir con una de opción múltiple, foco en su enunciado; tras responder, en "Siguiente"; al avanzar a una escrita, en el campo; al avanzar a otra de opción múltiple, en su enunciado; en la última, en "Ver resultado"). Verificar: fallan las de opción múltiple.
- [ ] 5.4 Implementar D5 en `multiple-choice-question` (entrada `questionId`, `effect` de foco, `tabindex="-1"` y `focus-visible:outline-none`) y pasarle `question.id` desde la página. Verificar: 5.3 en verde.
- [ ] 5.5 Pruebas en rojo: `practice-summary.component.spec` (al crearse, foco en su `h1`); `practica-page.component.spec` ("Ver resultado" → foco en "¡Práctica completada!"). Verificar: fallan.
- [ ] 5.6 Implementar en `practice-summary` (`afterNextRender`, `tabindex="-1"`, sin anillo). Verificar: 5.5 en verde.
- [ ] 5.7 Pruebas en rojo: `session-summary.component.spec` (al crearse, foco en el `h1`); `repaso-page.component.spec` (al terminar la sesión, foco en "Sesión terminada"); `practice-ai-page.component.spec` (al terminar, foco en "Práctica terminada"). Verificar: fallan.
- [ ] 5.8 Implementar en `session-summary` (enfocar el título en el mismo `afterNextRender` que arranca el conteo; `tabindex="-1"`, sin anillo). Verificar: 5.7 en verde y el resto de pruebas del repaso y de la práctica con IA en verde.

## 6. Cierre

- [ ] 6.1 Puerta completa en verde sobre la rama (`bash ../flash-cards/docs/herramientas/puerta.sh`). Verificar: "PUERTA: VERDE" con los conteos anotados en la bitácora.
- [ ] 6.2 `opsx:archive practica-quiz-respuestas` dentro de la rama: las specs base de `practica-quiz`, `tarjetas`, `sesion-de-repaso` y `practica-con-ia` llevan el delta y `openspec/changes/` queda sin el change. Verificar: `openspec validate --specs --strict` en verde y `openspec list` sin el change.
- [ ] 6.3 Push de `feature/practica-quiz-respuestas`, link `https://github.com/Yotfil/flash-cards/compare/dev...feature/practica-quiz-respuestas?expand=1` y resumen del PR; actualizar `docs/retome.md` y la bitácora de `MEMORY.md`. Verificar: la rama está en GitHub.
