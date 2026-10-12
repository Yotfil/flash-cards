# Plataforma, datos y offline Specification

## Purpose

Define los cimientos sobre los que corre la app: dónde viven los datos de cada usuario y quién puede tocarlos (aislamiento por dueño, lista de acceso del acceso anticipado, historial de repasos solo de agregado), qué consultas deben ser eficientes, cómo se comporta la app sin red (caché local persistente, escrituras encoladas, app instalable), cómo se validan los datos externos al entrar, qué cabeceras de seguridad entrega el hosting, cómo se configura el entorno sin secretos en el código y qué límites respeta al escribir en lote. El almacén y el algoritmo de programación entran como adaptadores detrás de una frontera única (ADR 0001); esta spec describe lo observable de esa plataforma, no su implementación.

## Requirements

### Requirement: Todos los datos de un usuario viven bajo su propio espacio
El sistema SHALL guardar todo dato privado dentro del espacio del usuario identificado por su `uid`: el perfil y ajustes en la raíz de ese espacio, y debajo las colecciones de libros, capítulos, tarjetas, registros de repaso e indicadores diarios (estos últimos identificados por la fecha `YYYY-MM-DD` del día de estudio). Ningún documento privado SHALL necesitar un campo de "dueño": el dueño lo define la ruta.

#### Scenario: Ubicación de una tarjeta
- **WHEN** el usuario `u1` crea una tarjeta
- **THEN** el documento queda bajo el espacio de `u1`, en su colección de tarjetas, y no en una colección global

#### Scenario: Indicadores del día
- **WHEN** el usuario completa un repaso el día de estudio `2026-06-15`
- **THEN** los contadores se acumulan en el documento `2026-06-15` de su colección de indicadores diarios

### Requirement: Solo el dueño autenticado lee y escribe su espacio; lo demás se deniega por defecto
El sistema SHALL permitir leer y escribir el perfil, los libros, los capítulos, las tarjetas y los indicadores diarios únicamente a la petición autenticada cuyo `uid` coincide con el del espacio y cuyo correo está en la lista de acceso anticipado (el detalle de esa lista vive en la spec de autenticación y acceso). Cualquier otra ruta o colección no declarada explícitamente SHALL quedar denegada, tanto para lectura como para escritura. Los permisos se declaran colección por colección, no con un comodín recursivo.

#### Scenario: Otro usuario intenta leer
- **WHEN** el usuario `u2` autenticado intenta leer una tarjeta del espacio de `u1`
- **THEN** la lectura es rechazada

#### Scenario: Sin autenticación
- **WHEN** una petición sin sesión intenta leer o escribir cualquier documento
- **THEN** es rechazada

#### Scenario: Colección no declarada
- **WHEN** el dueño intenta escribir en una subcolección de su espacio que no es una de las declaradas (por ejemplo, una inventada)
- **THEN** la escritura es rechazada

### Requirement: El historial de repasos es solo de agregado
El sistema SHALL permitir al dueño crear y leer registros de repaso, pero NUNCA modificarlos ni borrarlos, ni siquiera siendo el dueño.

#### Scenario: Crear y leer
- **WHEN** el dueño registra un repaso y luego lo consulta
- **THEN** ambas operaciones se permiten

#### Scenario: Intentar corregir un registro
- **WHEN** el dueño intenta actualizar o borrar un registro de repaso existente
- **THEN** la operación es rechazada

### Requirement: Las consultas que el producto necesita deben ser eficientes
El sistema SHALL declarar los índices compuestos para que sean eficientes las consultas: tarjetas de un libro ordenadas por fecha de vencimiento; tarjetas de un libro filtradas por estado de programación; y registros de repaso de un libro ordenados por fecha de repaso. Las consultas que la app ejecuta hoy SHALL resolverse sin pedir índices adicionales: libros ordenados por `order`; capítulos y tarjetas filtrados por igualdad (por libro o por capítulo) con el orden por fecha de creación aplicado en memoria; tarjetas con vencimiento menor o igual a una fecha; y conteos de tarjetas por estado calculados en el servidor sin descargar documentos.

#### Scenario: Cola por libro
- **WHEN** se piden las tarjetas de un libro ordenadas por vencimiento
- **THEN** la consulta se resuelve con índice, sin error de "índice faltante"

#### Scenario: Conteo por estado sin descarga
- **WHEN** Progreso pide cuántas tarjetas hay nuevas, en aprendizaje y en repaso
- **THEN** los tres conteos se obtienen del servidor sin leer los documentos de las tarjetas

#### Scenario: Historial por libro
- **WHEN** se piden los registros de repaso de un libro ordenados por fecha de repaso
- **THEN** la consulta se resuelve con índice

