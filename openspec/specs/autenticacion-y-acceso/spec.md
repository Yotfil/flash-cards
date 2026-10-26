# Autenticación y acceso Specification

## Purpose

Decide quién puede entrar a la app y con qué identidad: registro e inicio de sesión (correo y contraseña, o Google), cierre de sesión, protección de rutas y el control de acceso anticipado por lista de correos autorizados. También garantiza que cada persona tenga un perfil con ajustes por defecto desde su primer acceso, y que la app nunca actúe antes de saber si hay sesión.

## Requirements

### Requirement: Existe una pantalla única de acceso que alterna entre iniciar sesión y crear cuenta
El sistema SHALL ofrecer, en la ruta `/login`, una sola pantalla con dos modos: "Iniciar sesión" (por defecto) y "Crear cuenta". El modo "Crear cuenta" SHALL mostrar además un campo opcional de nombre y la nota "Cadence está en acceso anticipado: solo puedes crear cuenta si tu correo está en la lista." Cambiar de modo SHALL limpiar cualquier mensaje de error visible.

#### Scenario: Modo inicial
- **WHEN** el usuario abre `/login`
- **THEN** ve el modo "Iniciar sesión" con los campos de correo y contraseña, un botón "Continuar con Google" y un enlace para pasar a "Crear cuenta"

#### Scenario: Cambiar a crear cuenta
- **WHEN** el usuario pulsa "Crear una"
- **THEN** la pantalla pasa al modo "Crear cuenta", aparecen el campo "Nombre" y la nota de acceso anticipado, y desaparece cualquier error previo

### Requirement: El formulario de acceso valida correo y contraseña antes de enviar
El sistema SHALL exigir un correo con formato válido y una contraseña de al menos 6 caracteres. Si el formulario es inválido, el envío SHALL marcar los campos como tocados (indicando cuáles son inválidos) y NO SHALL contactar al proveedor de identidad.

#### Scenario: Contraseña demasiado corta
- **WHEN** el usuario envía el formulario con una contraseña de 4 caracteres
- **THEN** el campo de contraseña queda marcado como inválido y no se intenta iniciar sesión ni registrar

#### Scenario: Correo con formato inválido
- **WHEN** el usuario envía el formulario con `correo-sin-arroba` como correo
- **THEN** el campo de correo queda marcado como inválido y no se envía nada

### Requirement: El usuario puede crear una cuenta con correo y contraseña
Antes de crear nada, el sistema SHALL comprobar si el correo está en la lista de acceso anticipado. Si no está, SHALL mostrar en el formulario, como alerta accesible, "Este correo no está en la lista de acceso anticipado. Pídele acceso a quien administra la app." y NO SHALL crear ninguna identidad. Si está, el sistema SHALL crear una identidad con el correo y la contraseña indicados y fijar como nombre visible el nombre ingresado; si el nombre viene vacío, SHALL usar la parte del correo anterior a la arroba.

#### Scenario: Correo no autorizado al registrarse
- **WHEN** alguien intenta crear cuenta con `nuevo@ejemplo.com` y ese correo no está en la lista
- **THEN** ve el mensaje en el formulario, no se crea ninguna identidad en el proveedor y sigue en `/login`

#### Scenario: Registro con nombre
- **WHEN** el usuario autorizado crea cuenta con nombre "Ada", correo `ada@ejemplo.com` y una contraseña válida
- **THEN** se crea la identidad y su nombre visible es "Ada"

#### Scenario: Registro sin nombre
- **WHEN** el usuario autorizado crea cuenta dejando el nombre vacío con el correo `ada@ejemplo.com`
- **THEN** su nombre visible es "ada"

### Requirement: El usuario puede iniciar sesión con correo y contraseña
El sistema SHALL autenticar con el proveedor de identidad usando el correo y la contraseña. La sesión de la app SHALL activarse a partir del cambio de estado observado, no del resultado directo del envío.

#### Scenario: Credenciales correctas
- **WHEN** el usuario envía credenciales válidas de una cuenta existente y autorizada
- **THEN** la sesión queda activa y el usuario es llevado a la pantalla de inicio

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

### Requirement: Los errores de acceso se muestran con un mensaje humano y el detalle va a la consola
Ante un fallo al registrar, iniciar sesión o continuar con Google, el sistema SHALL clasificarlo en una de estas categorías y mostrar en la pantalla de acceso, como alerta accesible, el mensaje correspondiente: datos incorrectos → "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo."; correo ya registrado → "Ese correo ya tiene una cuenta. Inicia sesión."; sin conexión → "Sin conexión. Inténtalo cuando vuelva la red."; cualquier otro → "No pudimos completar la acción. Inténtalo de nuevo." Cancelar la ventana emergente no es un fallo y no muestra mensaje. El detalle técnico SHALL registrarse en el registro de errores de la app, nunca en pantalla.

