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
El sistema SHALL colocar la navegación principal como barra inferior en pantallas angostas (móvil) y como barra lateral izquierda de ancho fijo en pantallas anchas (escritorio). En escritorio la barra lateral SHALL mostrar además el nombre de la app ("Flash-cards") en su cabecera. En ambos casos la navegación SHALL permanecer visible mientras el área de contenido es la única que hace scroll, y el conjunto SHALL ocupar exactamente la altura visible del dispositivo.

#### Scenario: Móvil
- **WHEN** la pantalla es angosta
- **THEN** los cuatro destinos se reparten a lo ancho de una barra inferior, con el icono encima de la etiqueta en texto pequeño, y el contenido ocupa el resto de la altura

#### Scenario: Escritorio
- **WHEN** la pantalla es ancha
- **THEN** los destinos se apilan en una columna lateral izquierda, con el icono a la izquierda de la etiqueta, el nombre "Flash-cards" arriba, y el contenido ocupa el resto del ancho

#### Scenario: El contenido largo no desplaza la navegación
- **WHEN** una sección tiene más contenido del que cabe en pantalla
- **THEN** solo el área de contenido hace scroll; la navegación conserva su tamaño y posición

### Requirement: El destino activo se distingue de forma visible y accesible
El sistema SHALL marcar el destino de navegación correspondiente a la ruta actual con el color de acento y, en escritorio, con un fondo hundido sutil; y SHALL exponerlo a tecnologías de asistencia con `aria-current="page"`. Las rutas hijas de una sección (por ejemplo el detalle de un libro) SHALL mantener activo el destino de su sección. Los destinos no activos SHALL usar el color de texto secundario y pasar a primario al pasar el puntero.

#### Scenario: Sección activa
- **WHEN** la ruta actual es `/progreso`
- **THEN** el destino Progreso está resaltado con el acento y lleva `aria-current="page"`; los otros tres no

#### Scenario: Ruta hija mantiene la sección activa
- **WHEN** la ruta actual es `/biblioteca/{bookId}` o `/biblioteca/{bookId}/{chapterId}`
- **THEN** el destino Biblioteca sigue marcado como activo

#### Scenario: Ruta sin destino propio
- **WHEN** la ruta actual es `/importar`
- **THEN** ningún destino de la navegación está marcado como activo

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
El sistema SHALL dibujar los iconos como trazos que toman el color del texto que los rodea, ocultos para tecnologías de asistencia (el significado lo aporta el texto vecino), en dos tamaños (pequeño y mediano, mediano por defecto). El catálogo actual: calendario, libros, gráfico, controles deslizantes, alerta, cerebro, check y equis.

#### Scenario: Icono dentro de un texto de acento
- **WHEN** un icono se coloca dentro de un elemento con color de acento
- **THEN** el icono se pinta con ese mismo color sin configuración adicional

### Requirement: Modal base accesible con cierre por Escape
El sistema SHALL ofrecer un cascarón de diálogo modal que: cubre toda la pantalla con un fondo oscurecido semitransparente y centra el panel; expone el panel como diálogo modal con un nombre accesible obligatorio; cierra (notificando a la pantalla) cuando el usuario pulsa Escape con el foco dentro del diálogo; bloquea ese cierre y se marca como ocupado mientras la pantalla indica que hay una operación pendiente; y admite tres tamaños (pequeño, mediano por defecto y grande, este último con altura máxima y scroll interno para contenidos largos). El contenido (título, formulario, botones) lo aporta cada diálogo. Tocar el fondo oscurecido NO cierra el diálogo.

#### Scenario: Escape cierra
- **WHEN** el diálogo no está ocupado y el usuario pulsa Escape con el foco dentro de él
- **THEN** el diálogo pide cerrarse y la pantalla lo cancela

#### Scenario: Escape bloqueado mientras guarda
- **WHEN** la pantalla marcó el diálogo como pendiente (por ejemplo, guardando)
- **THEN** pulsar Escape no cierra el diálogo y este se anuncia como ocupado

#### Scenario: Tocar el fondo no cierra
- **WHEN** el usuario toca el fondo oscurecido fuera del panel
- **THEN** el diálogo permanece abierto

