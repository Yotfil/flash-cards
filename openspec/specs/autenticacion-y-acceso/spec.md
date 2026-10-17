# Autenticación y acceso Specification

## Purpose

Decide quién puede entrar a la app y con qué identidad: registro e inicio de sesión (correo y contraseña, o Google), cierre de sesión, protección de rutas y el control de acceso anticipado por lista de correos autorizados. También garantiza que cada persona tenga un perfil con ajustes por defecto desde su primer acceso, y que la app nunca actúe antes de saber si hay sesión.

## Requirements

### Requirement: Existe una pantalla única de acceso que alterna entre iniciar sesión y crear cuenta
El sistema SHALL ofrecer, en la ruta `/login`, una sola pantalla con dos modos: "Iniciar sesión" (por defecto) y "Crear cuenta". El modo "Crear cuenta" SHALL mostrar además un campo opcional de nombre. Cambiar de modo SHALL limpiar cualquier mensaje de error visible.

#### Scenario: Modo inicial
- **WHEN** el usuario abre `/login`
- **THEN** ve el modo "Iniciar sesión" con los campos de correo y contraseña, un botón "Continuar con Google" y un enlace para pasar a "Crear cuenta"

#### Scenario: Cambiar a crear cuenta
- **WHEN** el usuario pulsa "Crear una"
- **THEN** la pantalla pasa al modo "Crear cuenta", aparece el campo "Nombre" y desaparece cualquier error previo

### Requirement: El formulario de acceso valida correo y contraseña antes de enviar
El sistema SHALL exigir un correo con formato válido y una contraseña de al menos 6 caracteres. Si el formulario es inválido, el envío SHALL marcar los campos como tocados (indicando cuáles son inválidos) y NO SHALL contactar al proveedor de identidad.

#### Scenario: Contraseña demasiado corta
- **WHEN** el usuario envía el formulario con una contraseña de 4 caracteres
- **THEN** el campo de contraseña queda marcado como inválido y no se intenta iniciar sesión ni registrar

#### Scenario: Correo con formato inválido
- **WHEN** el usuario envía el formulario con `correo-sin-arroba` como correo
- **THEN** el campo de correo queda marcado como inválido y no se envía nada

### Requirement: El usuario puede crear una cuenta con correo y contraseña
El sistema SHALL crear una identidad con el correo y la contraseña indicados y fijar como nombre visible el nombre ingresado. Si el nombre viene vacío, el sistema SHALL usar la parte del correo anterior a la arroba.

#### Scenario: Registro con nombre
- **WHEN** el usuario crea cuenta con nombre "Ada", correo `ada@ejemplo.com` y una contraseña válida
- **THEN** se crea la identidad y su nombre visible es "Ada"

#### Scenario: Registro sin nombre
- **WHEN** el usuario crea cuenta dejando el nombre vacío con el correo `ada@ejemplo.com`
- **THEN** su nombre visible es "ada"

### Requirement: El usuario puede iniciar sesión con correo y contraseña
El sistema SHALL autenticar con el proveedor de identidad usando el correo y la contraseña. La sesión de la app SHALL activarse a partir del cambio de estado observado, no del resultado directo del envío.

#### Scenario: Credenciales correctas
- **WHEN** el usuario envía credenciales válidas de una cuenta existente y autorizada
- **THEN** la sesión queda activa y el usuario es llevado a la pantalla de inicio

### Requirement: El usuario puede continuar con Google
El sistema SHALL ofrecer "Continuar con Google" mediante una ventana emergente (no redirección). La sesión SHALL llegar por el observador de estado, de modo que el acceso se complete aunque la ventana emergente no informe explícitamente su resultado.

#### Scenario: Google exitoso
- **WHEN** el usuario completa el acceso con Google en la ventana emergente y su correo está autorizado
- **THEN** la sesión queda activa y el usuario es llevado a la pantalla de inicio, aun si la ventana emergente no devolvió resultado

