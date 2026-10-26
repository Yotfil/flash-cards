# Cadence — Guía de Rediseño UI/UX

> **Propósito.** Esta guía es un brief de rediseño **solo de interfaz y experiencia**. La tecnología ya está definida y la app está en vivo (`flash-cards-yotfil.netlify.app`); aquí no se habla de stack, datos ni arquitectura. El objetivo concreto del rediseño es resolver un problema real: **que la app invite a abrirse**. Hoy no da ganas de entrar; el rediseño existe para cambiar eso.

---

## 0. El problema a resolver

La frase que origina este rediseño es "no me apetece entrar a la app". Ese es el síntoma, y es el criterio con el que se mide cada decisión de abajo: **¿esto hace que dé más ganas de abrir la app y quedarse?**

Una app de estudio diario vive o muere por el deseo de volver. No se gana con features; se gana con tres sensaciones:

1. **Deseo de abrir** — que la primera pantalla sea bonita y recompense el gesto de entrar, en vez de recibir con una lista de tareas o configuración.
2. **Calma al usar** — que estudiar baje el ruido mental, no lo suba. Nada de interfaz saturada o agresiva.
3. **Momentum** — que terminar se sienta como un pequeño logro, para que mañana quieras repetir.

Todo el rediseño sirve a esas tres sensaciones. Si una decisión visual no aporta a ninguna, sobra.

### 0.1 Estado actual (diagnóstico sobre la app en vivo)

Diagnóstico tras recorrer la app en vivo (Home, Biblioteca, sesión de repaso). **Lo importante primero: estructuralmente está bien y hay mucho ya implementado correctamente.** El problema no es qué hace, sino que **se ve inerte**; es una capa de piel, no un rediseño de fondo.

**Lo que YA está bien y se conserva:**
- El flujo de la sesión de repaso en dos momentos (anverso grande → "Mostrar respuesta" → reverso + calificación) es correcto.
- Los **cuatro cerebros** ya existen, con la escala de color rojo→naranja→amarillo→verde, el **intervalo de retorno** bajo cada opción, los **atajos 1–4**, y una etiqueta "sugerido" sobre la opción recomendada. Buen trabajo; esto se mantiene y solo se repotencia visualmente.
- El ejemplo en inglés aparece integrado en el reverso ("The numbers don't add up").
- La tarjeta de estudio es superficie sólida sobre fondo (respeta la regla de "nada de acrílico en lo que se lee").
- La navegación (Hoy / Biblioteca / Progreso / Ajustes) y la Biblioteca están ordenadas; el libro importó bien (100 tarjetas, chip "English").

**El problema transversal (todas las pantallas):**
- **Fondo negro plano, sin profundidad.** Un negro uniforme hace que todo se sienta inerte y "sin terminar". Es la causa #1 del "no me apetece entrar". Falta el degradado azul noche → púrpura que da materialidad y sensación premium.
- **Superficies que casi no se distinguen del fondo.** Las tarjetas (de Home y de Biblioteca) tienen un borde tan tenue sobre el negro que no se leen como superficies; sin elevación, sin acrílico, nada "pide" ser tocado.
- **Acento teal de la paleta vieja.** El botón "Estudiar ahora" y los acentos en teal se ven genéricos sobre negro. Se reemplazan por el **azul eléctrico** de Cadence.
- **Marca de andamio.** El nombre "Flash-cards", el "v0.1.1" visible, y el copy "tarjeta(s)" con el "(s)" delatan trabajo en curso. Entra la identidad **Cadence** y el pulido de textos.

**Home (pantalla "Hoy"):**
- **Un ajuste metido en el héroe.** El selector "Tarjetas nuevas hoy (− N +)" vive encima de la tarjeta principal, justo donde debería haber solo belleza + la acción. Ensucia el momento que más debe invitar. Ese control debe vivir en los ajustes del libro (o, como mucho, plegado), no compitiendo con "Estudiar ahora".
- **Mucho vacío desaprovechado en escritorio.** El contenido se amontona en una columna arriba a la izquierda y deja un gran mar negro a la derecha. Falta composición y centrado.

**Sesión de repaso (lo más usado — repotenciar):**
- **Los cerebros se ven pequeños y apagados.** Los íconos son diminutos y el color no "canta"; cuesta leer la escala de un vistazo. Deben ser más grandes, con el relleno de color más vivo y el estado activo/apagado más marcado (el conteo como diferenciador redundante, §8).
- **La barra de calificación ocupa todo el ancho en escritorio**, lo que la hace sentir pesada. En pantallas anchas conviene centrarla y limitar su ancho máximo, como una fila compacta de cuatro opciones.
- **La tarjeta flota en negro sin presencia.** Aunque bien que sea sólida, le falta un contenedor que la enmarque y la asiente (sutil elevación, un borde apenas perceptible, el degradado detrás).

