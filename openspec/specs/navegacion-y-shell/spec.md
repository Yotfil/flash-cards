# Navegación y shell Specification

## Purpose

Define el caparazón de la app autenticada: las cuatro secciones principales y su navegación (inferior en móvil, lateral en escritorio), qué pantallas viven fuera de ese caparazón a pantalla completa, cómo se protege cada ruta según la sesión, y las piezas de interfaz transversales que toda pantalla reutiliza: estados vacío y de error, el modal base, el pie de versión, el sistema de tema por tokens semánticos y la base de accesibilidad y responsive. Es el marco dentro del cual se pintan Hoy, Biblioteca, Progreso y Ajustes.

## Requirements

### Requirement: La app autenticada tiene cuatro secciones principales en un orden fijo
El sistema SHALL ofrecer una navegación principal con exactamente cuatro destinos, en este orden: **Hoy**, **Biblioteca**, **Progreso** y **Ajustes**. Cada destino SHALL mostrar un icono y su etiqueta de texto (calendario para Hoy, libros para Biblioteca, gráfico de barras para Progreso, controles deslizantes para Ajustes). La región de navegación SHALL tener el nombre accesible "Navegación principal".

#### Scenario: Las cuatro secciones están siempre disponibles
- **WHEN** el usuario con sesión está en cualquier pantalla dentro del caparazón
- **THEN** ve los cuatro destinos Hoy, Biblioteca, Progreso y Ajustes, cada uno con icono y etiqueta, y puede ir a cualquiera con un toque

#### Scenario: Rutas de cada sección
- **WHEN** el usuario toca Hoy, Biblioteca, Progreso o Ajustes
- **THEN** la URL pasa a `/hoy`, `/biblioteca`, `/progreso` o `/ajustes` respectivamente y se pinta esa sección en el área de contenido

### Requirement: La navegación se ubica abajo en móvil y a la izquierda en escritorio
El sistema SHALL colocar la navegación principal como barra inferior de acrílico en pantallas angostas (móvil), respetando la zona segura inferior del dispositivo, y como barra lateral izquierda de ancho fijo en pantallas anchas (escritorio). En escritorio la barra lateral SHALL mostrar además la marca "Cadence" con su icono de chispa en la cabecera, y el área de contenido SHALL centrarse con un ancho máximo de lectura. En ambos casos la navegación SHALL permanecer visible mientras el área de contenido es la única que hace scroll, y el conjunto SHALL ocupar exactamente la altura visible del dispositivo.

#### Scenario: Móvil
- **WHEN** la pantalla es angosta
- **THEN** los cuatro destinos se reparten a lo ancho de una barra inferior de acrílico, con el icono encima de la etiqueta en texto pequeño, y el contenido ocupa el resto de la altura

#### Scenario: Escritorio
- **WHEN** la pantalla es ancha
- **THEN** los destinos se apilan en una columna lateral izquierda, con el icono a la izquierda de la etiqueta, la marca "Cadence" arriba, y el contenido se centra con ancho máximo en el resto del ancho

#### Scenario: El contenido largo no desplaza la navegación
- **WHEN** una sección tiene más contenido del que cabe en pantalla
- **THEN** solo el área de contenido hace scroll; la navegación conserva su tamaño y posición

### Requirement: El destino activo se distingue de forma visible y accesible
El sistema SHALL marcar el destino de navegación correspondiente a la ruta actual con el color de acento y con una píldora de fondo tenue que se desliza hasta él al cambiar de sección (en un instante si el usuario prefiere reducir el movimiento); y SHALL exponerlo a tecnologías de asistencia con `aria-current="page"`. Las rutas hijas de una sección (por ejemplo el detalle de un libro) SHALL mantener activo el destino de su sección. Los destinos no activos SHALL usar el color de texto tenue; en dispositivos con puntero, pasar por encima los sube al texto atenuado.

#### Scenario: Sección activa
- **WHEN** la ruta actual es `/progreso`
- **THEN** el destino Progreso está resaltado con el acento, la píldora está bajo él y lleva `aria-current="page"`; los otros tres no

#### Scenario: Ruta hija mantiene la sección activa
- **WHEN** la ruta actual es `/biblioteca/{bookId}` o `/biblioteca/{bookId}/{chapterId}`
- **THEN** el destino Biblioteca sigue marcado como activo

