# Proposal

## Why

El esqueleto de Cadence (change 0) no habla todavía con ningún almacén: no hay Firebase en la app, ni caché offline, ni frontera que valide lo que llega de Firestore, ni escritor por lotes. Todas las capacidades siguientes leen o escriben datos, así que estos cimientos tienen que existir primero, delgados y probados, para que cada capacidad traiga solo su modelo, su esquema y su repositorio.

## What Changes

Implementa la spec base `openspec/specs/plataforma-datos-y-offline/spec.md` con el alcance "cimientos delgados" decidido en su explore (2026-10-21):

- Arranque de Firebase en la raíz de composición: Firestore con caché local persistente y multi-pestaña, y Auth. En desarrollo la app se conecta a los emuladores locales de Firestore y Auth bajo un proyecto de demostración; en producción, al proyecto real.
- Reglas de seguridad verificadas por completo contra el emulador: se añaden los escenarios que faltaban (escritura sin sesión, subcolección no declarada, borrado de un registro de repaso, las cinco colecciones declaradas).
- Frontera de lectura: marcas de tiempo a fechas y validación de documentos con error explícito que nombra la ruta y la razón.
- Escritor por lotes de hasta 450 operaciones, commits secuenciales y reporte de lo ya escrito si un lote falla.
- Hallazgos 8 y 9: `firebase.json` deja de duplicar el hosting y el service worker deja de listar archivos inexistentes.
- Pruebas estáticas de hosting, manifest y entornos, para que cabeceras, rutas profundas y PWA tengan verificación automática.
- El manifest "Cadence" con lienzo oscuro (hecho en el change 0) queda reflejado en la spec.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `plataforma-datos-y-offline`: (1) manifest y metadatos de instalación pasan a "Cadence", lienzo oscuro y favicon vectorial; (2) la configuración por entorno distingue desarrollo contra emuladores de producción contra la nube; (3) el error de validación identifica ruta y razón y queda registrado; (4) una escritura de varios lotes que falla informa qué quedó escrito, y la importación de un libro escribe el libro en el último lote e intenta deshacer lo escrito.

## Impact

- Código: `core/` (proveedor de Firebase), `infrastructure/firebase` y `infrastructure/firestore` (tokens, frontera, lotes), `src/environments/`, `app.config.ts`.
- Configuración: `firebase.json`, `ngsw-config.json`, `package.json` (script de emuladores), `vitest.integration.config.ts`, `README.md`.
- Dependencias: ninguna nueva. Datos, reglas e índices: sin cambios de contenido.

## Fuera de alcance

- Modelos y esquemas Zod de perfil, libro, capítulo, tarjeta, registro de repaso e indicadores diarios, con sus valores por defecto: llegan con la capacidad que usa cada documento. Aquí solo el mecanismo y su prueba genérica.
- Parser de importación y la política de deshacer una importación fallida: `importacion`.
- Semilla de la lista de acceso en el emulador de Auth: `autenticacion-y-acceso`.
- Indicador de "sin conexión" y patrón de recurso asíncrono: `navegacion-y-shell`.
- Icono definitivo de la PWA.
- Prueba automatizada de la caché IndexedDB: no existe en Node ni jsdom; se verifica a mano y con Playwright al cerrar la paridad.