Ninguno de estos es un error grave por separado; juntos producen exactamente la sensación de "no me apetece entrar". El rediseño los ataca todos con el sistema visual de abajo, **sin tocar la estructura que ya funciona**.

---

## 1. Identidad: Cadence

**Nombre del producto: Cadence.** Evoca el ritmo del repaso espaciado (la cadencia del repaso), suena limpio y moderno, y no encasilla la app en idiomas (sirve igual para cualquier materia).

**Norte de identidad: "calma enfocada", en registro nocturno.** Una app serena, sofisticada y premium, que invita a volver sin gritar. Ni la frialdad clínica e intimidante de Anki, ni el exceso lúdico y ruidoso de Duolingo. La estética es **oscura, profunda y elegante** —azul noche degradando a púrpura— con superficies de vidrio esmerilado (acrílico) que dan sensación de profundidad y materialidad. Cuando se abre a estudiar, la interfaz baja el ruido en vez de subirlo.

Esa sensación "premium y nocturna" es, en sí misma, parte de la solución al problema: una app que se ve cuidada y serena da más ganas de abrirse que una funcional pero plana.

---

## 2. Paleta de color (paleta "Cadence")

- **Fondo:** degradado **contenido y casi monocromo**, de azul muy oscuro (azul noche) a púrpura oscuro. El degradado es sutil, no un arcoíris; su trabajo es dar profundidad sin competir con el contenido.
- **Acento interactivo: azul eléctrico** — `#38BDF8`, con `#2563EB` como tono profundo para los degradados (p. ej. el botón principal va de `#38BDF8` a `#2563EB`). Se usa en botones de acción, elementos activos, foco y la etiqueta "sugerido". Es vecino del fondo azul noche, por eso se siente sereno; y es vivo sin caer en el azul corporativo. Texto sobre el acento: azul muy oscuro (`#06142E`), no blanco. *(Se evaluaron lavanda, índigo, cian, magenta y turquesa; se eligió azul eléctrico.)*
- **Vinotinto:** solo como **viso decorativo escaso y puntual** (un detalle, un borde sutil, un acento gráfico). **Nunca** como color de botones de acción, y **nunca** en la pantalla de repaso. Razón crítica: el vinotinto es un rojo y colisionaría visual y semánticamente con el "rojo = no la recordé" de la calificación (ver §8).
- **Escala semántica de la calificación, reservada e intocable:** el rojo → naranja → amarillo → verde de los cuatro cerebros tiene significado (mal → bien). Esos colores se reservan exclusivamente para eso. Por eso el acento de marca es **azul eléctrico** (no rojo, naranja, amarillo ni verde): no compite con ninguno de los grados.
- **Texto:** claro (blanco azulado muy claro, `#EAF0FF`) sobre las superficies oscuras, cuidando contraste suficiente (mínimo WCAG AA) en toda la app.

---

## 3. Transparencias y acrílico (glassmorphism) — dónde SÍ y dónde NO

Regla rectora: **el acrílico va en el "chrome" (lo que rodea), nunca en el escenario (lo que se lee).** El vidrio esmerilado reduce el contraste por diseño, así que en la superficie que más se lee generaría fatiga visual y problemas de accesibilidad.

**El vidrio NO es completamente transparente:** siempre lleva una capa de color semitransparente POR DEBAJO del desenfoque, para garantizar el contraste del texto. La fórmula de cada superficie de vidrio es: *color base oscuro semitransparente + desenfoque del fondo + borde sutil de 1px semiclaro*. Nunca transparencia pura.

**SÍ llevan acrílico** (vidrio con desenfoque):
- Barra de navegación (inferior en móvil / lateral en escritorio).
- Modales y diálogos.
- Paneles y hojas secundarias (ajustes, menús, filtros).
- Cabeceras flotantes (p. ej. la barra de progreso de la sesión).
- Tarjetas de la biblioteca / listados (listado de libros), donde el desenfoque sobre el degradado se ve bien y el texto es corto.

