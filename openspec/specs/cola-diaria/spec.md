# Cola diaria Specification

## Purpose

Decide qué tarjetas estudia el usuario "hoy": todas las vencidas que le tocan más una tanda controlada de tarjetas nuevas, respetando los topes de cada libro y la frontera del día de estudio del usuario. Es el corazón de la pantalla Hoy y el punto de entrada a la sesión de repaso.

## Requirements

### Requirement: El día de estudio empieza a la hora configurada por el usuario, no a medianoche
El sistema SHALL identificar el "día de estudio" con una fecha `YYYY-MM-DD` calculada en la zona horaria del usuario (`timezone`) y desplazada por su hora de inicio (`dayStartHour`, por defecto 4). Todo lo que ocurra antes de esa hora pertenece al día anterior.

#### Scenario: Repaso de madrugada cuenta como el día anterior
- **WHEN** el usuario tiene `dayStartHour = 4` y califica una tarjeta a la 01:30 local del 15 de junio
- **THEN** el día de estudio es `2026-06-14`

#### Scenario: Después de la hora de inicio es el mismo día
- **WHEN** el usuario tiene `dayStartHour = 4` y califica a las 09:00 local del 15 de junio
- **THEN** el día de estudio es `2026-06-15`

#### Scenario: Respeta la zona horaria del usuario
- **WHEN** dos usuarios califican en el mismo instante UTC pero con `timezone` distintas que caen en fechas locales distintas
- **THEN** cada uno obtiene el día de estudio de su propia zona

### Requirement: El fin del día de estudio es el próximo instante en que el reloj local alcanza la hora de inicio
El sistema SHALL calcular el fin del día de estudio como el próximo momento en que la hora local del usuario llega a `dayStartHour`, y SHALL usarlo como tope para no adelantar tarjetas que vencen mañana.

#### Scenario: Ya pasó la hora de inicio
- **WHEN** son las 10:00 local y `dayStartHour = 4`
- **THEN** el fin del día es mañana a las 04:00 local

#### Scenario: Aún no llegó la hora de inicio
- **WHEN** son las 02:00 local y `dayStartHour = 4`
- **THEN** el fin del día es hoy a las 04:00 local

### Requirement: Las tarjetas vencidas entran todas, ordenadas por lo más atrasado
El sistema SHALL incluir en la cola toda tarjeta no suspendida cuyo estado no sea "nueva" y cuya fecha de vencimiento sea menor o igual al fin del día de estudio, ordenadas por fecha de vencimiento ascendente (las más atrasadas primero).

#### Scenario: Vencidas ordenadas por vencimiento
- **WHEN** hay tres tarjetas en repaso con vencimientos ayer, hace tres días y hoy
- **THEN** la cola las presenta en el orden: hace tres días, ayer, hoy

#### Scenario: Una tarjeta que vence mañana no entra
- **WHEN** una tarjeta en repaso vence después del fin del día de estudio
- **THEN** no aparece en la cola de hoy

### Requirement: Las vencidas se topan por libro al máximo de repasos diarios del libro
El sistema SHALL limitar las vencidas de cada libro a `maxReviewsPerDay` del libro menos los repasos ya completados hoy en ese libro, conservando las más atrasadas. Un valor `0` significa sin tope. Las tarjetas de un libro cuyos metadatos no estén disponibles pasan sin tope.

#### Scenario: Tope por libro conserva las más atrasadas
- **WHEN** un libro tiene `maxReviewsPerDay = 2` y cinco tarjetas vencidas
- **THEN** la cola incluye solo las dos con vencimiento más antiguo de ese libro

#### Scenario: Descuenta los repasos ya hechos hoy
- **WHEN** un libro tiene `maxReviewsPerDay = 10` y el usuario ya completó 8 repasos de ese libro hoy
- **THEN** la cola incluye como máximo 2 vencidas de ese libro

#### Scenario: Cero significa sin tope
- **WHEN** un libro tiene `maxReviewsPerDay = 0` y 300 tarjetas vencidas
- **THEN** la cola incluye las 300

### Requirement: Las tarjetas nuevas entran por libro hasta la tanda diaria, descontando las ya introducidas hoy
El sistema SHALL incluir, por cada libro, hasta `newCardsPerDay` tarjetas nuevas (estado "nueva") menos las que ya se introdujeron hoy en ese libro, eligiendo las más antiguas por fecha de creación. Las nuevas se presentan después de las vencidas.

#### Scenario: Respeta la tanda del libro
- **WHEN** un libro tiene `newCardsPerDay = 3` y 10 tarjetas nuevas
- **THEN** la cola incluye exactamente 3 nuevas de ese libro, las creadas primero