#### Scenario: Ruta sin destino propio
- **WHEN** la ruta actual es `/importar`
- **THEN** ningún destino de la navegación está marcado como activo ni lleva la píldora

### Requirement: Las pantallas que viven dentro del caparazón
El sistema SHALL renderizar dentro del caparazón (con la navegación visible) las rutas `/hoy`, `/biblioteca`, `/importar`, `/biblioteca/{bookId}`, `/biblioteca/{bookId}/{chapterId}`, `/progreso` y `/ajustes`. Cada pantalla SHALL cargarse bajo demanda al entrar por primera vez en ella.

#### Scenario: Detalle de libro dentro del caparazón
- **WHEN** el usuario abre `/biblioteca/{bookId}`
- **THEN** ve el detalle del libro con la navegación principal visible

### Requirement: La raíz y las rutas desconocidas llevan a Hoy
El sistema SHALL redirigir la ruta raíz `/` a `/hoy`, y SHALL redirigir cualquier ruta no reconocida a la raíz (que a su vez termina en `/hoy` si hay sesión, o en el acceso si no la hay).

#### Scenario: Abrir la app
- **WHEN** un usuario con sesión abre `/`
- **THEN** termina en `/hoy`

#### Scenario: URL inexistente
- **WHEN** un usuario con sesión abre `/esto-no-existe`
- **THEN** termina en `/hoy` sin mostrar una pantalla de error

### Requirement: Algunas pantallas van a pantalla completa, fuera del caparazón
El sistema SHALL mostrar sin la navegación principal, ocupando toda la pantalla, las rutas `/login` (acceso), `/sin-acceso` (cuenta pendiente de acceso), `/repaso` (sesión de repaso) y `/practicar` (modo practicar). En esas rutas no se pinta el pie de versión del caparazón. Qué rutas exigen sesión y cómo se redirige según el estado de la sesión lo define la spec de autenticación y acceso.

#### Scenario: Repaso sin distracciones
- **WHEN** el usuario inicia una sesión de repaso
- **THEN** la URL es `/repaso` y no se ven los destinos Hoy · Biblioteca · Progreso · Ajustes

#### Scenario: Practicar también a pantalla completa
- **WHEN** el usuario entra al modo practicar
- **THEN** la URL es `/practicar` y la navegación principal no está visible

### Requirement: Estado vacío reutilizable
El sistema SHALL ofrecer un componente de estado vacío, usado cuando no hay datos que mostrar pero no es un error, que muestra centrado un título (obligatorio), un mensaje opcional en texto secundario y, opcionalmente, una acción que la pantalla que lo usa decide colocar debajo.

#### Scenario: Vacío con acción
- **WHEN** una pantalla muestra el estado vacío con título, mensaje y una acción
- **THEN** se ven los tres elementos apilados y centrados, en ese orden

#### Scenario: Vacío solo con título
- **WHEN** una pantalla muestra el estado vacío sin mensaje ni acción
- **THEN** solo se ve el título centrado

### Requirement: Estado de error reutilizable con reintento
El sistema SHALL ofrecer un componente de estado de error que se anuncia como alerta a tecnologías de asistencia, muestra un título (por defecto "Algo salió mal"), un mensaje opcional y siempre un botón "Reintentar" que notifica a la pantalla para volver a cargar.

#### Scenario: Error con reintento
- **WHEN** una carga falla y la pantalla muestra el estado de error
- **THEN** el usuario ve el título, el mensaje si lo hay y el botón "Reintentar"; al pulsarlo la pantalla vuelve a intentar la carga

#### Scenario: Título por defecto
- **WHEN** la pantalla no indica un título
- **THEN** se muestra "Algo salió mal"

### Requirement: Los iconos son decorativos y heredan el color del texto
El sistema SHALL dibujar los iconos como trazos que toman el color del texto que los rodea, ocultos para tecnologías de asistencia (el significado lo aporta el texto vecino), en dos tamaños (pequeño y mediano, mediano por defecto). El catálogo actual: calendario, libros, gráfico, controles deslizantes, alerta, cerebro, check, equis, chispa (marca) y sin conexión.

#### Scenario: Icono dentro de un texto de acento
- **WHEN** un icono se coloca dentro de un elemento con color de acento
- **THEN** el icono se pinta con ese mismo color sin configuración adicional

