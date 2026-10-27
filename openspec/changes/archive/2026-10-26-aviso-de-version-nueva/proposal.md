# Proposal

## Why

La app no avisa cuando hay una versión nueva (AJ-03): una pestaña o la PWA abierta en segundo plano siguen con la versión vieja hasta cerrarse del todo, a veces días, y eso alarga problemas como AJ-01. El usuario decidió el 2026-10-26 (decisión 11) un aviso discreto que no obliga.

## What Changes

- Cuando el trabajador de servicio tiene descargada una versión nueva, el caparazón muestra un aviso discreto "Hay una versión nueva" con el botón "Recargar".
- "Recargar" recarga la app con la versión nueva; ignorar el aviso no cambia nada.
- El aviso vive en el caparazón: nunca sale dentro del repaso ni de las prácticas (pantallas completas); aparece al volver a una pantalla con navegación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `navegacion-y-shell`: requisito nuevo del aviso de versión nueva.

## Impact

- Puerto nuevo `AppUpdatePort` (dominio) con su adaptador sobre `SwUpdate` (infraestructura) y su fake (testing); enlace en `core/provide-core.ts`.
- Componente `features/shell/update-notice/` y textos en `shell.copy.ts`.
- Sin cambios de datos, reglas ni lecturas.

## Fuera de alcance

- Forzar la actualización, recargar sola o avisar dentro del repaso o de las prácticas.
- Tratar el estado "irrecuperable" del trabajador de servicio (caché rota): queda como está.