### Requirement: Los errores de acceso se muestran con un mensaje humano y el detalle va a la consola
Ante cualquier fallo al registrar, iniciar sesión o continuar con Google, el sistema SHALL mostrar en la pantalla de acceso, como alerta accesible, el mensaje "No pudimos completar la acción. Revisa tus datos e inténtalo de nuevo." y SHALL registrar el detalle técnico en la consola. El sistema NO SHALL distinguir en el mensaje el tipo de fallo.

#### Scenario: Contraseña incorrecta
- **WHEN** el proveedor rechaza el inicio de sesión por contraseña incorrecta
- **THEN** el usuario ve el mensaje genérico de error y el detalle queda en la consola

#### Scenario: Correo ya registrado
- **WHEN** el usuario intenta crear cuenta con un correo que ya existe
- **THEN** ve el mismo mensaje genérico de error

### Requirement: Mientras se envía, la pantalla de acceso bloquea acciones repetidas
Durante un envío en curso el sistema SHALL deshabilitar el botón principal, el de Google y el de cambio de modo, y SHALL mostrar el texto de progreso correspondiente ("Iniciando sesión…", "Creando cuenta…" o "Conectando…"). Un segundo envío mientras hay uno en curso SHALL ignorarse.

#### Scenario: Doble envío
- **WHEN** el usuario pulsa dos veces seguidas "Iniciar sesión"
- **THEN** solo se procesa el primer intento y el botón muestra "Iniciando sesión…" hasta que termina

### Requirement: La pantalla de acceso navega de forma reactiva según el estado de sesión
El sistema SHALL llevar al usuario a la pantalla de inicio (`/`) en cuanto la sesión quede activa, y a `/sin-acceso` en cuanto la sesión quede marcada como "sin acceso", sin depender de que cada flujo informe su éxito.

#### Scenario: Sesión activa desde el observador
- **WHEN** la sesión pasa a activa mientras el usuario está en `/login`
- **THEN** es llevado a `/`

#### Scenario: Acceso denegado
- **WHEN** la sesión queda marcada como "sin acceso" mientras el usuario está en `/login`
- **THEN** es llevado a `/sin-acceso`

### Requirement: El estado de sesión tiene tres valores y la app espera a que el inicial se resuelva
El sistema SHALL distinguir entre "resolviendo" (todavía no se sabe si hay sesión), "sin sesión" y "con sesión" (con el perfil del usuario cargado). El sistema SHALL exponer cuándo la sesión inicial quedó resuelta, y toda decisión de ruta SHALL esperar a ese momento para no redirigir antes de tiempo.

#### Scenario: Recarga con sesión persistida
- **WHEN** el usuario recarga la app teniendo una sesión guardada en el dispositivo
- **THEN** la app no lo manda a `/login` mientras resuelve, y una vez resuelta la sesión lo deja en la ruta que pidió

#### Scenario: Recarga sin sesión
- **WHEN** el usuario recarga una ruta protegida sin sesión guardada
- **THEN** una vez resuelta la sesión inicial es llevado a `/login`

### Requirement: Las rutas de la app están protegidas y la de acceso es solo para invitados
El sistema SHALL exigir sesión activa para el contenedor principal (`/hoy`, `/biblioteca`, `/importar`, `/biblioteca/:bookId`, `/biblioteca/:bookId/:chapterId`, `/progreso`, `/ajustes`) y para las pantallas completas `/repaso` y `/practicar`; sin sesión SHALL redirigir a `/login`. La ruta `/login` SHALL redirigir a `/` cuando ya hay sesión activa. La ruta `/sin-acceso` SHALL ser accesible sin sesión activa. La ruta vacía SHALL redirigir a `/hoy` y cualquier ruta desconocida a `/`.

#### Scenario: Ruta protegida sin sesión
- **WHEN** alguien sin sesión abre `/biblioteca`
- **THEN** es redirigido a `/login`

#### Scenario: Login con sesión activa
- **WHEN** un usuario con sesión activa abre `/login`
- **THEN** es redirigido a `/`

#### Scenario: Ruta desconocida
- **WHEN** el usuario abre `/no-existe`
- **THEN** es redirigido a `/` y, con sesión, termina en `/hoy`

