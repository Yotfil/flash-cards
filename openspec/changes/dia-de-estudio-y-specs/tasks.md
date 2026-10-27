# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Commit con `bash ../flash-cards/docs/herramientas/commit-verde.sh` (puerta completa; sin firmas).

## 1. El día de estudio con el reloj local (cerebro, CD-03)

- [ ] 1.1 Pruebas en rojo en `study-day.spec`: los dos escenarios de `studyDayId` en Madrid; los cuatro de `endOfStudyDay` (23 h, 25 h, salto, repetida); y la coherencia día/fin en Madrid y Bogotá. Verificar: fallan las de Madrid por una hora de desfase.
- [ ] 1.2 Implementar D1 y D2 (`localDateTime`, `shiftDate`, `instantOfLocalTime`) con sus comentarios. Verificar: 1.1 en verde y el resto de pruebas que usan el día de estudio (cola, sesión, práctica, progreso) en verde.

## 2. El redondeo que llega al tramo siguiente (cerebro, PE-02)

- [ ] 2.1 Pruebas en rojo en `format-interval.spec`: 59,6 min → "1 h"; 23,7 h → "1 día"; 345 y 364 días → "1 año"; 59,4 min → "59 min"; 23,4 h → "23 h". Verificar: fallan las tres primeras.
- [ ] 2.2 Implementar D3. Verificar: 2.1 en verde y el resto de `format-interval.spec` en verde.

## 3. Pruebas que fijan las specs corregidas (SR-02, SR-01)

- [ ] 3.1 Prueba en `review-session-state.spec`: arranque a las 03:55 de Bogotá, calificar a las 04:20 → `dayId` del día anterior. Verificar: pasa ya (fija la decisión 18).
- [ ] 3.2 Prueba en `repaso-page.component.spec`: al terminar un repaso con un "Otra vez", el cierre no tiene `[practice]` ni "Copiar prompt". Verificar: pasa ya (fija la decisión 20).

## 4. Cierre

- [ ] 4.1 `openspec archive dia-de-estudio-y-specs -y`: las specs base de `cola-diaria`, `sesion-de-repaso` (con el requisito renombrado), `ajustes-de-usuario` y `programacion-espaciada` llevan el delta. Verificar: `openspec validate --specs --strict` en verde.
- [ ] 4.2 Bitácora de `MEMORY.md` y `docs/retome.md` con el punto 7 hecho.
