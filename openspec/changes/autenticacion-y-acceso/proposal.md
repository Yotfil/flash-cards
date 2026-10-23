# Proposal

## Why

Con la plataforma y el caparazón listos, la app todavía no sabe quién la usa: no hay sesión, perfil ni protección de rutas, y la página de acceso es provisional. Todo lo que sigue parte del usuario autenticado con su perfil cargado, así que esta capacidad va antes y corrige los dos hallazgos de prioridad A del acceso anticipado: el usuario atascado por un perfil que no carga y las cuentas ajenas que quedaban registradas.

## What Changes

Implementa la spec base `openspec/specs/autenticacion-y-acceso/spec.md` con las decisiones de su explore (2026-10-22):

- Sesión con cinco estados: resolviendo, sin sesión, con sesión, sin acceso y **error de perfil** (nuevo), que muestra en la pantalla de acceso "No pudimos cargar tu perfil" con Reintentar y Cerrar sesión (hallazgo 1).
- Registro con **comprobación previa de la lista**: la regla permite consultar un correo exacto sin sesión (sin listar ni escribir); si no está, el formulario lo dice y no se crea ninguna cuenta (hallazgo 2). Con Google, una identidad no autorizada se borra al instante y la app pasa a "sin acceso".
- Errores de acceso por categoría: datos incorrectos, correo ya registrado, sin conexión, desconocido; cancelar la ventana de Google no muestra error (hallazgo 7).
- Un solo camino de creación del perfil, el observador de sesión; el registro solo deja apuntado el nombre elegido (hallazgo 9).
- Modelo `User`, esquema del perfil con valores por defecto, repositorios de perfil y lista, puerto de autenticación con su adaptador, guards de sesión e invitado sobre el mapa de rutas del caparazón.
- Pantallas de acceso y "sin acceso" con el sistema Cadence y Signal Forms validadas con Zod.
- Semilla de la lista en el emulador: datos persistidos entre arranques y un script que autoriza un correo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `autenticacion-y-acceso`: comprobación previa de la lista al registrarse y nota de acceso anticipado; borrado de la identidad de Google no autorizada; cinco estados de sesión; errores por categoría; lista consultable por correo exacto sin sesión; perfil que no carga como estado con salida; camino único de creación del perfil; cerrar sesión también desde el error de perfil.

## Impact

- Código: `domain/models`, `domain/ports`, `infrastructure/auth`, `infrastructure/firestore` (esquema y repositorios), `services/session`, `core` (guards, proveedores), `features/auth`, `app.routes.ts`.
- Configuración: `firestore.rules` (una regla), `tests/rules`, `package.json` (scripts), `scripts/`, `.gitignore`, `README.md`.
- Dependencias: ninguna nueva.
- Datos: ninguno. La única regla que cambia abre la lectura de una entrada exacta de la lista.

## Fuera de alcance

- Pantalla Ajustes, su botón "Cerrar sesión" y la edición de ajustes: `ajustes-de-usuario`. Aquí quedan el método de cerrar sesión y el helper "sesión requerida".
- Aplicar el tema del perfil al documento: `ajustes-de-usuario` conecta el perfil con el servicio de tema.
- Verificación de correo, recuperación de contraseña y enlace de proveedores: no existen en la 0.1.1 ni entran en la paridad.
- Administración de la lista desde la app: sigue siendo manual en la consola.
