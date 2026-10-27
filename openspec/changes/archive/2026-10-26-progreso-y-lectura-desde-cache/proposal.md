# Proposal

## Why

Cada pantalla vuelve a pedir sus datos al servidor en cada entrada (libros, paquetes, cola de Hoy, capítulos, tarjetas) y Progreso además relee la racha, que no muestra, y repite los tres conteos agregados de la colección en cada visita y cada vez que vuelve la red (hallazgo PR-02 de la revisión 1.0.0; medido por el usuario el 2026-10-26 en producción). La caché local persistente ya guarda todo lo leído, pero la app no la usa para pintar: espera siempre al servidor. En el móvil, eso se nota como una espera con esqueleto en cada pantalla aunque el dispositivo ya tenga los datos.

## What Changes

- **Progreso no relee la racha** (que no muestra) al entrar; la racha solo se relee al entrar a Hoy.
- **El conteo de la colección se hace una vez y se guarda en memoria** mientras la app está abierta. Se repite solo si desde este dispositivo cambió la colección (se calificó, creó, importó, reemplazó o borró alguna tarjeta, capítulo o libro), al tocar "Reintentar" o si todavía no hay un conteo cuando vuelve la red estando Progreso abierta. Ya no se recuenta en cada visita ni en cada reconexión desde otra pantalla.
- **Las pantallas pintan primero lo que el dispositivo ya tiene y se actualizan cuando llega la lectura del servidor** (libros, paquetes, cola e indicadores de Hoy, capítulos y tarjetas). El esqueleto aparece solo cuando el dispositivo no tiene nada guardado de esa lectura. Si la lectura del servidor falla mientras ya se muestra lo guardado, el contenido se queda (como sin red) y el fallo se registra; el estado de error con "Reintentar" solo se muestra cuando no había nada que pintar.
- La decisión de **qué tan fresco** se ve lo creado en otro dispositivo no cambia: cada entrada sigue consultando al servidor (PR-01). Solo cambia *cuándo* se pinta.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `progreso`: el requisito "Una sola carga de tarjetas y del contador del día por visita" pasa a decir que la racha no se lee para Progreso y que el conteo de la colección se reutiliza entre visitas mientras la colección no cambie desde este dispositivo; "Sin conexión, Progreso muestra el día y omite la colección" precisa que al volver la red solo se pide el conteo si no hay uno en memoria.
- `navegacion-y-shell`: el requisito "Las pantallas cargan sus datos con un recurso de estado explícito" gana la regla transversal "lo guardado en el dispositivo se pinta primero y se actualiza al llegar la lectura; el esqueleto solo cuando no hay nada guardado; un fallo con contenido guardado a la vista no lo reemplaza por el error".

## Impact

- Servicios: cola diaria (refresco sin racha), progreso (conteo en memoria con invalidación), libros, paquetes, capítulos y tarjetas (lectura en dos fases: dispositivo y servidor), más un aviso de "la colección cambió" desde los servicios que escriben tarjetas (tarjetas, capítulos, libros, importación, sesión de repaso).
- Puertos y adaptadores: las lecturas de lista aceptan de dónde leer (dispositivo o servidor); el adaptador de Firestore usa la lectura desde caché que ya ofrece el SDK. Los fakes de pruebas ganan una lista "guardada en el dispositivo" aparte de la del servidor.
- UI: sin componentes nuevos. Las páginas no cambian de plantilla; solo dejan de ver el esqueleto cuando hay datos guardados.
- Specs: deltas en `progreso` y `navegacion-y-shell`. Sin cambios de datos ni de reglas de seguridad.

## Fuera de alcance

- Listas en memoria con caducidad (dejar de consultar al servidor al navegar) y escuchas en vivo: cambian la frescura entre dispositivos y van a un explore propio (opciones B y D de la sesión del 2026-10-26).
- Leer las nuevas por libro con límite (IM-12): espera a la medición de lecturas en la consola.
- Cachear datos en el service worker: no aplica a datos por usuario.