#### Scenario: Descuenta las introducidas hoy
- **WHEN** un libro tiene `newCardsPerDay = 5` y hoy ya se introdujeron 4 nuevas de ese libro
- **THEN** la cola incluye como máximo 1 nueva de ese libro

#### Scenario: Tanda agotada
- **WHEN** hoy ya se introdujeron tantas nuevas como `newCardsPerDay`
- **THEN** la cola no incluye nuevas de ese libro

#### Scenario: Vencidas antes que nuevas
- **WHEN** la cola tiene vencidas y nuevas
- **THEN** todas las vencidas se presentan antes que cualquier nueva

### Requirement: El usuario puede ajustar la cantidad de nuevas solo para la sesión de hoy
El sistema SHALL permitir al usuario indicar, desde Hoy, cuántas tarjetas nuevas de cada libro entran en la sesión de hoy. El control SHALL vivir plegado bajo el desglose por libro, bajo el rótulo "Ajustar nuevas de hoy", con la aclaración "Solo para la sesión de hoy. Tus libros no cambian.", y SHALL ofrecer un control por cada libro que tenga tarjetas nuevas disponibles, con el número actual, su máximo elegible ("de N") y acciones para bajar y subir de uno en uno. Cada libro SHALL arrancar en el número que le dio la cola base (su tanda menos las ya introducidas hoy) y SHALL poder moverse entre 0 y sus nuevas disponibles. El ajuste de un libro NUNCA SHALL tomar tarjetas nuevas de otro libro ni alterar el de otro libro. Un libro con nuevas pero sin nuevas disponibles SHALL aparecer en el control con el texto "sin nuevas", sin acciones. El ajuste NO SHALL cambiar el `newCardsPerDay` de ningún libro. La cola, el bloque principal y la fila del libro SHALL recalcularse al instante a partir de las tarjetas ya cargadas, sin volver a consultar. El ajuste SHALL pertenecer al día de estudio en curso: navegar dentro de la app (Progreso, Biblioteca, volver de una sesión) NO SHALL restablecerlo; al cambiar el día de estudio SHALL descartarse; no se conserva entre recargas de la aplicación.

#### Scenario: Empujar más nuevas que el tope
- **WHEN** el libro "Inglés" tiene `newCardsPerDay = 5`, 20 nuevas disponibles y la cola base le dio 5, y el usuario sube su control a 11
- **THEN** la cola incluye 11 nuevas de "Inglés", las más antiguas de ese libro, y los demás libros no cambian

#### Scenario: Un libro no toma nuevas de otro
- **WHEN** "Inglés" tiene 20 nuevas disponibles y "Medicina" 12, y el usuario sube "Medicina" hasta su máximo
- **THEN** el control de "Medicina" se detiene en 12 y la cola no incluye ninguna nueva adicional de "Inglés"

#### Scenario: Cero nuevas para hoy
- **WHEN** el usuario baja a 0 el control de todos los libros
- **THEN** la cola contiene únicamente vencidas

#### Scenario: Libro sin nuevas disponibles
- **WHEN** un libro ya introdujo hoy todas sus nuevas o no tiene tarjetas nuevas
- **THEN** su entrada en el control muestra "sin nuevas" y no ofrece acciones

#### Scenario: El ajuste no toca la configuración
- **WHEN** el usuario cambia el número de nuevas de la sesión de cualquier libro
- **THEN** el `newCardsPerDay` de cada libro permanece igual

#### Scenario: Recalcular sin volver a consultar
- **WHEN** el usuario cambia el número de nuevas de un libro
- **THEN** el bloque principal y la fila de ese libro cambian al instante sin ninguna lectura nueva del almacén

#### Scenario: El ajuste sobrevive a la navegación
- **WHEN** el usuario sube las nuevas de "Inglés" a 11, visita Progreso y vuelve a Hoy el mismo día de estudio
- **THEN** Hoy sigue mostrando 11 nuevas de "Inglés" y Progreso mostró los pendientes de la cola base

#### Scenario: El ajuste caduca con el día
- **WHEN** el usuario ajustó las nuevas ayer y abre Hoy en un nuevo día de estudio
- **THEN** cada libro vuelve al número que le da la cola base de hoy

