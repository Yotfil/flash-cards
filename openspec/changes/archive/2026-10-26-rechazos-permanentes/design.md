# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado en la rama única (`b6a55f1`), verificado el 2026-10-26:

- `services/review/review-session.service.ts`: cualquier rechazo de `persistGrade` va a `rejectSaved`, que reencola la tarjeta con el aviso "No se guardó…" (o la cuenta como pendiente con el cierre visible). No mira por qué se rechazó.
- `infrastructure/firestore/grade-persistence.firestore.ts`: relanza el error del SDK tal cual. Un `update` sobre una tarjeta borrada falla con `not-found`; sin entrada en la lista de acceso, las reglas niegan con `permission-denied` (`firestore.rules`, `isAllowlisted`).
- `services/practice-ai/practice-ai-session.service.ts`: distingue `PracticePackageGoneError` (cierra con "Este paquete ya no existe", IA-02) y reencola el resto; `permission-denied` quedó "para el tema transversal".
- `infrastructure/firestore/practice-package.repository.firestore.ts`: `recordGrade` traduce `not-found` con un `hasFirestoreCode` privado.
- `SessionService` solo pasa a `noAccess` al resolver una identidad (arranque, entrar, registrarse).
- **IA-05 abierto:** `package-detail-page.component.ts` pone `forToday` a todo ítem del conjunto de hoy, aunque ya tenga `lastPracticedDayId` de hoy.

## Goals / Non-Goals

**Goals:**
- Que el dominio nombre los dos rechazos permanentes y la infraestructura los traduzca: los servicios deciden sin conocer códigos de Firestore.
- Toda la decisión en los núcleos puros de cada sesión, probada sin pantalla; las páginas solo pintan el estado nuevo.

**Non-Goals:**
- Lecturas rechazadas fuera de una sesión; volver a consultar la lista antes de pasar a "sin acceso".
- Cambiar los fallos pasajeros.

## Decisions

### D1. Dos errores de dominio y una traducción por adaptador
- `AccessRevokedError` en `domain/models/access-revoked-error.ts` (lo lanzan dos adaptadores y lo leen dos servicios).
- `CardGoneError(cardId)` junto a `GradePersistencePort`, como `PracticePackageGoneError` junto al suyo; el contrato del puerto dice cuándo se lanza cada uno.
- `hasFirestoreCode` sale a `infrastructure/firestore/firestore-error-code.ts` (segundo uso). `FirestoreGradePersistence.persistGrade` traduce `not-found` → `CardGoneError` y `permission-denied` → `AccessRevokedError`; `recordGrade` de paquetes añade `permission-denied` → `AccessRevokedError`. Lo demás se relanza igual.

### D2. Núcleo del repaso: `dropGoneCard` y `closeForLostAccess` (servicio puro)
`SessionState.status` gana `'accessLost'`; `alerts` gana `kind: 'failed' | 'gone'`.
- `dropGoneCard(state, appearanceId, now, preview)`: como `rejectSaved` deshace la calificación (en vuelo, desglose, difíciles), pero quita de la cola **todas** las apariciones de esa tarjeta, la marca como salida y deja (sin duplicar) el aviso `gone`. Si la aparición quitada era la actual, prepara la siguiente con `showNext` (sin revelar, relojes a cero) o termina. Con el cierre visible solo deshace (no suma a `rejectedAfterFinish`: no queda pendiente). **Decidido por Claude.**
- `closeForLostAccess(state)`: `status: 'accessLost'`, sin revelar, sin previsualizaciones ni sugerencia, desde activa o terminada. `rejectSaved`, `confirmSaved` y `dropGoneCard` no cambian un estado `accessLost` (los resultados tardíos de otras notas no lo reabren).
- `ReviewSessionService`: el manejador del rechazo elige por la clase del error; `applyToSession` emite `ended` (`finished`) si un cambio tardío termina la sesión (una tarjeta borrada era la última). `acknowledgeLostAccess()` vacía la sesión y llama a `SessionService.markAccessRevoked()`.

### D3. Núcleo de la práctica: `closeBecauseAccessIsLost` (servicio puro)
`PracticeAiSessionState.status` gana `'accessLost'`; desde `active` o `finished` pasa a `accessLost` (desde `gone` se queda). `requeueRejected` y `closeBecausePackageIsGone` no tocan un `accessLost`. `PracticeAiSessionService` lo elige con `instanceof AccessRevokedError` y expone `acknowledgeLostAccess()` como el repaso.

### D4. `SessionService.markAccessRevoked()`
Si hay sesión activa, la deja en `{ kind: 'noAccess', email: user.email }`, como la comprobación del arranque; sin sesión activa no hace nada. La identidad se conserva (el usuario puede cerrar sesión desde `/sin-acceso`). `FakeSessionService` lo imita.

### D5. Pantallas: el estado "sin acceso" (UI)
Repaso y práctica añaden `@case ('accessLost')`: un `app-empty-state` dentro de un contenedor con `role="alert"`, título "Ya no tienes acceso", mensaje "Lo que calificaste antes quedó guardado." y el botón "Continuar" (acción principal, `bg-accent`), que llama a `acknowledgeLostAccess()` y navega a `/sin-acceso` con `replaceUrl` (el repaso no queda en el historial). Copy compartido en `@shared/text/access-lost.copy.ts` (lo usan dos features). El aviso de tarjeta borrada va en la misma lista de alertas del repaso, con `cardGoneMessage(front)` en `repaso.copy.ts`.