### Requirement: Solo entra quien está en la lista de acceso anticipado
Al conocerse una identidad autenticada (en el arranque, tras iniciar sesión o tras registrarse), el sistema SHALL consultar si su correo está en la lista de acceso, usando el correo exactamente como lo entrega el proveedor. Una identidad sin correo SHALL considerarse no autorizada. Si el correo no está autorizado, el sistema SHALL marcar la sesión como "sin acceso" con ese correo, NO SHALL activar la sesión de la app y NO SHALL crear ni leer el perfil del usuario.

#### Scenario: Correo no autorizado al registrarse
- **WHEN** alguien crea cuenta con `nuevo@ejemplo.com` y ese correo no está en la lista
- **THEN** la identidad existe en el proveedor, pero la app queda en "sin acceso" con el correo `nuevo@ejemplo.com`, no se considera autenticada y no se crea ningún perfil

#### Scenario: Correo autorizado
- **WHEN** alguien inicia sesión con un correo que está en la lista
- **THEN** la sesión de la app se activa y se carga o crea su perfil

#### Scenario: Diferencia de mayúsculas
- **WHEN** la lista contiene `Ada@Ejemplo.com` y el proveedor entrega `ada@ejemplo.com`
- **THEN** el correo se considera no autorizado (la comparación es literal)

### Requirement: La lista de acceso solo se consulta desde el cliente, nunca se escribe
El sistema SHALL permitir a cada usuario autenticado leer únicamente la entrada de la lista que corresponde a su propio correo, y SHALL rechazar cualquier escritura a la lista desde el cliente. La lista se administra fuera de la app. Además, todo dato privado del usuario (perfil, libros, capítulos, tarjetas, estadísticas e historial) SHALL exigir ser el dueño Y estar en la lista de acceso, tanto para leer como para escribir.

#### Scenario: Leer la entrada de otro
- **WHEN** un usuario autenticado intenta leer la entrada de la lista de un correo distinto al suyo
- **THEN** la lectura es rechazada

#### Scenario: Intento de auto-autorizarse
- **WHEN** un cliente intenta crear o modificar una entrada de la lista
- **THEN** la escritura es rechazada

#### Scenario: Dueño sin acceso
- **WHEN** un usuario autenticado pero fuera de la lista intenta leer o escribir su propio perfil o sus tarjetas
- **THEN** la operación es rechazada

### Requirement: La pantalla "sin acceso" explica la situación y permite cerrar sesión
El sistema SHALL mostrar en `/sin-acceso`, a pantalla completa y sin la navegación principal, el título "Tu cuenta está pendiente de acceso", una explicación de que la app está en acceso anticipado, el correo con el que se inició sesión (si se conoce), la indicación de compartir ese correo con quien administra la app y un botón "Cerrar sesión" que, al completarse, lleva a `/login`.

#### Scenario: Mostrar el correo pendiente
- **WHEN** un usuario con correo `nuevo@ejemplo.com` queda en "sin acceso"
- **THEN** la pantalla muestra ese correo

#### Scenario: Cerrar sesión desde sin acceso
- **WHEN** el usuario pulsa "Cerrar sesión"
- **THEN** el botón muestra "Cerrando sesión…" hasta terminar y luego es llevado a `/login`

### Requirement: La pantalla "sin acceso" se mantiene coherente con el estado de sesión
Una vez resuelta la sesión inicial, el sistema SHALL llevar al usuario desde `/sin-acceso` a `/` si la sesión está activa, y a `/login` si no hay sesión ni marca de "sin acceso". Mientras la sesión inicial no esté resuelta, la pantalla NO SHALL redirigir.

#### Scenario: Abrir sin-acceso sin sesión
- **WHEN** alguien sin sesión abre `/sin-acceso` directamente y la sesión inicial ya se resolvió
- **THEN** es llevado a `/login`

#### Scenario: Obtiene acceso y vuelve a entrar
- **WHEN** el correo fue añadido a la lista y el usuario inicia sesión de nuevo
- **THEN** la sesión se activa y es llevado a `/`

