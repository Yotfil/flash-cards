# Spec Delta

## MODIFIED Requirements

### Requirement: Existe una pantalla única de acceso que alterna entre iniciar sesión y crear cuenta
El sistema SHALL ofrecer, en la ruta `/login`, una sola pantalla con dos modos: "Iniciar sesión" (por defecto) y "Crear cuenta". El modo "Crear cuenta" SHALL mostrar además un campo opcional de nombre y la nota "Cadence está en acceso anticipado: solo puedes crear cuenta si tu correo está en la lista." Desde "Iniciar sesión", el enlace "Olvidé mi contraseña" SHALL llevar a un tercer modo, "Restablecer contraseña" (ver el requisito de restablecer la contraseña). Cambiar de modo SHALL limpiar cualquier mensaje de error visible y SHALL conservar el correo escrito.

#### Scenario: Modo inicial
- **WHEN** el usuario abre `/login`
- **THEN** ve el modo "Iniciar sesión" con los campos de correo y contraseña, el enlace "Olvidé mi contraseña", un botón "Continuar con Google" y un enlace para pasar a "Crear cuenta"

#### Scenario: Cambiar a crear cuenta
- **WHEN** el usuario pulsa "Crear una"
- **THEN** la pantalla pasa al modo "Crear cuenta", aparecen el campo "Nombre" y la nota de acceso anticipado, y desaparece cualquier error previo

## ADDED Requirements

### Requirement: El usuario puede pedir un enlace para restablecer su contraseña
El modo "Restablecer contraseña" SHALL mostrar el título "Restablecer contraseña", la explicación "Te enviaremos un enlace para crear una contraseña nueva.", solo el campo de correo (con el que ya estuviera escrito), el botón "Enviar enlace" y el enlace "Volver a iniciar sesión"; NO SHALL mostrar contraseña, nombre ni "Continuar con Google". Al enviar, el sistema SHALL validar el formato del correo (si no vale, SHALL marcar el campo y NO SHALL contactar al proveedor) y SHALL pedir al proveedor de identidad el correo de restablecimiento para ese correo, recortado y en minúsculas. Haya o no una cuenta con ese correo, SHALL mostrar como estado accesible "Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva.": la pantalla nunca revela qué correos tienen cuenta. Mientras envía, el botón SHALL mostrar "Enviando…" y los controles SHALL bloquearse como en los demás envíos. Si falla por falta de conexión o por otra causa, SHALL mostrarse el mensaje de error correspondiente de la pantalla de acceso, con el detalle en el registro. "Volver a iniciar sesión" SHALL regresar al modo "Iniciar sesión" con el correo escrito.

#### Scenario: Pedir el enlace
- **WHEN** el usuario escribe `ada@ejemplo.com` en "Iniciar sesión", toca "Olvidé mi contraseña" y luego "Enviar enlace"
- **THEN** el proveedor recibe la petición para `ada@ejemplo.com` y la pantalla dice "Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva."

#### Scenario: Un correo sin cuenta no se delata
- **WHEN** el usuario pide el enlace para un correo que no tiene cuenta
- **THEN** ve el mismo mensaje que si la tuviera, sin ningún error

#### Scenario: Correo con formato inválido
- **WHEN** el usuario pide el enlace con `correo-sin-arroba`
- **THEN** el campo de correo queda marcado como inválido y no se envía nada

#### Scenario: Sin red
- **WHEN** el proveedor no responde por falta de conexión al pedir el enlace
- **THEN** ve "Sin conexión. Inténtalo cuando vuelva la red."

#### Scenario: Volver a iniciar sesión
- **WHEN** el usuario toca "Volver a iniciar sesión"
- **THEN** la pantalla vuelve al modo "Iniciar sesión" con el correo que había escrito y sin mensajes
