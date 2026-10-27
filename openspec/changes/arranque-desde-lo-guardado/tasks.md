# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Commit con `bash ../flash-cards/docs/herramientas/commit-verde.sh` (puerta completa; sin firmas).

## 1. Lo guardado en los adaptadores (D1)

- [x] 1.1 Pruebas de integración en rojo: `allowlist.repository.integration.spec` (`'device'`: `false` antes de leer, `true` tras leer del servidor) y `user.repository.integration.spec` (`'device'`: `null` antes, el perfil después). Verificar con la puerta (8085): fallan (hoy el origen se ignora).
- [x] 1.2 Implementar D1 en los puertos y los adaptadores (`getDocFromCache`, `unavailable` → `false`/`null`). Verificar: 1.1 en verde.

## 2. La sesión en dos fases (D2, D4)

- [x] 2.1 Fakes con lo guardado (D4) y pruebas en rojo en `session.service.spec` para cada escenario del plan. Verificar: fallan las que esperan arrancar con lo guardado.
- [x] 2.2 Implementar D2. Verificar: 2.1 en verde y las pruebas existentes de la sesión en verde.

## 3. La raíz lleva a "sin acceso" (D3)

- [x] 3.1 Prueba en rojo en `app.spec`: en `/hoy`, la sesión pasa a `noAccess` → `/sin-acceso`. Verificar: falla.
- [x] 3.2 Implementar D3. Verificar: 3.1 en verde y `repaso-page.component.spec` en verde ("atrás" no vuelve al repaso).

## 4. Cierre

- [ ] 4.1 README (párrafo de acceso: el arranque con lo guardado) y `openspec archive arranque-desde-lo-guardado -y`. Verificar: `openspec validate --specs --strict` en verde.
- [ ] 4.2 Bitácora de `MEMORY.md` y `docs/retome.md`.