**NO llevan acrílico** (superficie casi sólida, alto contraste):
- **La tarjeta de estudio** (anverso/reverso de la sesión de repaso): es la superficie que más se lee, cientos de veces al día. Fondo casi sólido, texto nítido. Innegociable.
- Áreas con bloques largos de texto para leer.

**Parámetros de referencia del vidrio** (afinables después):
- Opacidad de la capa de color base: **~60–75%** (se ve a través "con algo de blur", no transparente del todo).
- Desenfoque de fondo: **medio** (~12–20px). Suficiente para el efecto, sin exagerar.
- Borde: 1px, blanco azulado a baja opacidad (~10–20%), para definir el canto del "acrílico".

**Nota de rendimiento (es una PWA, corre en celulares):** el desenfoque de fondo es costoso para la GPU. Regla: **pocas capas de vidrio visibles a la vez** (no anidar vidrio sobre vidrio), y evitar desenfoque en elementos que animan constantemente. En gama media, demasiadas capas de acrílico causan tirones.

---

## 4. Modo oscuro y claro

- **Oscuro primero.** La estética nocturna con acrílico ES la identidad de Cadence; se diseña y afina el modo oscuro primero.
- El **modo claro** existe (mucha gente estudia de día), pero es una variante **más plana y sobria, SIN acrílico** (el vidrio esmerilado pierde su gracia sobre fondo claro). No se renuncia al modo claro; se acepta que el efecto vidrio es exclusivo del oscuro.

---

## 5. Tipografía

- Una sola familia **sans-serif**, de alta legibilidad y buen soporte de acentos (inglés y, enseguida, francés). Varios pesos (regular, medio, semibold) dan toda la jerarquía; no combinar tres fuentes.
- Contenido de tarjetas: máxima legibilidad, tamaño generoso, **alto contraste** (texto claro sobre superficie oscura casi sólida).
- La jerarquía se construye con **peso y tamaño**, no con muchos colores. En una interfaz oscura, el contraste tipográfico es lo que ordena la lectura.
- Nota futura: los símbolos fonéticos (IPA) necesitarán una fuente que los soporte; la elección actual no debe cerrar esa puerta.

---

## 6. Movimiento y micro-interacciones

El movimiento es una de las palancas más fuertes para que la app "dé gusto". Pero con disciplina:

- El movimiento da **continuidad y feedback, nunca decora**. Momentos con propósito: la tarjeta que se **voltea** para revelar la respuesta, la **transición suave** entre tarjetas, el **cerebro que confirma** el toque de calificación, el **cierre de sesión** que celebra brevemente.
- Todo **rápido y discreto**. Una animación lenta en una acción que se repite cien veces al día se vuelve tortura. Prueba de fuego: ¿ayuda a entender qué pasó, o solo adorna? Si solo adorna, fuera.
- **Respetar la preferencia del sistema "reducir movimiento"** (accesibilidad).

Estos detalles —el voltear de la tarjeta, el pequeño brillo al acertar— son justamente lo que hace que una app se sienta *viva* y con la que da gusto interactuar. Es donde Cadence se separa de la rigidez de Anki.

### 6.1 Especificación de cada animación

Valores validados en el prototipo interactivo (`cadence-prototipo.html`), que es la **referencia visual** de cómo debe sentirse cada movimiento. Se definen como tokens de movimiento (duraciones y curvas) en el mismo punto único que los colores.

**Curvas:** salida suave `cubic-bezier(.2,.8,.2,1)` para casi todo (arranca rápido y frena al llegar); entrada `cubic-bezier(.5,0,.75,0)` solo para elementos que se van de la pantalla.

| Momento | Qué pasa | Duración |
|---|---|---|
| Presionar cualquier botón | Se hunde a 97% de su tamaño y vuelve | 120 ms |
| Cambio de pantalla (Hoy → Repaso → Cierre) | La nueva entra subiendo levemente y aparece; la anterior se encoge un poco y desaparece | 360 ms |
| Mostrar respuesta | La tarjeta se voltea en 3D sobre su eje vertical | 500 ms |
| Aparición de los cerebros | Suben y aparecen en cascada, 40 ms entre uno y otro, empezando ~180 ms después de iniciar el volteo | 280 ms c/u |
| Elegir un cerebro | El botón hace un pequeño rebote, se ilumina con su color y sus íconos crecen en cascada | 260 ms |
| Salida de la tarjeta | Sale hacia la izquierda con un leve giro y se desvanece | 260 ms |
| Entrada de la siguiente | Entra desde la derecha, un poco reducida, hasta su lugar | 320 ms |
| Barra de progreso | Avanza al calificar, no al cambiar de tarjeta | 400 ms |
| Indicador de la navegación | La píldora de fondo se desliza a la pestaña elegida | 320 ms |
| Cierre de sesión | El anillo se completa (900 ms), luego se dibuja el check (380 ms), el número sube de 0 al total y aparece el resumen por colores | ~1.5 s en total |
| Luz del borde (tarjeta principal de Hoy) | Un destello azul con halo suave recorre el borde, siempre activo, sin hover | 7 s por vuelta, velocidad constante |
| Luz del borde al quedar al día | La luz se desvanece y el borde queda fijo en azul a media intensidad | 700 ms |