### Requirement: Modal base accesible con cierre por Escape
El sistema SHALL ofrecer un mecanismo de diálogo modal que cualquier pantalla abre indicando el contenido, un nombre accesible obligatorio y un tamaño, y que devuelve el resultado con el que el contenido lo cerró. Al abrirse, el diálogo SHALL cubrir toda la pantalla con un fondo oscurecido, centrar un panel de acrílico (sólido con la preferencia de reducir transparencia), mover el foco dentro del panel, mantenerlo atrapado ahí y bloquear el scroll del fondo; al cerrarse SHALL devolver el foco al elemento que lo abrió. Pulsar Escape en cualquier lugar SHALL cerrarlo sin resultado, salvo que el contenido lo haya marcado como ocupado, en cuyo caso SHALL seguir abierto y anunciarse como ocupado. Tocar el fondo oscurecido NO SHALL cerrarlo. Admite tres tamaños (pequeño, mediano por defecto y grande, este último con altura máxima y scroll interno). Un diálogo cuya acción falla SHALL permanecer abierto mostrando el error; solo se cierra cuando la acción termina con éxito o el usuario lo cancela.

#### Scenario: Foco al abrir y al cerrar
- **WHEN** el usuario abre un diálogo desde un botón
- **THEN** el foco pasa al primer control del diálogo y, al cerrarse, vuelve a ese botón

#### Scenario: Escape cierra
- **WHEN** el diálogo no está ocupado y el usuario pulsa Escape, esté donde esté el foco
- **THEN** el diálogo se cierra sin resultado

#### Scenario: Escape bloqueado mientras guarda
- **WHEN** el contenido marcó el diálogo como ocupado (por ejemplo, guardando)
- **THEN** pulsar Escape no cierra el diálogo y este se anuncia como ocupado

#### Scenario: Tocar el fondo no cierra
- **WHEN** el usuario toca el fondo oscurecido fuera del panel
- **THEN** el diálogo permanece abierto

#### Scenario: Resultado al cerrar
- **WHEN** el contenido cierra el diálogo con un resultado
- **THEN** la pantalla que lo abrió recibe ese resultado

#### Scenario: Tamaño grande con scroll interno
- **WHEN** un diálogo grande tiene más contenido del que cabe en el 90 % de la altura visible
- **THEN** el panel limita su altura y el contenido hace scroll dentro del panel

#### Scenario: La acción falla
- **WHEN** la acción confirmada desde un diálogo falla
- **THEN** el diálogo sigue abierto, muestra el error y permite reintentar o cancelar

### Requirement: Pie de versión con número, commit y fecha de build
El sistema SHALL ofrecer un componente de pie de versión, discreto y en texto tenue, con dos líneas: `v{versión} · {hash corto del commit}` y la fecha-hora del build en formato `dd/MM/yyyy HH:mm` en la hora local del usuario. La versión SHALL salir de la única fuente de versión del proyecto (la que el proceso de release incrementa). El hash SHALL ser el del commit del que salió el build; si el build se hace sin historial de git, SHALL mostrarse `sin-git` en su lugar. Dónde se coloca lo decide la pantalla que lo usa (Ajustes); el caparazón no lo pinta.

#### Scenario: Contenido del pie
- **WHEN** la app está en la versión 0.4.0 construida desde el commit `99ed108` el 2 de julio de 2026 a las 16:47 UTC
- **THEN** el pie muestra `v0.4.0 · 99ed108` y, para un usuario en UTC-5, `02/07/2026 11:47`

#### Scenario: Build sin git
- **WHEN** el build se genera donde no hay repositorio de git
- **THEN** el pie muestra `sin-git` en lugar del hash

#### Scenario: El caparazón no lo pinta
- **WHEN** el usuario está en cualquier sección del caparazón
- **THEN** el pie de versión no aparece en la navegación ni al final del contenido

### Requirement: Un solo archivo de tema con tokens semánticos; prohibido el literal
El sistema SHALL definir todos los colores, desenfoques, sombras, duraciones, curvas de movimiento y la familia tipográfica como tokens semánticos en un único archivo de tema, agrupados en familias: fondo nocturno (tres paradas), superficie sólida, vidrio (color, color suave, bordes, desenfoques), acento (base, profundo, tinta, texto, tinte, línea), texto (primario, atenuado, tenue), apagado, pista, vinotinto, peligro (base, contraste), escala de calificación, sombras, duraciones (presionar, rápida, base, vista, volteo) y curvas; más el ancho máximo del contenido. Ningún componente SHALL escribir un color, desenfoque, sombra, duración ni fuente literal: solo referencias a esos tokens o a las utilidades que los encapsulan (vidrio, presionar).

