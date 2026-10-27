# Tasks

Orden TDD, puerta antes de cada commit (`bash ../flash-cards/docs/herramientas/puerta.sh`), commits sin firmas.

## 1. Puerto y adaptador

- [x] 1.1 Pruebas en rojo: `service-worker-update.adapter.spec` (`VERSION_READY` → lista; otros eventos no; `SwUpdate` inactivo → nunca) y `fake-app-update` (lista a mano). Verificar: fallan.
- [x] 1.2 Crear `AppUpdatePort`, `ServiceWorkerUpdateAdapter`, `FakeAppUpdate` y enlazarlo en `provideCore`. Verificar: 1.1 en verde y `provide-core.spec` en verde.

## 2. Aviso en el caparazón

- [x] 2.1 Pruebas en rojo: `update-notice.component.spec` (sin versión no pinta; con versión, texto, botón, `role="status"`, sólido; "Recargar" llama `reload`) y `shell.component.spec` (el caparazón lo incluye). Verificar: fallan.
- [x] 2.2 Crear `UpdateNoticeComponent` (cuatro archivos), sus textos y ponerlo en el caparazón. Verificar: 2.1 en verde.

## 3. Cierre

- [x] 3.1 Puerta completa en verde y README (párrafo del aviso). Verificar: "PUERTA: VERDE".
- [x] 3.2 Archivar el change. Verificar: `openspec validate --specs --strict`.
