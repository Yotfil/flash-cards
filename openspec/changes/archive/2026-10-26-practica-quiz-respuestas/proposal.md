# Proposal

## Why

La revisión de la 1.0.0 encontró que la práctica (mini-quiz) se equivoca al corregir respuestas válidas: da por mal la otra acepción de un anverso ("bank" → «orilla»), la pregunta dos veces si el capítulo tiene repetidas, rechaza "don't" frente a «don’t», acepta "3" por «3,14», dice "Nada que practicar aún." de un libro que el dispositivo nunca leyó sin red, y deja el foco perdido con teclado. El usuario decidió cada punto el 2026-10-26 (decisiones 3 a 7 de la sexta sesión); este change los aplica.

## What Changes

- **PQ-03 (dec. 3)** La comparación de textos de tarjeta unifica apóstrofos y comillas tipográficas con los rectos (’ ‘ ʼ → ', “ ” → ") y la forma de las letras con tilde (una tilde escrita aparte cuenta igual). Rige en **toda** comparación: corregir lo escrito, elegir distractores, detectar repetidas en el listado, en el aviso del formulario y en la previsualización de la importación, y ordenar. El texto guardado no cambia. El campo de escribir apaga la autocorrección.
- **PQ-02 (dec. 4)** Una pregunta por anverso normalizado. Al escribir vale cualquiera de sus reversos; en opción múltiple sale uno como correcto y los otros nunca son distractores. Al fallar al escribir: "La respuesta era «banco» o «orilla»." Las repetidas ya no se preguntan dos veces.
- **PQ-04 (dec. 5)** Un `,` `;` o `/` con un dígito a cada lado no separa sinónimos (3,14 · 1/2 · 25/12); entre letras sigue separando.
- **PQ-08 (dec. 6)** La spec promete "orden aleatorio", no "un orden distinto" (solo texto).
- **PQ-06 (dec. 7)** Practicar un libro sin red y sin ninguna tarjeta suya en el dispositivo dice "Sin conexión, este dispositivo aún no tiene tarjetas de este libro."; con red, o sin red con tarjetas guardadas pero ninguna elegible, sigue "Nada que practicar aún.".
- **PQ-07 (accesibilidad)** El foco va al enunciado al mostrarse una pregunta de opción múltiple y al título del cierre: el de la práctica, el del repaso y el de la práctica con IA (el mismo cierre).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `practica-quiz`: agrupación por anverso, respuestas aceptadas, normalización, separadores con dígitos, orden aleatorio, mensaje sin red del libro y foco.
- `tarjetas`: la definición de "normalizado" de las repetidas (listado y aviso del formulario) suma apóstrofos, comillas y tildes.
- `sesion-de-repaso`: el cierre recibe el foco.
- `practica-con-ia`: el cierre de la práctica recibe el foco (mismo cierre que el repaso).

`importacion` y `exportacion-de-libros` no cambian de texto: remiten a "anverso y reverso normalizados" y heredan la definición de `tarjetas`.

## Impact

- Servicios puros: `normalizeCardText`, `generateQuiz`, `isWrittenAnswerCorrect`, estado de la práctica; `PracticeService` (resultado del libro con el motivo del vacío; usa el puerto de conectividad).
- UI: pregunta de opción múltiple, de escribir (atributo), resumen de la práctica, cierre de sesión compartido, detalle del libro (mensaje), copy de práctica.
- Sin cambios de datos, reglas, índices ni lecturas: practicar un capítulo sigue con cero lecturas y un libro con una.

## Fuera de alcance

- PQ-05 ("atrás" tras practicar) y N-03: punto 3, `feature/guardado-sin-conexion-y-atras`.
- No aceptar fragmentos de una letra ("m" en «m/s»): se descartó en la decisión 5.
- Recortar el enunciado y la respuesta (sonda informativa, sin efecto con datos de la app) y el doble registro del fallo al leer el libro.
- Foco en otras pantallas (tarjeta nueva del repaso, ítems de la práctica con IA).
- Escapes en el formato de texto (EX-01, punto 6).