### Requirement: La cola muestra un desglose por libro
El sistema SHALL informar, bajo el título "Por libro", para cada libro con tarjetas en la cola, una fila con su nombre en una sola línea, una línea de detalle con cuántas vencidas y cuántas nuevas aporta, y el total de la fila, en el orden en que los libros aparecen en la biblioteca. La línea de detalle SHALL decir "N por repasar, M nuevas" y SHALL omitir la parte que sea cero ("3 por repasar"; "8 nuevas"), con singulares "1 por repasar" y "1 nueva". El total y las nuevas de la fila SHALL reflejar el ajuste de nuevas de la sesión de ese libro. Toda la fila SHALL ser tocable y llevar al detalle del libro. Los libros sin pendientes no aparecen en el desglose, y el título "Por libro" solo aparece cuando hay al menos una fila.

#### Scenario: Desglose ordenado
- **WHEN** dos libros aportan tarjetas y un tercero no
- **THEN** el desglose lista los dos libros con sus conteos, en el orden de la biblioteca, y omite el tercero

#### Scenario: Fila con vencidas y nuevas
- **WHEN** un libro aporta 10 vencidas y 8 nuevas
- **THEN** su fila muestra "10 por repasar, 8 nuevas" y el total 18

#### Scenario: Fila sin nuevas
- **WHEN** un libro aporta 3 vencidas y ninguna nueva
- **THEN** su fila muestra "3 por repasar" y el total 3

#### Scenario: Fila sin vencidas
- **WHEN** un libro aporta 1 nueva y ninguna vencida
- **THEN** su fila muestra "1 nueva" y el total 1

#### Scenario: Fila con el ajuste aplicado
- **WHEN** el usuario sube las nuevas de la sesión de un libro de 8 a 12
- **THEN** su fila pasa a "10 por repasar, 12 nuevas" con total 22 al instante

#### Scenario: Tocar una fila
- **WHEN** el usuario toca la fila de un libro
- **THEN** la app navega al detalle de ese libro

### Requirement: Estudiar un libro o capítulo concreto ignora los topes diarios
El sistema SHALL permitir iniciar una sesión sobre un libro o un capítulo específico que incluya todas sus tarjetas listas sin aplicar `newCardsPerDay` ni `maxReviewsPerDay`. "Lista" SHALL significar lo mismo en todas las entradas: tarjeta no suspendida, nueva o con vencimiento menor o igual al fin del día de estudio; las que no están listas quedan fuera. Las tarjetas SHALL ir en el mismo orden que en la cola de Hoy: vencidas por vencimiento ascendente y después nuevas por fecha de creación. Al pulsar el botón, este SHALL quedar deshabilitado mostrando "Preparando…" y un segundo toque SHALL ignorarse. Si hay al menos una tarjeta lista, la app SHALL navegar a la pantalla de repaso con esa lista; si no hay ninguna, SHALL mostrar el aviso de "al día" definido por la spec del libro o del capítulo, sin salir. Si la preparación falla, SHALL mostrarse un error con "Reintentar" y NUNCA el aviso de "al día".

#### Scenario: Estudiar un libro con backlog
- **WHEN** un libro tiene 40 vencidas, 15 nuevas y `maxReviewsPerDay = 10`
- **THEN** la sesión del libro incluye las 55 tarjetas listas

#### Scenario: Misma definición que Hoy
- **WHEN** el usuario termina la sesión de Hoy y entra al único libro que todavía aparece con pendientes en Hoy
- **THEN** "Estudiar este libro" abre una sesión con exactamente esas tarjetas, sin decir que está al día

#### Scenario: Vence más tarde hoy
- **WHEN** una tarjeta del libro vence dentro de dos horas, antes del fin del día de estudio
- **THEN** entra en la sesión del libro

#### Scenario: Nada listo
- **WHEN** un capítulo no tiene tarjetas vencidas ni nuevas
- **THEN** el sistema informa que no hay nada que estudiar y no inicia la sesión

#### Scenario: Falla la preparación
- **WHEN** la lectura de las tarjetas listas del libro falla al pulsar "Estudiar este libro"
- **THEN** el detalle muestra un error con "Reintentar" y no dice que está al día

#### Scenario: Doble toque
- **WHEN** el usuario pulsa dos veces seguidas "Estudiar este capítulo"
- **THEN** solo se prepara una sesión y el botón muestra "Preparando…" deshabilitado mientras tanto

