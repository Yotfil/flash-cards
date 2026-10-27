# Tasks

Orden TDD: cada tarea de código va precedida por su prueba vista en rojo por el motivo esperado. Commit con `bash ../flash-cards/docs/herramientas/commit-verde.sh` (puerta completa; sin firmas).

## 1. Puerto, adaptador y servicio (D1, D2)

- [x] 1.1 Pruebas en rojo en `session.service.spec`: `sendPasswordReset('  Ada@Ejemplo.com ')` → el puerto recibe `ada@ejemplo.com`; `invalidCredentials` del puerto → resuelve; `offline` → rechaza con ese error. Verificar: fallan (no existe).
- [x] 1.2 Implementar D1 y D2 (`AuthPort.sendPasswordReset`, `FirebaseAuthAdapter`, `FakeAuthPort`, `SessionService.sendPasswordReset`). Verificar: 1.1 en verde.

## 2. Pantalla (D3)

- [ ] 2.1 Pruebas en rojo en `login-page.component.spec`: el enlace solo en "Iniciar sesión"; pasar a "Restablecer contraseña" conserva el correo y oculta contraseña y Google; correo inválido no envía; enviar → petición y mensaje neutro (`role="status"`); retenido → "Enviando…" deshabilitado; sin red → mensaje; "Volver a iniciar sesión". Y `auth.copy.spec` si existe. Verificar: fallan.
- [ ] 2.2 Implementar D3 (copy, modo `reset`, plantilla). Verificar: 2.1 en verde y el resto de la pantalla en verde.
- [ ] 2.3 Comprobar a mano contra el emulador de Auth (9095) que `sendPasswordResetEmail` deja el enlace en el registro del emulador.

## 3. Cierre

- [ ] 3.1 `openspec archive restablecer-contrasena -y`. Verificar: `openspec validate --specs --strict` en verde.
- [ ] 3.2 Bitácora de `MEMORY.md` y `docs/retome.md` con el punto 10 hecho.