#### Scenario: Cambiar la identidad
- **WHEN** se modifica el valor de un token en el archivo de tema
- **THEN** todas las pantallas reflejan el cambio sin tocar ningún componente

#### Scenario: Sin literales en los componentes
- **WHEN** se revisa el código de los componentes
- **THEN** no aparece ningún color en hexadecimal ni en `rgb` fuera del archivo de tema

### Requirement: Un solo acento disciplinado, distinto de los colores de calificación
El sistema SHALL usar un único color de acento (azul eléctrico, con texto oscuro encima cuando es fondo) para la acción principal y el estado activo. El vinotinto SHALL aparecer solo como un brillo tenue en el fondo de las pantallas de gestión, nunca en botones ni en Repaso. La escala rojo → naranja → amarillo → verde SHALL quedar reservada a los cuatro niveles de calificación del repaso y no SHALL usarse para otros fines.

#### Scenario: Estado activo usa el acento
- **WHEN** un destino de navegación está activo
- **THEN** se pinta con el token de acento, no con un color de la escala de calificación

#### Scenario: Botón principal
- **WHEN** una pantalla pinta su acción principal
- **THEN** el fondo es el acento y el texto encima es la tinta oscura del acento, no blanco

### Requirement: Los tokens de peligro son independientes de la escala de calificación
El sistema SHALL tener tokens propios de peligro (fondo y texto de contraste) para errores de formulario y acciones destructivas, separados en intención del token de calificación "Again" aunque hoy compartan valor. Cambiar uno no SHALL cambiar el otro.

#### Scenario: Botón de borrar
- **WHEN** una pantalla pinta una acción destructiva
- **THEN** usa el token de peligro; si luego se cambia el color del nivel "Again", el botón de borrar no cambia

### Requirement: Una sola familia tipográfica, autoalojada
El sistema SHALL usar una única familia sans con buen soporte de acentos, servida desde la propia app (sin peticiones a servidores de fuentes externos) en los pesos regular, medio, seminegrita y negrita, con una pila de respaldo del sistema.

#### Scenario: Sin red externa
- **WHEN** la app se abre sin acceso a servidores de terceros
- **THEN** la tipografía se carga igual desde los archivos de la propia app

### Requirement: Accesibilidad base en todo el documento
El sistema SHALL declarar el documento en español, con la vista adaptada al ancho del dispositivo (incluyendo zonas seguras del borde), un mensaje visible pidiendo activar JavaScript cuando no esté disponible, un anillo de foco visible y consistente (token de foco) en todo elemento enfocado por teclado, y SHALL reducir a lo imperceptible toda animación, transición y scroll suave cuando el usuario prefiere menos movimiento.

#### Scenario: Navegación por teclado
- **WHEN** el usuario mueve el foco con Tab a cualquier control
- **THEN** el control muestra un contorno de dos píxeles con el color del token de foco

#### Scenario: Reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento
- **THEN** ninguna transición ni animación de la app dura más de un instante imperceptible

#### Scenario: Sin JavaScript
- **WHEN** el navegador no ejecuta JavaScript
- **THEN** se lee "Activa JavaScript para usar la aplicación."

### Requirement: Tema oscuro base que sigue al sistema, con override manual por atributo
El sistema SHALL usar la paleta oscura (azul noche hacia púrpura, con acrílico en el cromo) como base y SHALL cambiar a la paleta clara, plana y sin acrílico, cuando el sistema del usuario prefiere claro, salvo que el documento lleve fijado el tema oscuro. El documento SHALL admitir forzar el tema claro o el oscuro con un atributo explícito de tema, independientemente de la preferencia del sistema. Los controles nativos y barras de scroll SHALL seguir el esquema activo. Cuando el usuario prefiere reducir la transparencia, todas las superficies de vidrio SHALL volverse sólidas. Ambas paletas usan los mismos tokens semánticos.

#### Scenario: Preferencia del sistema en claro
- **WHEN** el sistema del usuario prefiere el esquema claro y el documento no fija un tema
- **THEN** la app se pinta con la paleta clara, sin acrílico