### Requirement: La pantalla Hoy refleja el estado de la cola de forma honesta
El sistema SHALL armar la cola al entrar a Hoy y cada vez que se vuelve a ella, y SHALL mostrar: mientras arma la cola, un esqueleto con la silueta del bloque principal y de dos filas, marcado como ocupado y sin botón; si la carga falla, el estado de error "No pudimos cargar tu cola de hoy" con "Reintentar", nunca una cola vacía fingida; si el usuario no tiene libros, un vacío de bienvenida con "Te damos la bienvenida a Cadence", "Crea o importa tu primer libro para empezar a estudiar." y la acción "Ir a la Biblioteca", sin bloque principal; si tiene libros pero nada pendiente ni nuevas disponibles, el bloque principal asentado (sin luz en movimiento, borde fijo) con "Estás al día" y "Nada pendiente por ahora. Vuelve mañana o estudia un libro.", sin botón de empezar y con el enlace "Crear o importar un libro"; si hay tarjetas, el bloque principal con "N tarjetas" ("1 tarjeta"), "Listas para repasar hoy", el botón "Estudiar ahora" y una luz que recorre el borde mientras haya pendientes, seguido del desglose. Si el usuario deja la cola en cero bajando las nuevas de todos los libros y no hay vencidas, el bloque SHALL mostrar "0 tarjetas" con el botón deshabilitado, no el estado "al día". Al pulsar "Estudiar ahora", el botón SHALL mostrar "Preparando…" deshabilitado, ignorar un segundo toque y navegar a la pantalla de repaso con la cola; si la preparación falla, SHALL mostrar un error con "Reintentar". Si el día de estudio cambia mientras Hoy está abierta, la siguiente interacción SHALL volver a armar la cola. Bajo el título "Hoy" SHALL mostrarse la fecha local del usuario en su zona horaria ("Viernes, 24 de octubre"), no la fecha del día de estudio.

#### Scenario: Cargando
- **WHEN** Hoy está armando la cola
- **THEN** se muestra el esqueleto marcado como ocupado y ningún botón

#### Scenario: Falla la carga
- **WHEN** la lectura de tarjetas o de estadísticas del día falla
- **THEN** Hoy muestra "No pudimos cargar tu cola de hoy" con "Reintentar", en vez de fingir una cola vacía

#### Scenario: Sin libros
- **WHEN** el usuario no tiene ningún libro
- **THEN** Hoy muestra "Te damos la bienvenida a Cadence", la frase que invita a crear o importar el primer libro y la acción "Ir a la Biblioteca", sin bloque principal ni racha

#### Scenario: Cola vacía
- **WHEN** el usuario tiene libros pero no hay vencidas ni nuevas disponibles
- **THEN** Hoy muestra el bloque asentado con "Estás al día", sin botón de empezar, con la racha si la hay y el enlace "Crear o importar un libro"

#### Scenario: Con tarjetas
- **WHEN** la cola tiene 21 tarjetas
- **THEN** el bloque principal muestra "21 tarjetas", "Listas para repasar hoy", "Estudiar ahora" y la luz del borde en movimiento

#### Scenario: Una tarjeta
- **WHEN** la cola tiene exactamente una tarjeta
- **THEN** el bloque principal muestra "1 tarjeta"

#### Scenario: Cero nuevas elegidas sin vencidas
- **WHEN** no hay vencidas, hay nuevas disponibles y el usuario baja a 0 las nuevas de todos los libros
- **THEN** el bloque muestra "0 tarjetas" con "Estudiar ahora" deshabilitado, y no el estado "al día"

#### Scenario: Preparando la sesión
- **WHEN** el usuario pulsa "Estudiar ahora" dos veces seguidas
- **THEN** solo se prepara una sesión, el botón muestra "Preparando…" deshabilitado y la app navega a la pantalla de repaso

#### Scenario: Vuelve de una sesión
- **WHEN** el usuario termina una sesión y regresa a Hoy
- **THEN** la cola se vuelve a armar con lo que queda pendiente

#### Scenario: Cambia el día de estudio
- **WHEN** Hoy quedó abierta y el reloj local alcanza la hora de inicio del día
- **THEN** la siguiente interacción vuelve a armar la cola del nuevo día de estudio

#### Scenario: Fecha del subtítulo
- **WHEN** son las 01:30 del miércoles 22 de octubre en la zona del usuario con `dayStartHour = 4`
- **THEN** el subtítulo dice "Miércoles, 22 de octubre" aunque el día de estudio sea el 21

#### Scenario: Reducir movimiento
- **WHEN** el usuario tiene activada la preferencia de reducir movimiento
- **THEN** la luz del borde no se mueve y el bloque principal se ve con el borde fijo

