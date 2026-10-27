# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Commit con `bash ../flash-cards/docs/herramientas/commit-verde.sh` (puerta completa; sin firmas).

## 1. Los adaptadores nombran los rechazos permanentes (D1)

- [x] 1.1 Pruebas de integración en rojo: `grade-persistence.integration.spec` (tarjeta borrada → `CardGoneError`; correo fuera de la lista → `AccessRevokedError`; nada escrito) y `practice-package.repository.integration.spec` (`recordGrade` sin lista → `AccessRevokedError`). Verificar con la puerta (8085): fallan (hoy, errores del SDK).
- [x] 1.2 Implementar D1: `AccessRevokedError`, `CardGoneError`, `hasFirestoreCode` en su módulo y las dos traducciones. Verificar: 1.1 en verde.

## 2. "Sin acceso" con la app abierta (D4)

- [x] 2.1 Pruebas en rojo en `session.service.spec`: `markAccessRevoked()` con sesión activa → `noAccess` con el correo; sin sesión activa → igual. Verificar: fallan (no existe).
- [x] 2.2 Implementar D4 en `SessionService` y en `FakeSessionService`. Verificar: 2.1 en verde.

## 3. Núcleo del repaso (D2)

- [x] 3.1 Pruebas en rojo en `review-session-state.spec`: `dropGoneCard` (reencolada y no actual; actual; única → `finished`; con el cierre visible no suma pendientes; aviso sin duplicar) y `closeForLostAccess` (desde activa y terminada; los resultados tardíos no lo cambian). Verificar: fallan (no existen).
- [x] 3.2 Implementar D2 en `review-session-state.ts`. Verificar: 3.1 en verde y el resto de la sesión en verde.
- [x] 3.3 Pruebas en rojo en `review-session.service.spec`: `CardGoneError` → tarjeta fuera y aviso `gone`; si era la última, `ended()` → `finished`; `AccessRevokedError` → `accessLost`; un `Error` cualquiera sigue reencolando; `acknowledgeLostAccess()` → sesión vacía y `markAccessRevoked`. Verificar: fallan.
- [x] 3.4 Implementar en `ReviewSessionService`. Verificar: 3.3 en verde.

## 4. Núcleo de la práctica (D3)

- [x] 4.1 Pruebas en rojo: `practice-ai-session-state.spec` (`closeBecauseAccessIsLost` desde activa, terminada y `gone`; `requeueRejected` posterior no lo cambia) y `practice-ai-session.service.spec` (`AccessRevokedError` → `accessLost`; `acknowledgeLostAccess`). Verificar: fallan.
- [x] 4.2 Implementar D3. Verificar: 4.1 en verde.

## 5. Pantallas (D5)

- [x] 5.1 Pruebas en rojo: `repaso-page.component.spec` (aviso de tarjeta borrada; estado sin acceso con alerta, textos y "Continuar" sin tarjeta; "Continuar" → `noAccess`, `/sin-acceso` y "atrás" no vuelve a `/repaso`); `practice-ai-page.component.spec` (estado sin acceso y "Continuar"); `repaso.copy.spec` y `access-lost.copy.spec`. Verificar: fallan.
- [x] 5.2 Implementar D5 (copy compartido, `cardGoneMessage`, `@case ('accessLost')` en las dos páginas). Verificar: 5.1 en verde.

## 6. La nota de hoy en el detalle (D6, IA-05)

- [x] 6.1 Prueba en rojo en `package-detail-page.component.spec`: conjunto de 3 con dos calificados hoy → "Otra vez · hoy", "Bien · hoy", "Para hoy". Verificar: falla (hoy, tres "Para hoy").
- [x] 6.2 Implementar D6. Verificar: 6.1 en verde y el resto del detalle en verde.

## 7. Cierre

- [ ] 7.1 `openspec archive rechazos-permanentes -y`. Verificar: `openspec validate --specs --strict` en verde.
- [ ] 7.2 Bitácora de `MEMORY.md` y `docs/retome.md` con el punto 8 hecho.
