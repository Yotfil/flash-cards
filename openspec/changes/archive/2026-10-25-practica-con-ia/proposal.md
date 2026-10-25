# Proposal

## Why

Cadence tiene una sola rama de estudio: los libros con su repaso programado. Al usuario se le cruzan a diario palabras y frases (una película, una reunión) que quiere reforzar conversando con su chat de IA, sin meterlas en un libro ni esperar al algoritmo. Los **paquetes de práctica** son esa rama alternativa: contenido propio, práctica diaria con los cuatro cerebros sin FSRS, y un prompt que lleva lo repasado hoy con énfasis en lo difícil. Es la 15.ª y última capacidad, y el release 1.1.0.

## What Changes

Implementa íntegra la spec base **reescrita** `openspec/specs/practica-con-ia/spec.md` (2026-10-24). Como la spec base ya describe todo el comportamiento, el change **no lleva delta** (`skip_specs: true`), igual que `exportacion-de-libros`.

- **Paquetes** en una colección propia bajo el usuario, con capacidad fijada al crearse (ajuste "Ítems por paquete", 20 por defecto), varios abiertos, completado solo a mano, historial.
- **Ítems** con anverso, reverso y ejemplo (cloze a prueba), agregados con el formulario de tarjeta y el diálogo de pegar texto reutilizados, con tope "Caben N más".
- **"Para hoy"** = nuevos + difíciles de días anteriores; el conjunto se fija en la primera práctica del día y se puede repetir; manda la última calificación.
- **Práctica en pantalla completa** con las piezas visuales del repaso (tarjeta, cerebros, barra, cierre) y una sesión propia sin programación ni intervalos; calificación optimista como el repaso.
- **Prompt** con `[[REPASADAS]]` y `[[DIFICILES]]`, plantilla por defecto en inglés, copia con confirmación y salida manual.
- **Ubicación:** sección "Práctica con IA" en Biblioteca, detalle `/paquetes/:id`, historial, bloque pequeño en Hoy, sección en Ajustes.
- **Sin red:** practicar y copiar sí; la gestión necesita conexión (transversal 6).
- Generalizaciones con segundo caso real: la tarjeta, la barra de cerebros y el cierre del repaso aceptan contenido "sin programación"; el formulario y el diálogo de importar aceptan quién guarda.

## Capabilities

### New Capabilities

Ninguna en este change: `practica-con-ia` ya existe como spec base, reescrita y validada en su explore.

### Modified Capabilities

Ninguna. `skip_specs: true`.

## Impact

- **Código:** `domain` (modelo y puerto de paquetes, `CardFace`), `infrastructure/firestore` (repositorio, esquema, `firestore.rules` nueva regla), `services/practice-ai/` (pendientes, conjunto del día, prompt, sesión sin FSRS, servicio de paquetes), `services/session` (ajustes nuevos), `features/practica-ia/` (sección, detalle, historial, bloque de Hoy, pantalla de práctica, cierre, copy), `features/repaso` (generalizaciones de `FlipCard`, `RatingBar`, `SessionSummary`), `features/biblioteca` (sección, `CardFormDialog` y `CardImportDialog` con destino), `features/ajustes`, `features/hoy`, `app.routes.ts`.
- **Depende de:** `sesion-de-repaso`, `importacion`, `tarjetas`, `cola-diaria`, `ajustes-de-usuario`, `exportacion-de-libros` (`FileDeliveryPort.copyText`), `practica-quiz` (`HandoffTray`, `SessionTopBar`, `StudyLaunchButton` con `destination`), `plataforma` (reglas por colección).
- **Dependencias nuevas:** ninguna. **Datos:** colección nueva `practicePackages` (un documento por paquete, ítems embebidos), regla de seguridad nueva, sin índice compuesto (los paquetes se listan por cuenta y se filtran en memoria). Dos campos nuevos en las preferencias del usuario.
- **Release:** 1.1.0, segundo PR de la rama única.

## Fuera de alcance

- Que las difíciles del repaso de los libros entren a los paquetes (modelo v1, descartado).
- Mover ítems entre paquetes o a un libro, compartir paquetes, practicar varios paquetes en una sola sesión.
- Retirar o consolidar los ítems cloze: se decide con el uso.
