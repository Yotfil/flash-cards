# Spec Delta

## MODIFIED Requirements

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
