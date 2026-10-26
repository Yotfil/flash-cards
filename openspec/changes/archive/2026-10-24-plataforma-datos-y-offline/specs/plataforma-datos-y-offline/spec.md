# Spec Delta

## MODIFIED Requirements

### Requirement: La app es instalable como PWA en español
El sistema SHALL publicar un manifiesto con nombre y nombre corto "Cadence", descripción, idioma `es`, dirección de texto izquierda-derecha, modo de presentación `standalone`, alcance y URL de inicio en la raíz, color de tema y de fondo iguales al lienzo oscuro, y ocho iconos PNG (72, 96, 128, 144, 152, 192, 384 y 512 píxeles) válidos tanto enmascarables como normales. El documento SHALL declarar además los metadatos para instalación en iOS (capaz de app web, título "Cadence", barra de estado translúcida, icono táctil de 192 píxeles), un favicon vectorial y el color de la barra del navegador coherente con el tema: el lienzo claro bajo preferencia clara y el lienzo oscuro bajo preferencia oscura.

#### Scenario: Instalación
- **WHEN** el usuario instala la app desde el navegador
- **THEN** se instala con el nombre "Cadence", abre en la raíz sin la interfaz del navegador y usa el icono del tamaño adecuado

#### Scenario: Barra del navegador en oscuro
- **WHEN** el sistema del usuario prefiere el esquema oscuro
- **THEN** la barra del navegador toma el color del lienzo oscuro

#### Scenario: Barra del navegador en claro
- **WHEN** el sistema del usuario prefiere el esquema claro
- **THEN** la barra del navegador toma el color del lienzo claro

### Requirement: Configuración por entorno sin secretos en el código
El sistema SHALL tomar la configuración pública del proyecto en la nube (identificadores de proyecto y de app, dominio de autenticación, clave web) de un archivo de entorno versionado, con un archivo distinto para producción que el build de producción sustituye automáticamente. Esa configuración NO es un secreto: viaja al navegador y se protege con las reglas de acceso, no ocultándola. En desarrollo el sistema SHALL conectarse a emuladores locales del almacén y de la autenticación bajo un identificador de proyecto de demostración que no corresponde a ningún proyecto real, de modo que nada de lo que se haga en desarrollo toque datos de la nube; en producción SHALL conectarse al proyecto real. Los secretos reales de servidor (claves de servicios de pago, futuras) SHALL vivir en un archivo `.env` ignorado por git, y SHALL existir un `.env.example` versionado que documente las variables sin valores.

#### Scenario: Build de producción
- **WHEN** se construye la app para producción
- **THEN** se usa la configuración del entorno de producción, sin emuladores, sin cambios manuales en el código

#### Scenario: Desarrollo local
- **WHEN** la app corre en modo desarrollo
- **THEN** lee y escribe en los emuladores locales del almacén y de la autenticación, bajo el proyecto de demostración, y nunca en el proyecto de la nube

#### Scenario: Clave de servicio
- **WHEN** en el futuro se necesite una clave de un servicio de pago
- **THEN** se declara en `.env.example` sin valor y se rellena en `.env`, que nunca se versiona

### Requirement: Todo documento que llega del almacén se valida antes de usarse
El sistema SHALL validar la forma de cada documento de perfil, libro, capítulo, tarjeta e indicadores diarios al leerlo, ANTES de convertirlo en un modelo de la app, transformando las marcas de tiempo del almacén en fechas. Un documento que no cumple SHALL producir un error explícito que hace fallar la operación completa de lectura (incluida la lista entera cuando el documento inválido forma parte de un listado); nunca se entrega un modelo a medio formar ni se omite el documento en silencio. Ese error SHALL identificar la ruta del documento rechazado y la razón del rechazo (qué campo y qué se esperaba), y SHALL quedar registrado en el registro de errores de la app.

#### Scenario: Documento inválido en un listado
- **WHEN** una de las tarjetas de un capítulo tiene un campo obligatorio con tipo incorrecto
- **THEN** la lectura del capítulo falla con un error explícito y la pantalla muestra su estado de error, en vez de listar las demás tarjetas sin la inválida

#### Scenario: Documento válido
- **WHEN** todos los documentos cumplen la forma esperada
- **THEN** la lectura devuelve los modelos con fechas ya convertidas

#### Scenario: Error con contexto
- **WHEN** un documento es rechazado por la validación
- **THEN** el error nombra la ruta del documento y el campo que no cumple, y queda registrado

### Requirement: Las escrituras masivas se trocean en lotes de hasta 450 operaciones
El sistema SHALL agrupar las escrituras masivas (crear muchas tarjetas, borrar muchas tarjetas, importar un libro con sus capítulos y tarjetas) en lotes de como máximo 450 operaciones, dejando margen bajo el límite de 500 del almacén. Un lote SHALL aplicarse de forma atómica; una operación que necesita varios lotes SHALL confirmarlos en secuencia y NO es atómica en conjunto. Si un lote falla, el sistema SHALL informar qué documentos quedaron escritos en los lotes anteriores, para que la operación que lo pidió pueda deshacerlos. Al importar un libro, el documento del libro SHALL escribirse en el último lote, y si un lote falla el sistema SHALL intentar borrar lo ya escrito e informar al usuario; en ningún caso aparece en la biblioteca un libro importado a medias.

#### Scenario: Importación pequeña
- **WHEN** se importa un libro con 1 documento de libro, 5 capítulos y 300 tarjetas (306 operaciones)
- **THEN** todo se escribe en un único lote atómico

#### Scenario: Importación grande
- **WHEN** se importa un libro con 1 000 tarjetas
- **THEN** la escritura se reparte en varios lotes consecutivos de hasta 450 operaciones, con el documento del libro en el último

#### Scenario: Lote que falla a mitad
- **WHEN** falla el segundo lote de una importación de varios lotes
- **THEN** se informa qué quedó escrito en el primero, se intenta borrarlo, el libro no aparece en la biblioteca y el usuario ve un error que lo explica

#### Scenario: Borrado masivo
- **WHEN** el usuario elimina 900 tarjetas de golpe
- **THEN** se ejecutan dos lotes de 450 operaciones cada uno