### D6. IA-05: la nota de hoy antes que "Para hoy" (UI)
En `items` del detalle: si el ítem tiene `lastPracticedDayId === hoy` y `lastGrade`, `lastGradeLabel(...)` ("Otra vez · hoy"), esté o no en el conjunto; si no y está en el conjunto, "Para hoy"; si no, la última nota. Se reordena la condición, sin cambiar textos.

### Superficies (ADR 0003)
Sin superficies nuevas: el aviso usa `app-empty-state` (sin acrílico) sobre el fondo de la pantalla completa, como "Este paquete ya no existe".

## Risks / Trade-offs

- [Un `permission-denied` por otra causa dejaría al usuario en "sin acceso" hasta recargar] → Las reglas solo niegan por dueño o lista; el dueño es siempre el usuario. Al recargar, la lista se consulta de nuevo.
- [Varias notas en vuelo pueden rechazarse a la vez] → La primera cierra la sesión; las demás no cambian un estado `accessLost`.
- [Una tarjeta borrada con dos notas en vuelo] → La segunda encuentra su aparición en vuelo y la deshace igual; el aviso no se duplica.

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `sesion-de-repaso`: Rechazo durante la sesión, tras el cierre, Nada a medias, Reintento (ya cubiertos) | `review-session-state.spec`, `review-session.service.spec`, `grade-persistence.integration` siguen en verde | unitaria + integración |
| `sesion-de-repaso`: La tarjeta se borró en otro dispositivo | `review-session-state.spec`: `dropGoneCard` tras calificar A que volvió al final → A fuera de la cola, en `exitedCardIds`, desglose y difíciles sin esa nota, aviso `gone`; `review-session.service.spec`: `rejectNext(new CardGoneError('A'))` → igual por el servicio; `repaso-page.component.spec`: el texto del aviso | unitaria + componente |
| `sesion-de-repaso`: Se borra la que se estaba mostrando | `review-session-state.spec`: con A como actual (reencolada) → la siguiente sin revelar; con A como única → `finished`; `review-session.service.spec`: `ended()` pasa a `finished` | unitaria |
| `sesion-de-repaso`: Tarjeta borrada con el cierre visible | `review-session-state.spec`: `rejectedAfterFinish` sigue en 0 | unitaria |
| `sesion-de-repaso`: Acceso retirado a mitad | `review-session-state.spec`: `closeForLostAccess` desde activa → `accessLost`, sin previsualizaciones; un `rejectSaved`/`confirmSaved` posterior no lo cambia; `review-session.service.spec`: `rejectNext(new AccessRevokedError())` → `status() === 'accessLost'`; `repaso-page.component.spec`: alerta con "Ya no tienes acceso", "Lo que calificaste antes quedó guardado." y "Continuar", sin `app-flip-card` | unitaria + componente |
| `sesion-de-repaso`: Continuar tras perder el acceso | `repaso-page.component.spec`: "Continuar" → `FakeSessionService` en `noAccess` con el correo, URL `/sin-acceso`, y `Location.back()` no vuelve a `/repaso` | componente |
| `sesion-de-repaso`: Acceso retirado con el cierre visible | `review-session-state.spec`: desde `finished` → `accessLost` | unitaria |
| `practica-con-ia`: escenarios existentes del requisito | `practice-ai-session-state.spec`, `practice-ai-session.service.spec`, `practice-ai-page.component.spec` siguen en verde | unitaria + componente |
| `practica-con-ia`: Acceso retirado a mitad de la práctica | `practice-ai-session-state.spec`: `closeBecauseAccessIsLost` desde activa y terminada; `requeueRejected` posterior no lo cambia; `practice-ai-session.service.spec`: `rejectNext(new AccessRevokedError())` → `accessLost`; `practice-ai-page.component.spec`: aviso y "Continuar" → `/sin-acceso` | unitaria + componente |
| `practica-con-ia`: Sección con paquetes, Sin paquetes, Historial (ya cubiertos) | siguen en verde | componente |
| `practica-con-ia`: Detalle tras practicar | `package-detail-page.component.spec`: conjunto de 3 con dos calificados hoy ("Otra vez", "Bien") → "Otra vez · hoy", "Bien · hoy" y "Para hoy" | componente |
| `autenticacion-y-acceso`: Acceso retirado con la app abierta | `session.service.spec`: `markAccessRevoked()` con sesión activa → `noAccess` con el correo; sin sesión, no cambia | unitaria |
| (adaptadores) | `grade-persistence.integration.spec`: tarjeta borrada → `CardGoneError`; correo fuera de la lista → `AccessRevokedError`; `practice-package.repository.integration.spec`: `recordGrade` sin lista → `AccessRevokedError` | integración (8085) |

## Migration Plan

Sin migración de datos ni de reglas. Rollback: revertir el PR.

## Contratos que deja listos

- `AccessRevokedError`: cualquier escritura futura (o una lectura de sesión) que quiera llevar a "sin acceso" lo lanza desde su adaptador y reutiliza `markAccessRevoked` y el copy compartido.
- `hasFirestoreCode` en su módulo: el sitio para traducir más códigos.
- Estados `accessLost` de las dos sesiones: el patrón para otro rechazo permanente.
