# Tasks

> **Dónde y cómo.** Rama de la 1.1.0 (`feature/reescritura-cadence`, trabajada desde un worktree), después del merge
> de `dev` (`31c8ca6`). Un grupo por hallazgo, del alto a los bajos. Cada tarea de código va precedida por su prueba en
> rojo (skill `tdd`), sacada de la sonda que indica el "Plan de pruebas" del design.
>
> **Puerta antes de cada commit:** `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`,
> `npm run build` y la integración con la plantilla del emulador en el 8085 (nunca contra el 8080).
>
> **Commits:** uno `fix(practica-con-ia): …` por grupo. Este change se commitea antes del código y se archiva al
> final, cada vez con su propio commit `docs(openspec): …`.

## 1. IA-01 · Un ítem borrado en otro dispositivo no rompe la lectura

- [ ] 1.1 Escribir en rojo, en `tests/firestore/practice-package.repository.integration.spec.ts` (sonda IA-01 (1)), "calificar un ítem que otro dispositivo borró: los paquetes se siguen leyendo sin ese ítem y el registro avisa". Dos clientes, el repositorio con un `FakeLogger`: `listByUser` da 2 paquetes, el paquete no tiene el ítem y hay un `warn` con la ruta. Añadir "un ítem listado sin `addedAt` hace inválido el documento con la ruta del campo". Verificar que la primera falla.
- [ ] 1.2 Leer `items` como mapa sin validar y validar solo los ids de `itemOrder`, apartando los restos (`strayItemIds`); sacar el esquema de capacidad del objeto base; el adaptador recibe `Logger` (raíz de composición y pruebas de integración) y avisa al listar. Verificar que pasan las pruebas de 1.1 y las existentes del repositorio y de las reglas.
- [ ] 1.3 Escribir en rojo, en la misma prueba de integración (sonda IA-01 (2)), "editar un ítem que otro dispositivo borró rechaza con `PracticeItemGoneError` sin dejar entrada" y "editar en un paquete borrado rechaza con `PracticePackageGoneError`". Verificar que fallan: los errores aún no existen.
- [ ] 1.4 Añadir los dos errores al puerto de paquetes y pasar `updateItem` a una transacción que los lance. Verificar que pasan las pruebas de 1.3, "edita el contenido de un ítem y borra otro" y la suite unitaria (el fake no cambia). Puerta completa en verde y commit `fix(practica-con-ia): …` del grupo.

## 2. IA-02 · Si el paquete ya no existe, la práctica se cierra

- [ ] 2.1 Escribir en rojo, en la prueba de integración del repositorio, "calificar en un paquete borrado rechaza con `PracticePackageGoneError`". Implementar la traducción de `not-found` en el adaptador y verificar que pasa.
- [ ] 2.2 Escribir en rojo, en `practice-ai-session-state.spec.ts`, "`closeBecausePackageIsGone`: activa → `gone`; terminada → sin cambios". Implementar el estado `gone` y la función pura, y verificar que pasa.
- [ ] 2.3 Escribir en rojo, en `practice-ai-session.service.spec.ts` (sonda IA-02), "si el paquete ya no existe, la práctica se cierra sin reencolar ni apilar avisos", con el fake rechazando con `PracticePackageGoneError`. Verificar que falla y que la prueba existente del rechazo que reencola sigue en verde.
- [ ] 2.4 Hacer que la sesión cierre la práctica ante `PracticePackageGoneError` y reencole los demás rechazos. Verificar que pasan las pruebas de 2.3 y las existentes de la sesión.
- [ ] 2.5 Escribir en rojo, en `practice-ai-page.component.spec.ts`, "si el paquete ya no existe: «Este paquete ya no existe» y el enlace a la Biblioteca, sin cerebros". Añadir el caso `gone` a la plantilla y los textos al copy de `practica-ia`. Verificar que pasa. Puerta completa en verde y commit `fix(practica-con-ia): …` del grupo.

## 3. IA-03 · Practicar es calificar

- [ ] 3.1 Escribir en rojo, en `practice-packages.service.spec.ts` (sonda IA-03), "preparar entrega el conjunto sin fijarlo: el paquete sigue sin practicar hoy y un ítem agregado después entra en la siguiente". Adaptar "la primera práctica del día fija el conjunto…" y "repetir en el día usa el mismo conjunto…" para que lo fije la primera nota (`fixTodaySetOnFirstGrade`). Verificar que fallan.
- [ ] 3.2 Quitar el fijado de `prepareTodayPractice` y añadir `fixTodaySetOnFirstGrade` (idempotente: no hace nada si ya se practicó ese día o el paquete no está cargado). Verificar que pasan las pruebas de 3.1.
- [ ] 3.3 Escribir en rojo, en `practice-ai-session.service.spec.ts`, "la primera nota fija el conjunto preparado en el orden del paquete; las siguientes no lo vuelven a fijar". Guardar en el estado de la sesión los ids preparados (`itemIds`) y llamar al método en cada nota. Verificar que pasa, junto con las suites de Hoy, el detalle del paquete y la pantalla de práctica (adaptar las que suponían el fijado al preparar). Puerta completa en verde y commit `fix(practica-con-ia): …` del grupo.

## 4. IA-04 · El prompt del cierre usa el día de la práctica

- [ ] 4.1 Escribir en rojo, en `practice-packages.service.spec.ts`, "`promptFor` con un día arma el prompt de ese día" y, en `practice-ai-page.component.spec.ts` (sonda IA-04), "una práctica que cruza el inicio del día: el prompt del cierre lista los difíciles que el cierre anuncia". Verificar que fallan.
- [ ] 4.2 Aceptar el día en `promptFor`, exponer `dayId` en la sesión y usarlo en el prompt del cierre. Verificar que pasan las pruebas de 4.1 y que "Copiar prompt de hoy" del detalle sigue usando el día de ahora (sus pruebas en verde). Puerta completa en verde y commit `fix(practica-con-ia): …` del grupo.

## 5. Cierre

- [ ] 5.1 `openspec validate --specs` y `opsx:archive` de este change (sincroniza la spec base `practica-con-ia`). Verificar que `openspec list` queda vacío y la spec base contiene los escenarios nuevos. Commit `docs(openspec): …`.
- [ ] 5.2 Marcar `arreglado en <hash>` en la columna "Decisión" de IA-01 a IA-04 del README de la revisión y anotar la bitácora de `MEMORY.md`. Verificar que no queda ninguno abierto antes del 1.1.0.
