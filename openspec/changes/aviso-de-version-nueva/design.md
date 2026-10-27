# Design

## Context

Motivo: ver `proposal.md`. El trabajador de servicio de Angular se registra en producción (`provideServiceWorker`, `registerWhenStable:30000`); nada escucha `SwUpdate.versionUpdates` (verificado en `dev` `f497fb1`: `grep SwUpdate` sin resultados). El caparazón (`features/shell/shell/`) ya pinta el aviso "sin conexión" (`glass-soft`, segunda capa de vidrio junto a la navegación).

## Goals / Non-Goals

**Goals:** saber si hay una versión lista sin que la UI conozca el trabajador de servicio; mostrarlo solo en el caparazón.

**Non-Goals:** forzar la actualización; el estado irrecuperable.

## Decisions

### D1. Un puerto `AppUpdatePort` (dominio), como `ConnectivityPort`
`updateReady: () => boolean` (señal en la implementación) y `reload(): void`. El adaptador `ServiceWorkerUpdateAdapter` (infraestructura, `infrastructure/browser/`) escucha `SwUpdate.versionUpdates` y marca lista la versión con el evento `VERSION_READY`; si `SwUpdate` no está activo (desarrollo, navegadores sin trabajador de servicio), nunca la marca. `reload()` recarga el documento: el trabajador de servicio de Angular sirve la versión nueva en la recarga. La UI y las pruebas usan el puerto y su fake (`testing/fake-app-update.ts`), sin depender de `@angular/service-worker`.

Alternativa descartada: inyectar `SwUpdate` en el componente (la UI conocería la plataforma y las pruebas tendrían que imitar sus eventos).

### D2. El aviso, en el caparazón (UI)
`UpdateNoticeComponent` (`features/shell/update-notice/`, cuatro archivos) sobre el indicador de "sin conexión". Como las pantallas completas no usan el caparazón, el aviso nunca sale en ellas y aparece al volver (decisión 11) sin lógica extra. Superficie **sólida** (`bg-surface`, borde): con el aviso "sin conexión" y la navegación ya hay dos capas de vidrio (ADR 0003).

## Risks / Trade-offs

- [La recarga pierde lo escrito en un formulario abierto] → El aviso no obliga: el usuario decide cuándo.
- [`VERSION_READY` puede llegar varias veces en una sesión larga] → El aviso es idempotente (una señal).

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| Versión nueva en la Biblioteca | `service-worker-update.adapter.spec`: `SwUpdate` imitado con un `Subject`; `VERSION_READY` → `updateReady()`; `VERSION_DETECTED` no; `update-notice.component.spec`: con el fake listo, "Hay una versión nueva" y "Recargar", `role="status"`, superficie sólida (sin `glass`) | unitaria (adaptador) + componente |
| Recargar | `update-notice.component.spec`: tocar "Recargar" llama `reload()` del fake | componente |
| Durante un repaso | `shell.component.spec`: el caparazón contiene el aviso; las pantallas completas no usan el caparazón (ya cubierto por `app.routes.spec`, rutas fuera del caparazón) | componente |
| Sin versión nueva | adaptador con `SwUpdate.isEnabled = false` → nunca lista; componente con el fake sin versión → no pinta nada | unitaria + componente |
| copy | `shell.copy.spec` (si existe) o el del componente: textos exactos | unitaria |

## Migration Plan

Sin datos. Rollback: revertir el PR.

## Contratos que deja listos

- `AppUpdatePort`: cualquier pantalla que quiera ofrecer "recargar" (p. ej. tras un error irrecuperable) lo reutiliza.