#### Scenario: Contraseña incorrecta
- **WHEN** el proveedor rechaza el inicio de sesión por credenciales inválidas
- **THEN** el usuario ve "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo." y el detalle queda registrado

#### Scenario: Correo ya registrado
- **WHEN** el usuario intenta crear cuenta con un correo que ya existe en el proveedor
- **THEN** ve "Ese correo ya tiene una cuenta. Inicia sesión."

#### Scenario: Sin red
- **WHEN** el proveedor no responde por falta de conexión
- **THEN** ve "Sin conexión. Inténtalo cuando vuelva la red."

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
El sistema SHALL distinguir cinco estados de sesión: "resolviendo" (todavía no se sabe si hay sesión), "sin sesión", "con sesión" (con el perfil del usuario cargado), "sin acceso" (identidad conocida pero fuera de la lista, con su correo) y "error de perfil" (identidad autorizada cuyo perfil no se pudo cargar). El sistema SHALL exponer cuándo la sesión inicial quedó resuelta, y toda decisión de ruta SHALL esperar a ese momento para no redirigir antes de tiempo.

#### Scenario: Recarga con sesión persistida
- **WHEN** el usuario recarga la app teniendo una sesión guardada en el dispositivo
- **THEN** la app no lo manda a `/login` mientras resuelve, y una vez resuelta la sesión lo deja en la ruta que pidió

#### Scenario: Recarga sin sesión
- **WHEN** el usuario recarga una ruta protegida sin sesión guardada
- **THEN** una vez resuelta la sesión inicial es llevado a `/login`

#### Scenario: Cada estado es distinguible
- **WHEN** la app consulta el estado de sesión
- **THEN** obtiene exactamente uno de los cinco valores, y "sin acceso" trae el correo pendiente

### Requirement: Las rutas de la app están protegidas y la de acceso es solo para invitados
El sistema SHALL exigir sesión activa para el contenedor principal (`/hoy`, `/biblioteca`, `/importar`, `/biblioteca/:bookId`, `/biblioteca/:bookId/:chapterId`, `/progreso`, `/ajustes`) y para las pantallas completas `/repaso` y `/practicar`. Sin sesión o con error de perfil SHALL redirigir a `/login`; en "sin acceso" SHALL redirigir a `/sin-acceso`. La ruta `/login` SHALL redirigir a `/` cuando ya hay sesión activa y a `/sin-acceso` cuando la sesión está en "sin acceso"; en error de perfil SHALL mostrarse. La ruta `/sin-acceso` SHALL ser accesible sin sesión activa. La ruta vacía SHALL redirigir a `/hoy` y cualquier ruta desconocida a `/`.

#### Scenario: Ruta protegida sin sesión
- **WHEN** alguien sin sesión abre `/biblioteca`
- **THEN** es redirigido a `/login`

#### Scenario: Ruta protegida sin acceso
- **WHEN** alguien en "sin acceso" abre `/hoy`
- **THEN** es redirigido a `/sin-acceso`

#### Scenario: Login con sesión activa
- **WHEN** un usuario con sesión activa abre `/login`
- **THEN** es redirigido a `/`

#### Scenario: Ruta desconocida
- **WHEN** el usuario abre `/no-existe`
- **THEN** es redirigido a `/` y, con sesión, termina en `/hoy`

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

### Requirement: La lista de acceso solo se consulta desde el cliente, nunca se escribe
El sistema SHALL permitir a cualquier cliente, con o sin sesión, comprobar si existe la entrada de la lista de un correo exacto; NO SHALL permitir listar la colección ni leerla por consulta, y SHALL rechazar cualquier escritura a la lista desde el cliente. La lista se administra fuera de la app. Además, todo dato privado del usuario (perfil, libros, capítulos, tarjetas, estadísticas e historial) SHALL exigir ser el dueño Y estar en la lista de acceso, tanto para leer como para escribir.

#### Scenario: Comprobar un correo sin sesión
- **WHEN** un cliente sin sesión consulta la entrada exacta `nuevo@ejemplo.com`
- **THEN** la lectura se permite y responde si existe o no

#### Scenario: Leer la entrada de otro
- **WHEN** un usuario autenticado consulta la entrada exacta de un correo distinto al suyo
- **THEN** la lectura se permite y solo revela si esa entrada existe

#### Scenario: Listar la colección
- **WHEN** un cliente, con o sin sesión, intenta listar o consultar la colección de la lista
- **THEN** la operación es rechazada

#### Scenario: Intento de auto-autorizarse
- **WHEN** un cliente intenta crear o modificar una entrada de la lista
- **THEN** la escritura es rechazada

