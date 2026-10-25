# Proposal

## Why

Con `importacion` un archivo de texto se convierte en un libro, pero el camino de vuelta no existe: el único respaldo de un libro es Firestore y no hay forma de pasarlo a otra cuenta o a otra persona. Exportar cierra "un archivo = un libro" en las dos direcciones, y su prueba de ida y vuelta protege la gramática común (` :: `, cloze) desde la primera release. Entra en 1.0.0 (decidido 2026-10-24).

## What Changes

Implementa íntegra la spec base **nueva** `openspec/specs/exportacion-de-libros/spec.md`, escrita en su explore (2026-10-24). Como la spec base ya describe todo el comportamiento, este change **no lleva delta** (`skip_specs: true`): el archive solo cierra el change. Es el mismo trato que recibirá `practica-con-ia`.

- **Serializador puro**, inverso exacto del parser: `# capítulo` por cada capítulo (único y vacíos incluidos), `anverso | reverso`, ` :: ejemplo` si lo hay, cloze tal cual, línea en blanco entre capítulos, LF final; tarjetas en el orden del listado; saltos de línea dentro de un campo → espacio; sin escapes.
- **Paquete de libro desde un libro guardado**: libro + capítulos + todas sus tarjetas, leídas **siempre del servidor** (la caché puede estar parcial). Sin programación, historial ni suspensión.
- **Diálogo "Exportar «libro»"** con resumen ("2 capítulos · 40 tarjetas"), acción principal única según el dispositivo ("Compartir" con la hoja del sistema o "Descargar .txt"), secundaria "Copiar texto"; cancelar la hoja del sistema no es error; fallos dentro del diálogo.
- **Botón de icono "Exportar"** en la cabecera del detalle del libro, junto a ajustes; deshabilitado sin red con "Necesitas conexión para exportar.".
- Nace el **puerto de entrega de archivos** (compartir / descargar / copiar) con adaptador de navegador y fake.

## Capabilities

### New Capabilities

Ninguna en este change: la capacidad `exportacion-de-libros` ya existe como spec base, escrita y validada antes del change.

### Modified Capabilities

Ninguna. `skip_specs: true`.

## Impact

- **Código:** `domain/ports` (`FileDeliveryPort`, `CardRepository.listByBookFromServer`), `services/export` (serializador, armado del paquete, nombre de archivo, servicio), `infrastructure/firestore` (`listByBookFromServer`), `infrastructure/browser` (adaptador de entrega: Web Share, descarga, portapapeles), `features/biblioteca` (diálogo de exportación, botón en la cabecera, copy).
- **Depende de:** `importacion` (`BookPackage`, constantes de gramática, `parseImportText` para la prueba de ida y vuelta), `tarjetas` (`sortCardsForDisplay`, `Card`), `libros` (`LibroDetailPageComponent`, `BooksService`), `capitulos` (`ChaptersService`), `navegacion-y-shell` (`DialogService`, `ConnectivityPort`, `IconComponent`).
- **Dependencias nuevas:** ninguna. **Datos:** sin campo, índice ni regla nuevos (consulta por `bookId`, índice automático).
- **Proceso:** `CLAUDE.md` ya dice que 1.0.0 = 13 originales + esta capacidad.

## Fuera de alcance

- Compartir libros entre usuarios dentro de la app (colección de nivel superior): futuro; el paquete de libro es la costura.
- Exportar con progreso (JSON de §5.8), CSV, varios libros a la vez.
- Que la materia viaje en el archivo: límite aceptado del formato.
- Escapar `|` o `::` dentro de los campos: la previsualización de importación señala esas líneas al volver.
