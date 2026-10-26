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
- **Acceso (A-01):** al entrar con Google fuera de la lista, solo se borra la identidad si el proveedor la acaba de
  crear; una cuenta que ya existía se conserva (sus datos siguen ligados a ella). Un requisito decía "recién creada"
  y otro "acaba de entrar por Google": quedan los dos diciendo lo primero.
- **Cola diaria (CD-04, con C-01):** las tarjetas de un libro que ya no está en la biblioteca (un libro borrado cuyas
  tarjetas quedaron huérfanas) dejan de entrar en Hoy y se registran. La spec decía que "pasan sin tope".
- **Cola diaria (CD-02):** las nuevas creadas juntas (al importar un libro, importar tarjetas o crear varias) entran
  en Hoy en el orden en que llegaron, el del archivo. Entre las que ya comparten la misma fecha de creación (creadas
  así por versiones anteriores), el orden pasa a ser estable: agrupadas por capítulo y, dentro, por anverso.
- **Exportación (EX-03):** las tarjetas del libro cuyo capítulo ya no existe se exportan al final, bajo un capítulo
  "Sin capítulo", y cuentan en el resumen. Hoy se pierden del respaldo sin aviso.
- **Exportación (EX-02, aprobado por el usuario):** "Descargar .txt" se ofrece siempre; donde se puede compartir, como
  acción secundaria (en el escritorio, la hoja de compartir no guarda el archivo en el disco). El error de copiar deja
  de nombrar una acción que puede no estar.
- **Caparazón (F-01, aprobado por el usuario):** un fallo que ninguna pantalla prevé, además de registrarse, muestra
  un aviso discreto "Algo salió mal. Si se repite, recarga la app.", en cualquier pantalla y sin apilarse.
- **Icono (P-03, aprobado por el usuario):** icono Cadence para la PWA y el favicon. No toca ninguna spec.

El resto del plan de la rama (CD-01, PR-01, C-01, IM-01/02/05/07/08/09, PQ-01, P-02, N-01/02, T-01, IM-04) son
correcciones contra specs que ya piden lo correcto: llevan su prueba de regresión, pero no delta. Su seguimiento vive en
el plan de la revisión.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ajustes-de-usuario`: el requisito "Guardar un ajuste fusiona el cambio sobre los ajustes actuales y actualiza la
  sesión" deja de persistir el perfil completo y gana dos escenarios (ajustes desconocidos intactos, dos cambios
  seguidos).
- `autenticacion-y-acceso`: "El usuario puede continuar con Google" y "Solo entra quien está en la lista de acceso
  anticipado" (solo se borra la identidad de Google recién creada; una que ya existía se conserva).
- `cola-diaria`: "Las vencidas se topan por libro…" (las de un libro que no está en la biblioteca no entran) y "Las
  tarjetas nuevas entran por libro…" (orden de creación = orden de llegada; empate estable).
- `exportacion-de-libros`: "El texto exportado es el inverso exacto de la convención de importación" (tarjetas sin
  capítulo al final, bajo "Sin capítulo"), "La entrega principal es compartir…" ("Descargar .txt" también como
  secundaria) y "«Copiar texto» deja el texto…" (su mensaje de error).
- `navegacion-y-shell`: requisito nuevo, "Un fallo que ninguna pantalla prevé se avisa de forma discreta".

## Impact

- Puerto y adaptador del perfil (escritura parcial de ajustes) y el servicio de sesión.
- Puerto y adaptador del proveedor de identidad (entrar con Google dice si la cuenta es nueva).
- Armado de la cola (puro) y el servicio de la cola de Hoy (registro de las huérfanas).
- Creación de tarjetas en lote (repositorio de tarjetas e importación de un libro): fechas de creación escalonadas.
- Paquete de exportación (puro) y el diálogo de exportar.
- El manejador global de errores (raíz de composición), un servicio de aviso y su componente en la raíz de la app.
- Los iconos de la PWA, el `apple-touch-icon` y el favicon.
- Datos: compatibles. No se migra nada; las tarjetas ya creadas conservan sus fechas.

## Fuera de alcance

- Los hallazgos que el usuario dejó para después del 1.0.0 (EX-01, L-02 y los bajos e informativos fuera del plan).
- Los `IA-*`: son de la 1.1.0 y se arreglan en su rama.
- Recolocar en un capítulo las tarjetas huérfanas que ya existan: dejan de salir en Hoy y vuelven a verse al exportar
  e importar el libro.
- El orden del archivo para lo importado antes de esta rama: esa información no se guardó.