#### Scenario: Tamaño grande con scroll interno
- **WHEN** un diálogo grande tiene más contenido del que cabe en el 90 % de la altura visible
- **THEN** el panel limita su altura y el contenido hace scroll dentro del panel

### Requirement: Pie de versión con número, commit y fecha de build
El sistema SHALL mostrar un pie discreto en texto atenuado con dos líneas: `v{versión} · {hash corto del commit}` y la fecha-hora del build en formato `dd/MM/yyyy HH:mm` en la hora local del usuario. La versión SHALL salir de la única fuente de versión del proyecto (la que el proceso de release incrementa). El hash SHALL ser el del commit del que salió el build; si el build se hace sin historial de git, SHALL mostrarse `sin-git` en su lugar.

#### Scenario: Contenido del pie
- **WHEN** la app está en la versión 0.4.0 construida desde el commit `99ed108` el 2 de julio de 2026 a las 16:47 UTC
- **THEN** el pie muestra `v0.4.0 · 99ed108` y, para un usuario en UTC-5, `02/07/2026 11:47`

#### Scenario: Build sin git
- **WHEN** el build se genera donde no hay repositorio de git
- **THEN** el pie muestra `sin-git` en lugar del hash

### Requirement: El pie de versión se ubica distinto en escritorio y en móvil
En escritorio el pie SHALL ir al fondo de la barra lateral, debajo de los destinos. En móvil la barra inferior SHALL quedar limpia y el pie SHALL aparecer centrado al final del contenido que hace scroll, empujado al fondo cuando el contenido es corto.

#### Scenario: Escritorio
- **WHEN** la pantalla es ancha
- **THEN** el pie se ve al fondo de la barra lateral y no al final del contenido

#### Scenario: Móvil con poco contenido
- **WHEN** la pantalla es angosta y la sección tiene poco contenido
- **THEN** el pie se ve centrado al fondo del área de contenido, justo encima de la barra inferior, y no dentro de la barra

### Requirement: Un solo archivo de tema con tokens semánticos; prohibido el literal
El sistema SHALL definir todos los colores y la familia tipográfica como tokens semánticos en un único archivo de tema: superficies (lienzo, elevada, hundida), texto (primario, secundario, atenuado), borde, acento (base, hover, contraste), anillo de foco, peligro (base, contraste) y la escala de calificación. Ningún componente SHALL escribir un color ni una fuente literal: solo referencias a esos tokens.

#### Scenario: Cambiar la identidad
- **WHEN** se modifica el valor de un token en el archivo de tema
- **THEN** todas las pantallas reflejan el cambio sin tocar ningún componente

### Requirement: Tema claro por defecto, oscuro según el sistema, con override manual por atributo
El sistema SHALL usar la paleta clara (base neutra cálida) por defecto y SHALL cambiar a la paleta oscura cuando el sistema del usuario prefiere oscuro, salvo que el documento lleve fijado el tema claro. El documento SHALL admitir forzar el tema oscuro con un atributo explícito de tema, independientemente de la preferencia del sistema. Los controles nativos y barras de scroll SHALL seguir el esquema activo. Ambas paletas usan los mismos tokens semánticos.

#### Scenario: Preferencia del sistema en oscuro
- **WHEN** el sistema del usuario prefiere el esquema oscuro y el documento no fija un tema
- **THEN** la app se pinta con la paleta oscura

#### Scenario: Tema claro fijado gana a la preferencia
- **WHEN** el documento fija el tema claro y el sistema prefiere oscuro
- **THEN** la app se pinta con la paleta clara

#### Scenario: Tema oscuro forzado
- **WHEN** el documento fija el tema oscuro y el sistema prefiere claro
- **THEN** la app se pinta con la paleta oscura

### Requirement: Un solo acento disciplinado, distinto de los colores de calificación
El sistema SHALL usar un único color de acento (teal profundo, ni azul corporativo ni verde de gamificación) para acción principal y estado activo. La escala rojo → naranja → amarillo → verde SHALL quedar reservada a los cuatro niveles de calificación del repaso y no SHALL usarse para otros fines.

#### Scenario: Estado activo usa el acento
- **WHEN** un destino de navegación está activo
- **THEN** se pinta con el token de acento, no con un color de la escala de calificación

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
