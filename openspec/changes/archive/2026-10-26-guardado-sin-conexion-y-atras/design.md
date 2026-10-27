# Design

## Context

Motivo y alcance: ver `proposal.md`. Estado del código en `feature/pendientes-de-la-revision` (base `dev` `f497fb1`), verificado el 2026-10-26:

- `shared/dialog/dialog.service.ts`: `AppDialogRef.setPending(true)` bloquea Escape y pone `aria-busy` para siempre; el CDK abre con `closeOnNavigation` por defecto (cierra el diálogo en cada `popstate` y deja que el router navegue). Ningún diálogo pone plazo al "Guardando…".
- Ocho contenidos llaman a `setPending`: formulario de libro, ajustes del libro, capítulo, tarjeta (de capítulo o, con `save` propio, de paquete), paquete, importar tarjetas, exportar y la confirmación genérica.
- Escrituras que quedan en el dispositivo sin red: `setDoc`/`updateDoc` de libros, capítulos y paquetes, y el lote único de crear o editar una tarjeta. No quedan: las transacciones (borrar tarjetas, ítems de paquete) y el reemplazo de un capítulo (lee del servidor antes de escribir).
- Salidas de pantalla completa: `practica-page.leave()`, `practice-ai-page.backToPackage()` y `repaso-page.exit()/home()` usan `router.navigate` sin `replaceUrl`. El router se configura con `withViewTransitions()` y `canceledNavigationResolution` por defecto (`'replace'`).

## Goals / Non-Goals

**Goals:**
- Una sola pieza decide el plazo y el cierre por "atrás" (el servicio de diálogos); cada contenido solo elige si se apunta y qué texto muestra.
- El historial queda como el usuario lo espera: "atrás" con un diálogo no cambia de pantalla y las pantallas completas no dejan entradas muertas.

**Non-Goals:**
- Detectar "lie-fi" (no hay API fiable) ni cancelar escrituras pendientes.
- Avisos en borrados y en ítems de paquete (ver proposal, Fuera de alcance).

## Decisions

### D1. Ocupado con plazo en `AppDialogRef` (UI compartida, `shared/dialog/`)
`setPending(true, { releaseWhenSlow: true })` arranca un temporizador de `SLOW_SAVE_MS = 6000`. Al vencer: el diálogo deja de estar ocupado (Escape y "atrás" cierran, se quita `aria-busy`) y la señal de solo lectura `savingTooLong()` pasa a `true`. `setPending(false)` y el cierre cancelan el temporizador y devuelven `savingTooLong` a `false`. Sin la opción, el comportamiento de hoy no cambia (los borrados siguen ocupados).

Cada contenido que se apunta (libro, ajustes, capítulo, tarjeta de capítulo, paquete, importar tarjetas y la confirmación de reemplazo) pinta, si `savingTooLong()`, su aviso con `role="status"` y cambia su botón secundario a "Cerrar" habilitado. El principal sigue en "Guardando…"/"Importando…". Si la escritura confirma después, el `close(resultado)` del contenido es inocuo con el diálogo ya cerrado (el `DialogRef` del CDK ignora un segundo cierre) y el servicio aplica el resultado a su estado como siempre.

`ConfirmDialogData` gana `slowNotice?: string`: solo la confirmación de reemplazo lo pasa. La pantalla "Importar libro" no es un diálogo: usa la misma constante con un temporizador propio (`watchSlow` en `shared/dialog/slow-save.ts`, que también usa `AppDialogRef`).

Alternativa descartada: un temporizador por contenido (siete copias de la misma lógica, y el bloqueo de Escape vive en el servicio).

Textos nuevos en `shared/text/connection.copy.ts` (los usan varias áreas): `SAVED_ON_DEVICE_MESSAGE`, `IMPORT_WAITS_FOR_CONNECTION_MESSAGE` y `CLOSE_LABEL` ("Cerrar").

### D2. "Atrás" cierra el diálogo de arriba (UI compartida + raíz)
`DialogService` guarda los diálogos abiertos (pila) y escucha los `NavigationStart` con `navigationTrigger === 'popstate'` hacia otra URL: si hay alguno abierto, aborta la navegación (`router.currentNavigation()?.abort()`) y cierra el de arriba si no está ocupado. Con `withRouterConfig({ canceledNavigationResolution: 'computed' })` en `app.config.ts`, el router devuelve el historial a la entrada en la que estaba (`history.go(+1)`), así que la pantalla y su entrada se conservan. El CDK abre con `closeOnNavigation: false`.

Alternativas descartadas: una entrada falsa con `pushState` al abrir (quitarla al cerrar con `history.back()` compite con la navegación que muchos contenidos hacen justo después de cerrar) y guardias en las rutas (dos guardias en el caparazón y solo cubrirían sus hijas; el servicio ya sabe qué hay abierto).

`'computed'` solo cambia las navegaciones canceladas; las redirecciones de las guardias (sesión, bandejas de práctica y repaso) no son cancelaciones y siguen igual.

### D3. Salir de una pantalla completa sin dejar entradas muertas (UI compartida, `shared/navigation/`)
`ReturnNavigation` (servicio de raíz) con `leaveTo(url)`: si la navegación anterior a la pantalla completa (la `previousNavigation` de la última navegación con éxito: dentro de la pantalla completa no hay otras) terminó en `url`, regresa con `Location.back()`; si no, navega a `url` con `replaceUrl: true`. (Al implementar se vio que no hace falta recordar nada al entrar: se lee al salir.) Lo usan tres pantallas, que es lo que justifica la pieza:
- práctica: `url` = su origen (capítulo o libro); siempre se abre desde ahí, así que regresa con el historial;
- práctica con IA: `url` = `/paquetes/<id>`; desde el paquete regresa, desde Hoy reemplaza;
- repaso: `url` = `/hoy`; desde Hoy regresa, desde un capítulo o un libro reemplaza.

