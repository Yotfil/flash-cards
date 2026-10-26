# Spec Delta

## MODIFIED Requirements

### Requirement: El usuario puede continuar con Google
El sistema SHALL ofrecer "Continuar con Google" mediante una ventana emergente (no redirección). La sesión SHALL llegar por el observador de estado, de modo que el acceso se complete aunque la ventana emergente no informe explícitamente su resultado. Si la identidad que entra por Google no está en la lista de acceso, el sistema SHALL dejar la sesión en "sin acceso" con su correo y, solo si el proveedor acaba de crear esa identidad en este acceso, SHALL borrarla del proveedor. Una identidad de Google que ya existía NO SHALL borrarse, porque sus datos siguen ligados a ella; si no se puede saber si es nueva, se conserva.

#### Scenario: Google exitoso
- **WHEN** el usuario completa el acceso con Google en la ventana emergente y su correo está autorizado
- **THEN** la sesión queda activa y el usuario es llevado a la pantalla de inicio, aun si la ventana emergente no devolvió resultado

#### Scenario: Google no autorizado
- **WHEN** una persona entra por primera vez con Google y su correo no está en la lista
- **THEN** la identidad recién creada se borra del proveedor, la sesión queda en "sin acceso" con ese correo y el usuario es llevado a `/sin-acceso`

#### Scenario: Cuenta de Google que ya existía y salió de la lista
- **WHEN** alguien que ya usaba la app con Google, y cuyo correo ya no está en la lista, vuelve a "Continuar con Google"
- **THEN** la sesión queda en "sin acceso" con ese correo, la identidad se conserva en el proveedor y el usuario es llevado a `/sin-acceso`

#### Scenario: Ventana cerrada por el usuario
- **WHEN** el usuario cierra la ventana emergente sin completar el acceso
- **THEN** la pantalla vuelve a su estado normal sin mostrar ningún mensaje de error

### Requirement: Solo entra quien está en la lista de acceso anticipado
Al conocerse una identidad autenticada (en el arranque, tras iniciar sesión o tras registrarse), el sistema SHALL consultar si su correo está en la lista de acceso, usando el correo exactamente como lo entrega el proveedor. Una identidad sin correo SHALL considerarse no autorizada. Si el correo no está autorizado, el sistema SHALL dejar la sesión en "sin acceso" con ese correo, NO SHALL activar la sesión de la app y NO SHALL crear ni leer el perfil del usuario. Si esa identidad acaba de crearse al entrar por Google, además SHALL borrarse del proveedor; una identidad que ya existía SHALL conservarse.

#### Scenario: Correo no autorizado al registrarse
- **WHEN** alguien intenta crear cuenta con `nuevo@ejemplo.com` y ese correo no está en la lista
- **THEN** la comprobación previa lo detiene: no se crea ninguna identidad ni perfil y el formulario muestra el aviso

#### Scenario: Correo autorizado
- **WHEN** alguien inicia sesión con un correo que está en la lista
- **THEN** la sesión de la app se activa y se carga o crea su perfil

#### Scenario: Acceso retirado a una sesión existente
- **WHEN** el correo de una sesión guardada ya no está en la lista al arrancar la app
- **THEN** la sesión queda en "sin acceso" con ese correo, la identidad se conserva y el usuario es llevado a `/sin-acceso`

#### Scenario: Diferencia de mayúsculas
- **WHEN** la lista contiene `Ada@Ejemplo.com` y el proveedor entrega `ada@ejemplo.com`
- **THEN** el correo se considera no autorizado (la comparación es literal)