### Requirement: El perfil del usuario se crea en su primer acceso con valores por defecto
Cuando una identidad autorizada no tiene perfil todavía, el sistema SHALL crearlo con: `id` igual al identificador de la identidad; `displayName` igual al nombre de la identidad, o en su defecto la parte local del correo, o en su defecto "Estudiante"; `email` igual al correo de la identidad (cadena vacía si no hay); `createdAt` igual al momento de creación; `photoURL` solo si la identidad lo trae; `isSearchable` en `false`; y ajustes con `timezone` igual a la zona horaria del dispositivo, `dayStartHour` 4, `theme` `system`, `defaultNewCardsPerDay` 20 y `autoGradeByTime` `true`. Si el perfil ya existe, el sistema SHALL cargarlo sin modificarlo.

#### Scenario: Primer acceso con Google
- **WHEN** una persona autorizada entra por primera vez con Google y su identidad trae nombre y foto
- **THEN** se crea un perfil con ese nombre y foto, zona horaria del dispositivo, `dayStartHour` 4, `theme` `system`, `defaultNewCardsPerDay` 20, `autoGradeByTime` `true` e `isSearchable` `false`

#### Scenario: Primer acceso sin nombre en la identidad
- **WHEN** la identidad autorizada no trae nombre y su correo es `ada@ejemplo.com`
- **THEN** el perfil se crea con `displayName` "ada"

#### Scenario: Acceso posterior
- **WHEN** una persona con perfil existente vuelve a iniciar sesión
- **THEN** se carga su perfil tal como está guardado y no se sobrescribe ningún ajuste

#### Scenario: Registro con correo y nombre ingresado
- **WHEN** alguien autorizado crea cuenta con correo y contraseña indicando el nombre "Ada"
- **THEN** el perfil se guarda de inmediato con `displayName` "Ada", y ese nombre prevalece sobre cualquier otro que el observador de sesión pudiera inferir

### Requirement: Los perfiles guardados se validan al leer y toleran los campos de ajustes añadidos después
Al leer un perfil, el sistema SHALL validar su forma antes de usarlo. Si faltan `defaultNewCardsPerDay` o `autoGradeByTime` (perfiles creados antes de que existieran), el sistema SHALL rellenarlos con 20 y `true` respectivamente. Si el perfil no cumple la forma esperada en cualquier otro campo, la carga SHALL fallar de manera explícita, el fallo SHALL registrarse en la consola y la app SHALL tratar al usuario como "sin sesión".

#### Scenario: Perfil antiguo sin los campos nuevos
- **WHEN** se carga un perfil guardado sin `defaultNewCardsPerDay` ni `autoGradeByTime`
- **THEN** la sesión se activa con `defaultNewCardsPerDay` 20 y `autoGradeByTime` `true`

#### Scenario: Perfil malformado
- **WHEN** el perfil guardado carece de un campo obligatorio como `displayName`
- **THEN** la carga falla, el error queda en la consola y la app se comporta como si no hubiera sesión

### Requirement: El usuario puede cerrar sesión
El sistema SHALL permitir cerrar sesión desde Ajustes y desde la pantalla "sin acceso". Al cerrar sesión, el estado SHALL pasar a "sin sesión", SHALL limpiarse cualquier marca de "sin acceso" y su correo, y el usuario SHALL ser llevado a `/login`.

#### Scenario: Cerrar sesión desde Ajustes
- **WHEN** el usuario pulsa "Cerrar sesión" en Ajustes
- **THEN** la sesión termina y es llevado a `/login`; las rutas protegidas vuelven a redirigir a `/login`

### Requirement: Operar sobre datos sin sesión activa es un error explícito
Cualquier operación de negocio que necesite al usuario actual SHALL fallar con el error "No hay una sesión activa." si la sesión no está activa o aún no se resolvió, en lugar de operar con un usuario vacío.

#### Scenario: Actualizar ajustes sin sesión
- **WHEN** se intenta actualizar los ajustes sin sesión activa
- **THEN** la operación falla con un error explícito y no se guarda nada