#### Scenario: Preferencia del sistema en oscuro
- **WHEN** el sistema del usuario prefiere el esquema oscuro y el documento no fija un tema
- **THEN** la app se pinta con la paleta oscura

#### Scenario: Tema oscuro fijado gana a la preferencia
- **WHEN** el documento fija el tema oscuro y el sistema prefiere claro
- **THEN** la app se pinta con la paleta oscura

#### Scenario: Tema claro forzado
- **WHEN** el documento fija el tema claro y el sistema prefiere oscuro
- **THEN** la app se pinta con la paleta clara

#### Scenario: Reducir transparencia
- **WHEN** el usuario tiene activada la preferencia de reducir la transparencia
- **THEN** la navegación, los diálogos y los listados se pintan con superficie sólida, sin desenfoque

### Requirement: La preferencia de tema se aplica al documento y se recuerda
El sistema SHALL aplicar la preferencia de tema del usuario (`light`, `dark` o `system`) al documento: `light` y `dark` fijan el atributo de tema correspondiente; `system` lo quita para que mande la preferencia del sistema. El sistema SHALL recordar en el navegador la última preferencia aplicada y SHALL aplicarla al arrancar, antes de pintar la primera pantalla, para que el usuario no vea un destello con el tema equivocado. Si no hay preferencia recordada o la recordada no es válida, SHALL comportarse como `system`. La fuente de la preferencia (el perfil del usuario) la define la spec de ajustes; hasta que exista, la preferencia es `system`.

#### Scenario: Aplicar oscuro
- **WHEN** la preferencia pasa a `dark`
- **THEN** el documento lleva fijado el tema oscuro y la preferencia queda recordada

#### Scenario: Volver a sistema
- **WHEN** la preferencia pasa a `system`
- **THEN** el documento no lleva fijado ningún tema y manda la preferencia del sistema

#### Scenario: Arranque con preferencia recordada
- **WHEN** el usuario recordó `light` y abre la app con el sistema en oscuro
- **THEN** la primera pantalla ya se pinta en claro, sin pasar por el oscuro

#### Scenario: Valor recordado inválido
- **WHEN** lo recordado en el navegador no es `light`, `dark` ni `system`
- **THEN** la app arranca siguiendo al sistema, sin error

### Requirement: Esqueleto de carga reutilizable
El sistema SHALL ofrecer un componente de esqueleto de carga que pinta siluetas con la forma aproximada del contenido que viene (líneas y bloques), marcado como ocupado para tecnologías de asistencia y sin texto. Las pantallas SHALL usarlo mientras cargan en lugar de un indicador giratorio. El brillo del esqueleto SHALL quedarse quieto cuando el usuario prefiere reducir el movimiento.

#### Scenario: Pantalla cargando
- **WHEN** una pantalla está leyendo sus datos
- **THEN** muestra siluetas en el lugar del contenido, sin texto ni indicador giratorio, y la región se anuncia como ocupada

#### Scenario: Reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento
- **THEN** las siluetas no parpadean ni se desplazan

### Requirement: Sin conexión es un modo con indicador discreto
El sistema SHALL detectar cuándo el dispositivo no tiene conexión y, mientras dure, SHALL mostrar dentro del caparazón un indicador discreto con el texto "Sin conexión. Tus repasos se guardan aquí y se sincronizan al volver.", anunciado a tecnologías de asistencia como estado, sin bloquear ninguna pantalla ni mostrar un estado de error por la sola falta de red. Al recuperar la conexión el indicador SHALL desaparecer.

#### Scenario: Se pierde la conexión
- **WHEN** el dispositivo pierde la conexión con el usuario en cualquier sección del caparazón
- **THEN** aparece el indicador con el texto indicado y la pantalla sigue siendo usable

#### Scenario: Vuelve la conexión
- **WHEN** el dispositivo recupera la conexión
- **THEN** el indicador desaparece

### Requirement: Las pantallas cargan sus datos con un recurso de estado explícito
Toda pantalla que lee datos SHALL distinguir cuatro situaciones y pintar cada una con su pieza: cargando (esqueleto), error (estado de error con reintento que repite la lectura), vacío (estado vacío) y listo (el contenido). Un fallo de lectura NUNCA SHALL pintarse como vacío ni como "al día".

