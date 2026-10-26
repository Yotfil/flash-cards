# Correcciones de la revisión adversarial antes del 1.0.0

## Why

La revisión adversarial de las 16 capacidades (2026-10-25/26) encontró fallos que el usuario decidió arreglar antes
del release 1.0.0, en la rama `fix/revision-1.0.0`. La mayoría son código que no cumple su spec y se corrigen sin
tocarla; este change recoge solo los arreglos que **cambian la letra de una spec**, para que las specs base digan lo
que la app hace después de la rama.

## What Changes

- **Ajustes (AJ-01, AJ-01b):** guardar un ajuste escribe solo los ajustes cambiados, no el perfil entero. Así un
  cliente 1.0.0 no borra los ajustes que añada una versión posterior (la plantilla de prompt de la 1.1.0), y dos
  ajustes cambiados seguidos se conservan los dos. La spec decía "persistir el perfil completo".
- **Cola diaria (CD-04, con C-01):** las tarjetas de un libro que ya no está en la biblioteca (un libro borrado cuyas
  tarjetas quedaron huérfanas) dejan de entrar en Hoy y se registran. La spec decía que "pasan sin tope".
- **Cola diaria (CD-02):** las nuevas creadas juntas (al importar un libro, importar tarjetas o crear varias) entran
  en Hoy en el orden en que llegaron, el del archivo. Entre las que ya comparten la misma fecha de creación (creadas
  así por versiones anteriores), el orden pasa a ser estable: agrupadas por capítulo y, dentro, por anverso.
- **Exportación (EX-03):** las tarjetas del libro cuyo capítulo ya no existe se exportan al final, bajo un capítulo
  "Sin capítulo", y cuentan en el resumen. Hoy se pierden del respaldo sin aviso.

El resto del plan de la rama (A-01, CD-01, PR-01, C-01, IM-01/02/05/07/08/09, PQ-01, P-02, N-01/02, T-01, IM-04) son
correcciones contra specs que ya piden lo correcto: llevan su prueba de regresión, pero no delta. Su seguimiento vive en
el plan de la revisión.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ajustes-de-usuario`: el requisito "Guardar un ajuste fusiona el cambio sobre los ajustes actuales y actualiza la
  sesión" deja de persistir el perfil completo y gana dos escenarios (ajustes desconocidos intactos, dos cambios
  seguidos).
- `cola-diaria`: "Las vencidas se topan por libro…" (las de un libro que no está en la biblioteca no entran) y "Las
  tarjetas nuevas entran por libro…" (orden de creación = orden de llegada; empate estable).
- `exportacion-de-libros`: "El texto exportado es el inverso exacto de la convención de importación" (tarjetas sin
  capítulo al final, bajo "Sin capítulo").

Si el usuario aprueba los condicionales del plan, se añadirán aquí: `exportacion-de-libros` (EX-02, "Descargar .txt"
siempre como acción secundaria) y `navegacion-y-shell` (F-01, aviso de error global).

## Impact

- Puerto y adaptador del perfil (escritura parcial de ajustes) y el servicio de sesión.
- Armado de la cola (puro) y el servicio de la cola de Hoy (registro de las huérfanas).
- Creación de tarjetas en lote (repositorio de tarjetas e importación de un libro): fechas de creación escalonadas.
- Paquete de exportación (puro).
- Datos: compatibles. No se migra nada; las tarjetas ya creadas conservan sus fechas.

## Fuera de alcance

- Los hallazgos que el usuario dejó para después del 1.0.0 (EX-01, L-02 y los bajos e informativos fuera del plan).
- Los `IA-*`: son de la 1.1.0 y se arreglan en su rama.
- Recolocar en un capítulo las tarjetas huérfanas que ya existan: dejan de salir en Hoy y vuelven a verse al exportar
  e importar el libro.
- El orden del archivo para lo importado antes de esta rama: esa información no se guardó.