### Requirement: La app funciona sin red con una caché local persistente y multi-pestaña
El sistema SHALL mantener una caché local persistente de los datos leídos, compartida entre pestañas del mismo navegador, de modo que al perder la red la app siga mostrando los datos ya vistos y permita estudiar. Las escrituras hechas sin red SHALL encolarse localmente y sincronizarse al recuperar la conexión. La falta de red SHALL tratarse como un modo de uso, no como un error.

#### Scenario: Estudiar sin red
- **WHEN** el usuario ya abrió la app con red, pierde la conexión y califica tarjetas
- **THEN** la sesión continúa, las calificaciones quedan guardadas localmente y se envían al almacén cuando vuelve la red

#### Scenario: Dos pestañas
- **WHEN** el usuario tiene la app abierta en dos pestañas del mismo navegador
- **THEN** ambas comparten la misma caché local sin bloquearse entre sí

### Requirement: El caparazón de la app se sirve desde caché en producción
En builds de producción el sistema SHALL registrar un trabajador de servicio que, una vez la app está estable (o a más tardar a los 30 segundos de arrancar), precarga el documento principal, el manifiesto y todos los archivos de código y estilos, y guarda bajo demanda imágenes y fuentes al usarlas (refrescándolas cuando hay una versión nueva). En desarrollo ese trabajador NO SHALL registrarse.

#### Scenario: Abrir sin red tras una visita
- **WHEN** el usuario visitó la app en producción y luego la abre sin conexión
- **THEN** la app arranca desde la caché local del navegador

#### Scenario: Desarrollo
- **WHEN** la app corre en modo desarrollo
- **THEN** no hay trabajador de servicio registrado

### Requirement: La app es instalable como PWA en español
El sistema SHALL publicar un manifiesto con nombre y nombre corto "Flash-cards", descripción, idioma `es`, dirección de texto izquierda-derecha, modo de presentación `standalone`, alcance y URL de inicio en la raíz, color de tema y de fondo iguales al lienzo claro, y ocho iconos PNG (72, 96, 128, 144, 152, 192, 384 y 512 píxeles) válidos tanto enmascarables como normales. El documento SHALL declarar además los metadatos para instalación en iOS (capaz de app web, título "Flash-cards", icono táctil de 192 píxeles) y el color de la barra del navegador coherente con el tema: el lienzo claro bajo preferencia clara y el lienzo oscuro bajo preferencia oscura.

#### Scenario: Instalación
- **WHEN** el usuario instala la app desde el navegador
- **THEN** se instala con el nombre "Flash-cards", abre en la raíz sin la interfaz del navegador y usa el icono del tamaño adecuado

#### Scenario: Barra del navegador en oscuro
- **WHEN** el sistema del usuario prefiere el esquema oscuro
- **THEN** la barra del navegador toma el color del lienzo oscuro

### Requirement: Cualquier ruta profunda carga la app
El hosting SHALL servir primero los archivos estáticos existentes y, para cualquier otra ruta, responder con el documento principal de la app con estado 200, de modo que recargar o entrar directo a una URL interna funcione.

#### Scenario: Entrar directo a una ruta interna
- **WHEN** el usuario abre `/biblioteca/abc` escribiéndola en el navegador
- **THEN** el hosting entrega el documento principal y la app muestra esa pantalla