**La luz del borde es una señal, no un adorno.** Gira solo mientras hay tarjetas pendientes hoy; al terminar se detiene y el borde queda fijo. De un vistazo dice "aún te falta" o "ya cumpliste". Por eso:
- Va **únicamente** en la tarjeta principal de Hoy. No se pone en todas las tarjetas: si todo brilla, nada significa algo.
- **Nunca** en la tarjeta de estudio: es la superficie de lectura y un movimiento constante en su borde distrae del esfuerzo de recordar.
- Es lenta a propósito (calma, no urgencia).
- Técnica de referencia: un degradado cónico cuyo ángulo se anima, recortado para que solo se vea en el borde, con un resplandor exterior. Ver `cadence-prototipo.html`.
- Con "reducir movimiento" activado, la luz no gira: el borde se muestra quieto en azul.

**Hover vs. presión:**
- El **hover** solo existe en dispositivos con cursor (se activa únicamente cuando el dispositivo soporta hover). En celular no hay hover; así se evitan estados "pegados" después de tocar.
- La **respuesta al presionar** (el hundimiento de 120 ms) funciona igual con mouse y con el dedo, y es la que da sensación de botón físico en el teléfono.
- En celular se ocultan los números de atajo (1–4) bajo los cerebros, porque no hay teclado.

**Reducir movimiento:** si el sistema tiene activada esa preferencia, todas las transiciones se vuelven instantáneas (los cambios de estado ocurren igual, sin animación) y el conteo del cierre muestra el total directamente.

---

## 7. Voz y tono de los textos

**Cálida, breve, humana, serena.** Habla como un buen mentor, no como un manual técnico ni como un coach eufórico. Celebra sin exagerar, corrige sin culpar, guía sin abrumar. Al terminar una sesión no dice "¡¡INCREÍBLE RACHA!!"; dice algo tranquilo y satisfactorio. Cuando algo falla, habla claro y da la mano. Consistente desde los botones hasta los mensajes de error. El tono es parte de la sensación de calma.

---

## 8. Sistema de calificación: cuatro cerebros 🧠

La forma en que el usuario califica cada tarjeta. Cuatro íconos de **cerebro** en una fila, calificación en **un solo toque** (minimizar pasos):

| Cerebros | Color | Significado |
|----------|-------|-------------|
| 1 | Rojo | No la recordé |
| 2 | Naranja | Me costó mucho |
| 3 | Amarillo | Bien |
| 4 | Verde | Fácil |

Por qué cerebro y no estrella: las estrellas significan "qué tan bueno es *esto*" (calificar un producto); aquí el usuario se califica **a sí mismo** (qué tan bien recordó). El cerebro apunta a la metáfora correcta (memoria) y desliga de Anki.

**Requisitos de la interacción:**
- **Cada cerebro es un objetivo de toque independiente y amplio**, no una barra de "llenado". Se toca la posición deseada directamente (certero en móvil).
- **Dos estados visuales claros por cerebro:** "activo/lleno" vs "tenue/apagado", para que el conteo (1 activo vs 4 activos) funcione como **diferenciador redundante al color** (accesibilidad/daltonismo). El color es refuerzo, no la única señal.
- **Microcopy encima:** "¿Qué tan bien la recordaste?" — ancla la metáfora hacia el usuario.
- **Debajo de cada opción, cuándo volverá la tarjeta** si se elige ("verde → 6 días"). Hace tangible que el sistema responde a la honestidad.
- **Atajos de teclado en escritorio:** teclas 1–4.

---

## 9. Las pantallas (rediseño)

Regla de marco que aplica a todas: **mobile-first de verdad.** Se diseña primero la pantalla angosta y luego cómo se expande. En móvil, navegación inferior (bottom tabs); en escritorio, esa misma navegación se vuelve lateral y el contenido se centra. Un solo diseño que respira distinto según el ancho, no dos.

