# Proposal

## Why

El repaso y la práctica con IA avanzan sin esperar al servidor y, si este rechaza una nota, la devuelven al final de la cola para calificarla otra vez. Sirve para un fallo pasajero, no para uno permanente: si al usuario le retiraron el acceso (`permission-denied`), cada nota vuelve a rechazarse y la sesión acumula avisos sin terminar; si la tarjeta se borró en otro dispositivo (`not-found`), vuelve una tarjeta que ya no existe. La revisión lo agrupó como tema transversal ("rechazos permanentes en una sesión optimista", con IA-02, que ya cerró el caso del paquete borrado). Además, el detalle de un paquete dice "Para hoy" en los ítems que ya se calificaron hoy (IA-05). El usuario decidió los dos puntos el 2026-10-26 (decisiones 22 y 23).

## What Changes

- **Acceso retirado (dec. 22).** Si el servidor niega el permiso al guardar una nota del repaso o de la práctica con IA, la sesión se cierra (también con el cierre ya visible) con "Ya no tienes acceso" y "Lo que calificaste antes quedó guardado.", y el botón "Continuar" deja la sesión de la app en "sin acceso" y lleva a esa pantalla.
- **Tarjeta borrada (dec. 22).** Si el servidor rechaza la nota del repaso porque la tarjeta ya no existe, la tarjeta no vuelve a la cola: sale de la sesión, no cuenta en el desglose ni entre las difíciles, y el aviso dice "La tarjeta «…» se borró en otro dispositivo; su calificación no se guardó.". Con el cierre visible, no se cuenta entre las que "siguen pendientes".
- **Fallos pasajeros (dec. 22).** Siguen como hoy: la tarjeta o el ítem vuelven al final con el aviso de siempre.
- **IA-05 (dec. 23).** En el detalle de un paquete, cada ítem del día ya calificado hoy muestra su nota ("Otra vez · hoy"); "Para hoy" queda solo en los que faltan.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sesion-de-repaso`: rechazos permanentes (tarjeta borrada, acceso retirado) distintos de los pasajeros.
- `practica-con-ia`: acceso retirado durante la práctica; la nota de hoy en el detalle del paquete.
- `autenticacion-y-acceso`: la sesión pasa a "sin acceso" también con la app abierta, cuando el servidor niega el permiso.

## Impact

- Dominio: `AccessRevokedError` (modelo) y `CardGoneError` (junto al puerto de guardado de notas).
- Infraestructura: el adaptador de notas y el repositorio de paquetes traducen `permission-denied` y `not-found`; `hasFirestoreCode` pasa a un módulo propio (segundo uso).
- Servicios: estados puros del repaso (`dropGoneCard`, `closeForLostAccess`) y de la práctica (`closeBecauseAccessIsLost`); `ReviewSessionService`, `PracticeAiSessionService`; `SessionService.markAccessRevoked`.
- UI: pantallas de repaso y de práctica (estado "sin acceso"), aviso de tarjeta borrada, etiqueta de los ítems del detalle; copy compartido del aviso.
- Sin cambios de datos, reglas ni lecturas.

## Fuera de alcance

- Lecturas rechazadas por permisos fuera de una sesión (Hoy, Biblioteca): siguen con su estado de error.
- Volver a comprobar la lista de acceso antes de pasar a "sin acceso": un rechazo de permisos solo puede venir de ahí, y al recargar la app la lista se consulta de nuevo.
- La práctica (quiz), que no escribe nada.
