# Spec Delta

## MODIFIED Requirements

### Requirement: La escritura del libro es consistente y por lotes, y al terminar lleva al libro
El sistema SHALL escribir los capítulos y las tarjetas en lotes de como máximo 450 escrituras y SHALL escribir el documento del libro en el último lote, de modo que el libro nunca aparezca en la Biblioteca a medias. Si un lote falla, el sistema SHALL intentar borrar todo lo que ya se había escrito, SHALL registrar el resultado de ese intento y SHALL mostrar "No se pudo importar el libro. Inténtalo de nuevo." conservando el nombre, la materia y el texto para reintentar. Si la escritura no confirma en unos 6 segundos (por ejemplo, con un wifi sin internet), la pantalla SHALL mostrar, sin quitar "Importando…", el aviso "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app." con rol de estado. Al terminar bien, el nuevo libro SHALL aparecer en la Biblioteca sin recargar y el usuario SHALL ser llevado a la pantalla del libro creado.

#### Scenario: Importación exitosa
- **WHEN** la escritura termina bien
- **THEN** el usuario ve la pantalla del libro nuevo y la Biblioteca lo lista

#### Scenario: Falla la escritura
- **WHEN** la escritura del libro falla
- **THEN** aparece el mensaje de error encima de los botones, el botón vuelve a estar disponible y el nombre, la materia y el texto siguen ahí

#### Scenario: Doble clic en importar
- **WHEN** el usuario pulsa "Importar N" dos veces seguidas
- **THEN** se crea un solo libro; mientras importa, el botón muestra "Importando…" y queda deshabilitado

#### Scenario: Falla a mitad en un libro grande
- **WHEN** se importan 1000 tarjetas y falla el segundo lote
- **THEN** no existe ningún libro nuevo, las tarjetas del primer lote se borran, y se muestra el mensaje de error con el texto intacto

#### Scenario: Importar un libro con un wifi sin internet
- **WHEN** el usuario importa un libro y pasan 6 segundos sin que la escritura confirme
- **THEN** la pantalla sigue en "Importando…" y muestra "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app."

### Requirement: La importación en un capítulo comunica su progreso y sus fallos
Mientras importa, el diálogo SHALL mostrar "Importando…" (o "Reemplazando…" en la confirmación de reemplazo), deshabilitar sus botones, ignorar reenvíos y bloquear el cierre con Escape. Si la importación no confirma en unos 6 segundos, el diálogo (y la confirmación de reemplazo, si es ella la que espera) SHALL mostrar "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app." y dejarse cerrar, como describe la spec de navegación. Si todo va bien, el diálogo SHALL cerrarse y las tarjetas nuevas SHALL aparecer en la lista sin recargar. Si falla, el diálogo SHALL permanecer abierto con el texto y mostrar dentro, encima de los botones, "No se pudieron importar las tarjetas. Inténtalo de nuevo."; el error de una confirmación de reemplazo SHALL mostrarse dentro de esa confirmación. Cancelar SHALL seguir disponible tras un fallo.

#### Scenario: Importación exitosa
- **WHEN** la creación de las tarjetas termina bien
- **THEN** el diálogo se cierra y las tarjetas se ven en el capítulo

#### Scenario: Falla la importación
- **WHEN** la escritura falla
- **THEN** el mensaje de error aparece dentro del diálogo, el diálogo sigue abierto con el texto pegado y el botón vuelve a estar disponible

#### Scenario: Importación que no confirma
- **WHEN** el usuario importa tarjetas en un capítulo con un wifi sin internet y pasan 6 segundos
- **THEN** el diálogo muestra "No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app." y "Cerrar" lo cierra

#### Scenario: Reemplazo que no confirma
- **WHEN** el usuario confirma un reemplazo con un wifi sin internet y pasan 6 segundos
- **THEN** la confirmación muestra el mismo aviso y se deja cerrar