Dos tonos conviven y conviene mantenerlos separados: el flujo de **estudiar** (enfocado, sin distracción, pantalla completa) y el de **administrar** (tranquilo, con navegación). Esa separación es lo que hace que la app se sienta limpia.

### 9.1 Home / Hoy — la pantalla que resuelve "no me apetece entrar"
Es la primera que se ve al abrir, y la más importante para este rediseño. Debe responder en un segundo a "¿qué estudio ahora?" **y** recompensar el gesto de abrir.
- Fondo con el degradado azul noche → púrpura; sensación premium desde el primer instante.
- **Bloque protagonista:** "Tienes X tarjetas para repasar hoy" con un botón grande **Estudiar ahora** (acento azul eléctrico) que arranca la sesión global. Es lo primero y más grande: la acción, no la configuración.
- Dato de **racha** discreto (motivación sin presión).
- Lista de **libros** con su pendiente ("Phrasal Verbs — 12 por repasar, 8 nuevas"), en tarjetas de acrílico sobre el degradado.
- Si no hay nada pendiente: estado positivo de recompensa, no una pantalla muerta (ver §10).
- Jerarquía intencional: **estudiar** manda; crear y administrar es secundario. Anki recibe con configuración; Cadence recibe con la acción y con belleza.

### 9.2 Biblioteca / detalle de un libro
Modo "gestión", tranquilo.
- Cabecera del libro: nombre, materia, totales (dominadas / en aprendizaje / nuevas) y botón **estudiar este libro**.
- Lista de **capítulos** con su conteo, en tarjetas de acrílico.
- Lista de **tarjetas**: vista compacta anverso → reverso; buscar/filtrar cuando el volumen lo pida.
- Acciones: agregar tarjeta, editar, **suspender** (apartar sin borrar), borrar, y ajustes del libro.

### 9.3 Importar un libro
El flujo que da confianza: el usuario nunca guarda a ciegas.
1. **Seleccionar archivo.** Nombre del libro precargado y editable.
2. **Previsualización** (pantalla clave): cuántos capítulos y tarjetas se detectaron, y una sección visible de **líneas problemáticas** con su motivo. Nada se guarda todavía.
3. **Confirmar** → recién aquí se guarda.

El valor de UX aquí es la **previsualización antes de guardar** y el **reporte claro de lo que no se pudo importar**. Eso convierte un posible fallo en algo entendible.

### 9.4 Crear / editar tarjeta y libro
Formularios simples, baja fricción.
- **Crear libro:** nombre, materia y ajustes con valores por defecto ya puestos. Crear = un gesto, no un formulario largo.
- **Crear/editar tarjeta:** dos campos protagonistas (anverso, reverso) + a qué capítulo va. Campos opcionales (ejemplo, pronunciación, notas) **plegados tras un "más opciones"**, para no abrumar en el caso común.

### 9.5 Sesión de repaso — el corazón
Pantalla completa, sin barra de navegación, sin ruido. **Aquí la tarjeta es superficie sólida de alto contraste, sin acrílico** (es lo que más se lee).
- **Momento 1 — pregunta:** solo el anverso, centrado y grande, y un botón único **Mostrar respuesta** (o tocar en cualquier lado / barra espaciadora). El esfuerzo de recordar antes de revelar es donde ocurre el aprendizaje; la UI lo respeta sin distracciones.
- **Momento 2 — calificación:** se revela el reverso (y los opcionales que tenga) y aparecen los **cuatro cerebros** (§8), cada uno con su intervalo de retorno.
- Apoyo discreto: barra/contador de progreso de la sesión (en acrílico, flotante, tenue), que no compite con la tarjeta.
- Salir en cualquier momento sin perder lo hecho.
- La animación de **voltear la tarjeta** al revelar la respuesta es un momento clave de deleite; que se sienta fluido y satisfactorio.

### 9.6 Cierre de sesión
No devolver secamente al Home. Una pantalla breve y satisfactoria: cuántas repasaste, cómo te fue, qué sigue. Es el **momento de recompensa** que cierra el lazo del hábito y alimenta el "momentum" del §0. Aquí sí cabe una pequeña celebración (una animación corta, el anillo de progreso que se completa en azul eléctrico), siempre serena.

### 9.7 Progreso
Sobrio y honesto: pendientes hoy, repasadas hoy, distribución de calificaciones y estado de la colección (nuevas / en aprendizaje / dominadas). Nace humilde y se diseña para crecer. Las gráficas usan la escala de la calificación con coherencia; el resto, el acento azul eléctrico.