#### Scenario: Dueño sin acceso
- **WHEN** un usuario autenticado pero fuera de la lista intenta leer o escribir su propio perfil o sus tarjetas
- **THEN** la operación es rechazada

### Requirement: La pantalla "sin acceso" explica la situación y permite cerrar sesión
El sistema SHALL mostrar en `/sin-acceso`, a pantalla completa y sin la navegación principal, el título "Tu cuenta está pendiente de acceso", una explicación de que la app está en acceso anticipado, el correo con el que se intentó entrar (si se conoce), la indicación de compartir ese correo con quien administra la app, la nota "Cuando te den acceso, vuelve a entrar con Google o crea tu cuenta." y un botón "Cerrar sesión" que, al completarse, lleva a `/login`.

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
Cuando una identidad autorizada no tiene perfil todavía, el sistema SHALL crearlo, por un único camino (el observador de sesión), con: `id` igual al identificador de la identidad; `displayName` igual al nombre ingresado al registrarse si lo hubo, o en su defecto el nombre de la identidad, o la parte local del correo, o "Estudiante"; `email` igual al correo de la identidad (cadena vacía si no hay); `createdAt` igual al momento de creación; `photoURL` solo si la identidad lo trae; `isSearchable` en `false`; y ajustes con `timezone` igual a la zona horaria del dispositivo, `dayStartHour` 4, `theme` `system`, `defaultNewCardsPerDay` 20 y `autoGradeByTime` `true`. Si el perfil ya existe, el sistema SHALL cargarlo sin modificarlo. El perfil SHALL escribirse una sola vez.

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
- **THEN** el perfil se guarda una sola vez con `displayName` "Ada", aunque la identidad todavía no traiga ese nombre cuando el observador la ve

### Requirement: Los perfiles guardados se validan al leer y toleran los campos de ajustes añadidos después
Al leer un perfil, el sistema SHALL validar su forma antes de usarlo. Si faltan `defaultNewCardsPerDay` o `autoGradeByTime` (perfiles creados antes de que existieran), el sistema SHALL rellenarlos con 20 y `true` respectivamente. Si el perfil no cumple la forma esperada en cualquier otro campo, o la lectura falla, la sesión SHALL quedar en "error de perfil": el fallo se registra con la ruta del documento y la razón, y la pantalla de acceso muestra "No pudimos cargar tu perfil." con un botón "Reintentar" que repite la carga y un botón "Cerrar sesión". La sesión del proveedor NO SHALL cerrarse sola.

#### Scenario: Perfil antiguo sin los campos nuevos
- **WHEN** se carga un perfil guardado sin `defaultNewCardsPerDay` ni `autoGradeByTime`
- **THEN** la sesión se activa con `defaultNewCardsPerDay` 20 y `autoGradeByTime` `true`

#### Scenario: Perfil malformado
- **WHEN** el perfil guardado carece de un campo obligatorio como `displayName`
- **THEN** la sesión queda en "error de perfil", el detalle queda registrado y en `/login` se ve "No pudimos cargar tu perfil." con Reintentar y Cerrar sesión

#### Scenario: Reintentar tras un fallo de lectura
- **WHEN** la lectura del perfil falló por falta de red y el usuario pulsa "Reintentar" con red
- **THEN** el perfil se carga y la sesión pasa a activa sin volver a iniciar sesión

### Requirement: El usuario puede cerrar sesión
El sistema SHALL permitir cerrar sesión desde Ajustes, desde la pantalla "sin acceso" y desde el aviso de error de perfil. Al cerrar sesión, el estado SHALL pasar a "sin sesión", SHALL limpiarse cualquier marca de "sin acceso", su correo y cualquier error de perfil, y el usuario SHALL ser llevado a `/login`.

#### Scenario: Cerrar sesión desde Ajustes
- **WHEN** el usuario pulsa "Cerrar sesión" en Ajustes
- **THEN** la sesión termina y es llevado a `/login`; las rutas protegidas vuelven a redirigir a `/login`

#### Scenario: Cerrar sesión desde el error de perfil
- **WHEN** el usuario pulsa "Cerrar sesión" en el aviso de error de perfil
- **THEN** el estado pasa a "sin sesión" y el aviso desaparece

### Requirement: Operar sobre datos sin sesión activa es un error explícito
Cualquier operación de negocio que necesite al usuario actual SHALL fallar con el error "No hay una sesión activa." si la sesión no está activa o aún no se resolvió, en lugar de operar con un usuario vacío.

#### Scenario: Actualizar ajustes sin sesión
- **WHEN** se intenta actualizar los ajustes sin sesión activa
- **THEN** la operación falla con un error explícito y no se guarda nada
