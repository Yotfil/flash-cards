# Spec Delta

## MODIFIED Requirements

### Requirement: Solo entra quien está en la lista de acceso anticipado
Al conocerse una identidad autenticada (en el arranque, tras iniciar sesión o tras registrarse), el sistema SHALL consultar si su correo está en la lista de acceso, usando el correo exactamente como lo entrega el proveedor. Una identidad sin correo SHALL considerarse no autorizada. Si el correo no está autorizado, el sistema SHALL dejar la sesión en "sin acceso" con ese correo, NO SHALL activar la sesión de la app y NO SHALL crear ni leer el perfil del usuario. Si esa identidad acaba de crearse al entrar por Google, además SHALL borrarse del proveedor; una identidad que ya existía SHALL conservarse. Con la app ya abierta, si el servidor niega el permiso al guardar una nota del repaso o de la práctica con IA (el correo salió de la lista), la sesión SHALL pasar a "sin acceso" con el correo del usuario cuando este toque "Continuar" en el aviso de esas pantallas (ver sus specs).

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

#### Scenario: Acceso retirado con la app abierta
- **WHEN** el correo de Ada sale de la lista mientras repasa y ella toca "Continuar" en el aviso
- **THEN** la sesión queda en "sin acceso" con su correo, la identidad se conserva y la app muestra `/sin-acceso`