Las lecturas de listas que alimentan una pantalla (libros, paquetes de práctica, cola e indicadores del día, capítulos, tarjetas) SHALL hacerse en dos fases: primero lo que el dispositivo ya tiene guardado de esa misma lectura, y después la lectura del servidor. Si el dispositivo tiene algo guardado, la pantalla SHALL pintarlo de inmediato en el estado "listo" y SHALL actualizar el contenido en su sitio cuando llegue la lectura del servidor, sin volver al esqueleto ni mostrar un indicador de actualización. Si el dispositivo no tiene nada guardado, la pantalla SHALL mostrar el esqueleto hasta la lectura del servidor, como hasta ahora. Una lista guardada vacía SHALL tratarse como "nada guardado": el estado vacío solo SHALL decidirse con la lectura del servidor (o, sin conexión, con lo guardado). Si la lectura del servidor falla mientras ya se muestra lo guardado, el contenido SHALL quedarse en pantalla, el fallo SHALL registrarse en el registro de la app y NO SHALL mostrarse el estado de error; si falla sin nada guardado a la vista, SHALL mostrarse el estado de error con "Reintentar". Los conteos agregados no tienen fase guardada: siempre van al servidor.

#### Scenario: Fallo de lectura
- **WHEN** la lectura de una pantalla falla y el dispositivo no tenía nada guardado de ella
- **THEN** la pantalla muestra el estado de error con "Reintentar", no el estado vacío

#### Scenario: Reintentar repite la lectura
- **WHEN** el usuario pulsa "Reintentar"
- **THEN** la pantalla vuelve a cargar y muestra el esqueleto mientras tanto

#### Scenario: Segunda visita con datos guardados
- **WHEN** el usuario ya abrió la Biblioteca con conexión y vuelve a abrirla
- **THEN** la lista aparece al instante con los libros guardados, sin esqueleto, y si en el servidor hay un libro nuevo creado en otro dispositivo, aparece en la lista al llegar la lectura

#### Scenario: Primera visita sin datos guardados
- **WHEN** el usuario abre por primera vez en este dispositivo una pantalla que lee una lista
- **THEN** la pantalla muestra el esqueleto hasta que llega la lectura del servidor

#### Scenario: Lo guardado está vacío
- **WHEN** el dispositivo tiene guardada una lista vacía de una lectura (por ejemplo, la Biblioteca de una cuenta que acaba de crear su primer libro en otro dispositivo)
- **THEN** la pantalla muestra el esqueleto hasta la lectura del servidor, no el estado vacío

#### Scenario: Falla el servidor con contenido guardado a la vista
- **WHEN** la pantalla ya pintó lo guardado y la lectura del servidor falla
- **THEN** el contenido guardado se queda en pantalla, el fallo queda en el registro de la app y no aparece el estado de error

#### Scenario: Sin conexión con datos guardados
- **WHEN** el usuario abre sin red una pantalla cuya lectura el dispositivo tiene guardada
- **THEN** la pantalla muestra lo guardado en el estado "listo"

### Requirement: Un fallo que ninguna pantalla prevé se avisa de forma discreta
Cuando ocurra un error que ninguna pantalla maneja, el sistema SHALL registrarlo en el registro de errores de la app y SHALL mostrar un aviso discreto y sólido con el texto "Algo salió mal. Si se repite, recarga la app." y una acción para cerrarlo, anunciado como alerta accesible. El aviso SHALL verse en cualquier pantalla, también en las de pantalla completa (repaso, práctica), sin tapar la navegación. Varios fallos seguidos SHALL mostrar un único aviso. Un fallo que una pantalla ya explica con su propio mensaje NO SHALL producir además este aviso.

#### Scenario: Fallo no previsto
- **WHEN** ocurre un error que ninguna pantalla maneja
- **THEN** queda registrado y aparece el aviso "Algo salió mal. Si se repite, recarga la app."

#### Scenario: Varios fallos seguidos
- **WHEN** ocurren tres errores no previstos seguidos
- **THEN** se ve un único aviso

#### Scenario: Cerrar el aviso
- **WHEN** el usuario toca la acción de cerrar del aviso
- **THEN** el aviso desaparece, y vuelve a aparecer solo si ocurre otro fallo no previsto

#### Scenario: Un fallo que la pantalla ya explica
- **WHEN** falla el guardado de un diálogo y el diálogo muestra su propio mensaje de error
- **THEN** no aparece además el aviso global