### Requirement: El hosting entrega cabeceras de seguridad en todas las respuestas
El hosting SHALL responder en toda ruta con: `X-Frame-Options: DENY` (la app no se embebe en marcos de terceros), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` y `Cross-Origin-Opener-Policy: same-origin-allow-popups`. Este último valor SHALL ser exactamente `same-origin-allow-popups` y no `same-origin`, porque el inicio de sesión con Google abre una ventana emergente que debe poder comunicarse de vuelta. El servidor de desarrollo SHALL enviar la misma cabecera de apertura de origen cruzado.

#### Scenario: Cabeceras en producción
- **WHEN** el navegador pide cualquier ruta de la app publicada
- **THEN** la respuesta incluye las cinco cabeceras con los valores indicados

#### Scenario: Login con Google
- **WHEN** el usuario inicia sesión con Google mediante la ventana emergente
- **THEN** la ventana puede devolver el resultado a la app y el inicio de sesión se completa

### Requirement: Configuración por entorno sin secretos en el código
El sistema SHALL tomar la configuración pública del proyecto en la nube (identificadores de proyecto y de app, dominio de autenticación, clave web) de un archivo de entorno versionado, con un archivo distinto para producción que el build de producción sustituye automáticamente. Esa configuración NO es un secreto: viaja al navegador y se protege con las reglas de acceso, no ocultándola. Los secretos reales de servidor (claves de servicios de pago, futuras) SHALL vivir en un archivo `.env` ignorado por git, y SHALL existir un `.env.example` versionado que documente las variables sin valores.

#### Scenario: Build de producción
- **WHEN** se construye la app para producción
- **THEN** se usa la configuración del entorno de producción sin cambios manuales en el código

#### Scenario: Clave de servicio
- **WHEN** en el futuro se necesite una clave de un servicio de pago
- **THEN** se declara en `.env.example` sin valor y se rellena en `.env`, que nunca se versiona

### Requirement: Todo documento que llega del almacén se valida antes de usarse
El sistema SHALL validar la forma de cada documento de perfil, libro, capítulo, tarjeta e indicadores diarios al leerlo, ANTES de convertirlo en un modelo de la app, transformando las marcas de tiempo del almacén en fechas. Un documento que no cumple SHALL producir un error explícito que hace fallar la operación completa de lectura (incluida la lista entera cuando el documento inválido forma parte de un listado); nunca se entrega un modelo a medio formar ni se omite el documento en silencio.

#### Scenario: Documento inválido en un listado
- **WHEN** una de las tarjetas de un capítulo tiene un campo obligatorio con tipo incorrecto
- **THEN** la lectura del capítulo falla con un error explícito y la pantalla muestra su estado de error, en vez de listar las demás tarjetas sin la inválida

#### Scenario: Documento válido
- **WHEN** todos los documentos cumplen la forma esperada
- **THEN** la lectura devuelve los modelos con fechas ya convertidas

### Requirement: Los campos añadidos después del lanzamiento se leen con valor por defecto
Para que los documentos creados antes de un cambio de esquema sigan siendo válidos, el sistema SHALL completar al leer: `learningSteps` de la programación a 0; `cardType` ausente se interpreta como tarjeta básica; `defaultNewCardsPerDay` del perfil al valor por defecto del producto; `autoGradeByTime` del perfil a activado; y, en los indicadores diarios, repasos completados a 0, conteos por calificación a ceros, nuevas introducidas por libro a vacío y repasos por libro a vacío. `cardCount` del libro y los campos sociales del perfil (`handle`, `photoURL`) SHALL ser opcionales.

#### Scenario: Tarjeta anterior a los pasos de aprendizaje
- **WHEN** se lee una tarjeta guardada sin `learningSteps`
- **THEN** se obtiene con `learningSteps = 0`, sin error

#### Scenario: Perfil antiguo
- **WHEN** se lee un perfil guardado sin `defaultNewCardsPerDay` ni `autoGradeByTime`
- **THEN** se obtiene con el valor por defecto de nuevas por día y la sugerencia por tiempo activada

#### Scenario: Indicadores dispersos
- **WHEN** el documento del día solo tiene `date` y `reviewsCompleted`
- **THEN** se obtiene con los demás contadores en cero o vacíos

### Requirement: El texto importado se valida línea a línea sin abortar
El sistema SHALL tratar el texto que el usuario importa como dato externo: se procesa línea a línea, las líneas válidas producen tarjetas y capítulos, y cada línea inválida se reporta con su número de línea (empezando en 1) y la razón. Ninguna línea inválida SHALL abortar la importación del resto.

#### Scenario: Línea sin separador
- **WHEN** el texto tiene una línea sin separador entre anverso y reverso entre otras válidas
- **THEN** las válidas se importan y la inválida aparece en el reporte con su número de línea

### Requirement: Las escrituras masivas se trocean en lotes de hasta 450 operaciones
El sistema SHALL agrupar las escrituras masivas (crear muchas tarjetas, borrar muchas tarjetas, importar un libro con sus capítulos y tarjetas) en lotes de como máximo 450 operaciones, dejando margen bajo el límite de 500 del almacén. Un lote SHALL aplicarse de forma atómica; una operación que necesita varios lotes SHALL confirmarlos en secuencia y NO es atómica en conjunto.

#### Scenario: Importación pequeña
- **WHEN** se importa un libro con 1 documento de libro, 5 capítulos y 300 tarjetas (306 operaciones)
- **THEN** todo se escribe en un único lote atómico

#### Scenario: Importación grande
- **WHEN** se importa un libro con 1 000 tarjetas
- **THEN** la escritura se reparte en varios lotes consecutivos de hasta 450 operaciones; si uno falla a mitad, los anteriores ya quedaron escritos

#### Scenario: Borrado masivo
- **WHEN** el usuario elimina 900 tarjetas de golpe
- **THEN** se ejecutan dos lotes de 450 operaciones cada uno
