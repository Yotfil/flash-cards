# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo. Puerta antes de cada commit: `bash ../flash-cards/docs/herramientas/puerta.sh` desde el worktree. Commits sin firmas. Un commit por par prueba + código.

## 1. Plazo del guardado (UI compartida)

- [x] 1.1 Pruebas en rojo: `connection.copy.spec` (los tres textos); `dialog.service.spec` con temporizadores falsos (plazo con `releaseWhenSlow`, sin la opción sigue ocupado, `setPending(false)` cancela, cerrar cancela). Verificar: fallan.
- [x] 1.2 Implementar `slow-save.ts` (`SLOW_SAVE_MS`, `watchSlow`), la opción en `setPending` y `savingTooLong()`, y los textos. Verificar: 1.1 en verde.

## 2. "Atrás" cierra el diálogo

- [x] 2.1 Pruebas en rojo en `dialog.service.spec` con `RouterTestingHarness` y `canceledNavigationResolution: 'computed'`: atrás cierra y no navega; ocupado no cierra; dos apilados cierra el de arriba; sin diálogos navega. Verificar: fallan (hoy el CDK cierra y el router navega).
- [x] 2.2 Implementar la pila de abiertos, la escucha de `popstate` con `abort()`, `closeOnNavigation: false` y `withRouterConfig` en `app.config.ts`. Verificar: 2.1 en verde y `app.routes.spec` en verde.

## 3. Diálogos que guardan en el dispositivo

- [x] 3.1 Pruebas en rojo: libro (crear), ajustes del libro, capítulo, tarjeta de capítulo (con aviso) y tarjeta con `save` propio (sin aviso), paquete: a los 6 s, el aviso con `role="status"`, "Cerrar" habilitado que cierra. Verificar: fallan.
- [x] 3.2 Apuntar esos diálogos (`releaseWhenSlow`), pintar el aviso y el botón "Cerrar". Verificar: 3.1 en verde.

## 4. Importar

- [ ] 4.1 Pruebas en rojo: `card-import-dialog.component.spec` (aviso de importar y "Cerrar"); `confirm-dialog.component.spec` (con `slowNotice` lo muestra y se deja cerrar; sin él, sigue ocupado); `importar-libro-page.component.spec` (aviso con "Importando…"). Verificar: fallan.
- [ ] 4.2 Implementar en el diálogo de importar, la confirmación (`slowNotice`, que pasa la confirmación de reemplazo) y la pantalla "Importar libro" (`watchSlow`). Verificar: 4.1 en verde.

## 5. Salir de las pantallas completas

- [ ] 5.1 Pruebas en rojo: `return-navigation.service.spec` (regresa o reemplaza); `practica-page.component.spec` (Salir y Volver regresan; atrás y adelante como la spec); `practice-ai-page.component.spec` (desde el paquete y desde Hoy); `repaso-page.component.spec` (desde el capítulo y desde Hoy). Verificar: fallan.
- [ ] 5.2 Implementar `ReturnNavigation` y usarlo en las tres pantallas. Verificar: 5.1 en verde.
- [ ] 5.3 README: el plazo de los diálogos, el "atrás" y las salidas de pantalla completa (párrafo de navegación). Verificar: `npx prettier --check README.md`.

## 6. Cierre

- [ ] 6.1 Puerta completa en verde. Verificar: "PUERTA: VERDE".
- [ ] 6.2 Archivar el change en la rama (specs base de los ocho capability con el delta). Verificar: `openspec validate --specs --strict` y `openspec list` sin el change.