### Requirement: Hoy muestra la racha de días de estudio
El sistema SHALL mostrar en Hoy, de forma discreta junto al título, la racha de días de estudio consecutivos. Un día cuenta para la racha cuando en su día de estudio se registró al menos un repaso de cualquier libro (introducir una tarjeta nueva también cuenta); no exige completar la cola ni tocar todos los libros. La racha SHALL contarse hacia atrás empezando por hoy si hoy ya se estudió, o por ayer si todavía no: no haber estudiado aún hoy NO la rompe. La racha SHALL calcularse al vuelo a partir de los indicadores diarios ya existentes, sin guardar ningún dato nuevo, mirando como máximo los últimos 60 días de estudio; si todos cuentan, SHALL mostrarse "60+ días seguidos". Con racha cero NO SHALL mostrarse nada; con uno, "1 día"; con N, "N días seguidos". Si la lectura de la racha falla, Hoy SHALL omitirla y registrar el fallo, sin afectar a la cola. La racha SHALL mostrarse también cuando el usuario está al día, y NO SHALL mostrarse cuando no tiene libros.

#### Scenario: Racha en curso
- **WHEN** el usuario estudió al menos una tarjeta cada uno de los últimos seis días de estudio, incluido hoy
- **THEN** Hoy muestra "6 días seguidos"

#### Scenario: Hoy todavía no se ha estudiado
- **WHEN** el usuario estudió los cinco días de estudio anteriores y hoy aún no ha calificado ninguna tarjeta
- **THEN** Hoy muestra "5 días seguidos"

#### Scenario: Un día sin estudiar la rompe
- **WHEN** el usuario estudió anteayer pero no ayer ni hoy
- **THEN** Hoy no muestra ninguna racha

#### Scenario: Una sola tarjeta basta
- **WHEN** el usuario tiene cien libros y ayer calificó una única tarjeta de un capítulo de uno de ellos
- **THEN** ayer cuenta como día de racha

#### Scenario: Primer día
- **WHEN** el usuario calificó hoy su primera tarjeta y no hay días anteriores con repasos
- **THEN** Hoy muestra "1 día"

#### Scenario: Racha larga
- **WHEN** los últimos 60 días de estudio tienen repasos
- **THEN** Hoy muestra "60+ días seguidos"

#### Scenario: Falla la lectura de la racha
- **WHEN** la lectura de los indicadores diarios para la racha falla y la cola carga bien
- **THEN** Hoy muestra la cola con normalidad, sin racha y sin mensaje de error por ella

### Requirement: El detalle de un libro muestra cuántas tarjetas listas tiene cada capítulo
El sistema SHALL mostrar en cada fila de capítulo del detalle del libro, junto al número de tarjetas, cuántas de sus tarjetas están listas según la definición de la cola diaria (no suspendidas, nuevas o con vencimiento menor o igual al fin del día de estudio), sin aplicar los topes diarios del libro, de modo que el número coincida con lo que abre "Estudiar este capítulo". Con una o más listas la línea SHALL decir "N listas" ("1 lista" en singular); con ninguna, "al día". Mientras las tarjetas listas del libro se cargan, o si su lectura falla, la fila NO SHALL mostrar esa línea ni un error. Sin conexión, la línea SHALL mostrar lo que haya disponible en el dispositivo.

#### Scenario: Capítulo con listas
- **WHEN** un capítulo tiene 60 tarjetas, de las que 22 están listas
- **THEN** su fila muestra "22 listas"

#### Scenario: Capítulo al día
- **WHEN** ningún capítulo de un libro tiene tarjetas listas salvo uno
- **THEN** las filas de los demás muestran "al día"

#### Scenario: Los topes no afectan al conteo del capítulo
- **WHEN** un libro tiene `maxReviewsPerDay = 10`, y un capítulo suyo tiene 63 tarjetas listas
- **THEN** la fila del capítulo muestra "63 listas" aunque Hoy incluya solo 10 vencidas de ese libro

#### Scenario: Conteo de listas no disponible
- **WHEN** la lectura de las tarjetas listas del libro falla
- **THEN** las filas muestran su número de tarjetas sin la línea de listas y sin ningún aviso de error en las filas

### Requirement: Sin conexión, Hoy y estudiar siguen funcionando con los datos del dispositivo
El sistema SHALL armar la cola de Hoy, el desglose, el conteo de listas por capítulo y las sesiones de libro o capítulo sin conexión, a partir de las tarjetas y los indicadores que el dispositivo ya tenga guardados. Sin conexión, Hoy NO SHALL mostrar un estado de error por falta de red.

#### Scenario: Abrir Hoy sin red
- **WHEN** el usuario abre Hoy sin conexión tras haber usado la app con conexión
- **THEN** Hoy muestra la cola armada con las tarjetas guardadas en el dispositivo y el botón para empezar

#### Scenario: Estudiar un capítulo sin red
- **WHEN** el usuario pulsa "Estudiar este capítulo" sin conexión y el capítulo tiene tarjetas listas en el dispositivo
- **THEN** la sesión se prepara con esas tarjetas y la app navega a la pantalla de repaso