Decidido por Claude dentro de la decisión 10: el repaso abierto desde Hoy regresa con el historial en vez de reemplazar (reemplazar dejaría dos Hoy seguidas: un "atrás" que no hace nada).

### Superficies (ADR 0003)
Sin superficies nuevas. Los avisos son texto dentro del panel del diálogo (acrílico ya existente) o de la pantalla; no añaden capas.

## Risks / Trade-offs

- [El aviso dice "Quedó guardado" aunque el servidor luego rechace la escritura (reglas)] → Raro (las reglas ya se cumplen al escribir); el fallo queda en el registro de la app y el estado se corrige al releer.
- [Una importación de varios lotes cerrada con el aviso solo tiene el primer lote en el dispositivo] → El texto no promete nada y pide no cerrar la app; terminar sola tras cerrar la app queda fuera de alcance.
- [`'computed'` cambia la restauración de cualquier navegación cancelada] → Hoy ninguna guardia cancela (redirigen); una prueba de rutas lo cubre.
- [Abortar en `NavigationStart` depende de una API reciente del router (`Navigation.abort`, Angular ≥ 20)] → El proyecto usa Angular 22; las pruebas de componente lo ejercitan con el router real.

## Plan de pruebas

| Escenario (spec) | Prueba | Capa |
| --- | --- | --- |
| `nav`: Wifi sin internet al crear un libro / Confirma antes de los 6 s | `dialog.service.spec` con temporizadores falsos: con `releaseWhenSlow`, a los 5 999 ms sigue ocupado (Escape no cierra), a los 6 000 ms `savingTooLong()` y Escape cierra, sin `aria-busy`; `setPending(false)` antes del plazo lo cancela | componente (servicio con CDK) |
| `nav`: Borrar sin internet | `dialog.service.spec`: sin la opción, a los 6 s sigue ocupado; `confirm-dialog.component.spec`: sin `slowNotice`, nada cambia | componente |
| `nav`: Atrás en un formulario / Atrás tras el aviso | `dialog.service.spec` con `RouterTestingHarness`, `canceledNavigationResolution: 'computed'` y `Location.back()`: `/a` → `/b`, abrir, atrás → cerrado y sigue en `/b`; otro atrás → `/a` | componente |
| `nav`: Atrás mientras guarda | igual, con el diálogo ocupado: sigue abierto y en `/b` | componente |
| `nav`: Dos diálogos apilados | igual, dos abiertos: atrás cierra solo el de arriba | componente |
| `libros`: Guardado que no confirma | `book-form-dialog.component.spec` y `book-settings-dialog.component.spec`: servicio que nunca resuelve, 6 s → aviso, "Cerrar" habilitado y cierra | componente |
| `capitulos`: Guardado que no confirma | `chapter-form-dialog.component.spec`, igual | componente |
| `tarjetas`: Guardado que no confirma / Borrado que no confirma | `card-form-dialog.component.spec`: capítulo → aviso; con `save` propio (paquete) → sin aviso; `confirm-dialog` sin `slowNotice` → sin aviso | componente |
| (paquete) crear o renombrar que no confirma | `package-form-dialog.component.spec`, igual que libro | componente |
| `importacion`: Importación que no confirma / Reemplazo que no confirma | `card-import-dialog.component.spec` (aviso de importar y "Cerrar"); `confirm-dialog.component.spec` con `slowNotice` | componente |
| `importacion`: Importar un libro con un wifi sin internet | `importar-libro-page.component.spec`: importación que nunca resuelve, 6 s → aviso con "Importando…" | componente |
| `practica-quiz`: Atrás después de salir / después del resumen / Adelante tras salir | `practica-page.component.spec` con `setUpLocationChangeListener()`: libro → capítulo → práctica; "Salir" → capítulo; atrás → libro (la sonda PQ-05); adelante → Biblioteca | componente |
| `practica-con-ia`: Desde el detalle / Desde Hoy | `practice-ai-page.component.spec`: desde `/paquetes/p1`, "Salir" regresa y atrás va a lo anterior; desde `/hoy`, "Volver al paquete" reemplaza y atrás vuelve a Hoy | componente |
| `sesion-de-repaso`: Desde un capítulo / Desde Hoy / Volver atrás tras terminar | `repaso-page.component.spec`: desde el capítulo, "Salir" → Hoy y atrás → capítulo; desde Hoy, "Volver a Hoy" regresa y atrás → lo anterior | componente |
| `ReturnNavigation` (contrato) | `return-navigation.service.spec`: anterior = destino → `back`; distinto → reemplaza | componente |
| copy | `connection.copy.spec` (textos exactos de la spec) | unitaria |

Sin e2e: el "atrás" de Android en el móvil lo prueba el usuario en el branch deploy.

## Migration Plan

Sin datos ni reglas. Rollback: revertir el PR.

## Contratos que deja listos

- `setPending(true, { releaseWhenSlow })` y `savingTooLong()`: cualquier diálogo nuevo que guarde en el dispositivo se apunta en una línea.
- El cierre por "atrás" vale para todo diálogo abierto con `DialogService`, presente o futuro.
- `ReturnNavigation.leaveTo`: la pauta para cualquier pantalla completa nueva.