### 9.8 Ajustes
Perfil, tema (claro/oscuro/sistema), zona horaria y hora de inicio del día, cerrar sesión. Limpio y ordenado; es justamente donde Anki abruma con decenas de opciones y Cadence muestra solo lo esencial.

### 9.9 Mapa de navegación
Cuatro destinos (inferior en móvil, lateral en escritorio), en barra de acrílico:

```
Hoy   ·   Biblioteca   ·   Progreso   ·   Ajustes
```

- **Hoy** → botón grande → **Sesión de repaso** (pantalla completa) → **Cierre** → vuelve a Hoy.
- **Biblioteca** → **Detalle de libro** → tarjetas; y también → **Importar** y → **Crear/editar**.
- La **Sesión de repaso** se lanza desde Hoy (global) o desde un libro (filtrada); siempre es el mismo componente de pantalla completa.

---

## 10. Estados vacíos, de carga y de error

Separan una app pulida de una a medio hacer, y pesan directamente en el "da gusto o no entrar".

- **El estado vacío es una oportunidad, no un hueco.** Suele ser la primera pantalla de un usuario nuevo. Muestra qué hacer a continuación; enseña y dirige.
  - *Home sin libros:* bienvenida que orienta + acción única protagonista (crear o importar tu primer libro). El vacío ES el onboarding.
  - *Home al día:* estado positivo de recompensa ("Estás al día"), con opciones suaves, sin presionar.
  - *Libro sin tarjetas:* dirige a las dos formas de llenarlo.
  - *Progreso sin datos:* promete el valor futuro, no muestra gráficas vacías rotas.
- **Cargar nunca debe sentirse como congelado.** Usar **skeletons** (siluetas con la forma del contenido que viene), no spinners. El skeleton hace sentir la app más rápida y cuida la sensación premium.
- **Un error dice qué pasó y qué hacer, nunca deja varado.** Mensaje humano (no códigos técnicos) y siempre una salida (reintentar, volver).
  - *Sin conexión:* no es un error, es un **modo**. Indicador discreto: "estás offline, tus repasos se guardarán y sincronizarán al volver".

Implementar estos estados como piezas **reutilizables y consistentes**, para que toda la app se sienta parte del mismo sistema.

---

## 11. Principios de diseño (resumen operativo)

1. **Invitar a entrar.** Cada pantalla se mide contra las tres sensaciones del §0: deseo de abrir, calma, momentum.
2. **Baja fricción.** Minimizar pasos, toques y campos. Defaults sensatos. La acción principal siempre a un gesto.
3. **El acrílico rodea, no protagoniza.** Vidrio en el chrome; la tarjeta de estudio siempre sólida y de alto contraste.
4. **Un acento, con disciplina.** Azul eléctrico para lo interactivo; la escala rojo→verde reservada a la calificación; vinotinto solo como viso.
5. **Mobile-first y accesible.** Objetivos de toque amplios, contraste suficiente, conteo redundante al color, "reducir movimiento" respetado.
6. **Materia-agnóstico.** La interfaz sirve igual para inglés, medicina o comunicación; nada en la UI asume "idiomas" salvo lo marcado como tal (pronunciación/audio, a futuro).
7. **Fácil de re-pintar.** Los valores de color, desenfoque y espaciado viven en un punto único, de modo que ajustar la identidad (un tono, la intensidad del vidrio) sea una sola indicación, no una cacería. Esto permite afinar la estética *sobre la app real* sin reescribir pantallas.

---

## 12. Prioridad del rediseño

Como el objetivo es que dé ganas de entrar, el orden sugerido ataca primero lo que más se ve y más se usa:

1. **El sistema base** (degradado de fondo, acento azul eléctrico, estilo de acrílico, tipografía) — define la sensación global de un golpe.
2. **Home / Hoy** — es la primera impresión y el corazón del problema.
3. **Sesión de repaso + cierre** — lo que más se usa y donde vive el deleite (voltear la tarjeta, los cerebros, la celebración).
4. **Biblioteca y navegación** — el marco de acrílico.
5. **Estados vacíos/carga/error** — el pulido que eleva la percepción de calidad.
6. **Ajustes, importar, crear** — importantes, pero de menor peso en la primera impresión.

Afinar los tonos exactos es de las últimas cosas, no de las primeras: se hace sobre la app real, y es barato porque todo vive en un punto único.
