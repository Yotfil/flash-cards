# Programación espaciada Specification

## Purpose

Decidir, a partir del estado de programación de una tarjeta, de la calificación del usuario (1 a 4) y del instante del repaso, cuándo vuelve a tocar esa tarjeta y en qué estado queda. Es el único lugar donde vive el algoritmo de repetición espaciada (FSRS, con sus parámetros por defecto); el resto de la app solo le pide el estado inicial de una tarjeta nueva y la previsualización de los cuatro resultados posibles antes de calificar.

## Requirements

### Requirement: El algoritmo es FSRS con parámetros por defecto
El sistema SHALL programar los repasos con el algoritmo FSRS usando sus parámetros por defecto: retención deseada 90 %, intervalo máximo 36 500 días, sin aleatorización ("fuzz") de intervalos, y con pasos de aprendizaje a corto plazo de 1 y 10 minutos y un paso de reaprendizaje de 10 minutos. Los parámetros NO son configurables por usuario en esta versión.

#### Scenario: Mismo resultado para la misma entrada
- **WHEN** dos tarjetas con idéntico estado de programación se califican con el mismo grado en el mismo instante
- **THEN** obtienen exactamente el mismo nuevo estado y el mismo vencimiento (no hay aleatorización)

### Requirement: Una tarjeta nueva nace lista para estudiarse de inmediato
El sistema SHALL crear el estado de programación de una tarjeta recién creada con estado "nueva", vencimiento igual al instante de creación, estabilidad 0, dificultad 0, días transcurridos 0, días programados 0, paso de aprendizaje 0, repeticiones 0, fallos 0 y sin fecha de último repaso. Ese estado inicial SHALL ser idéntico al que el propio algoritmo produce para una tarjeta vacía en el mismo instante, de modo que una tarjeta creada por la app y una creada por el algoritmo se programan igual.

#### Scenario: Estado inicial
- **WHEN** se crea una tarjeta
- **THEN** su estado es "nueva", vence en el instante de creación, todos sus contadores están en cero y no tiene último repaso

#### Scenario: Equivalencia con el algoritmo
- **WHEN** se compara el estado inicial que crea la app con el que produce el algoritmo para el mismo instante
- **THEN** todos los campos coinciden

### Requirement: El estado de programación guardado espeja al algoritmo
El sistema SHALL guardar por tarjeta los siguientes campos de programación: vencimiento (instante), estabilidad, dificultad, días transcurridos, días programados, paso de aprendizaje pendiente, repeticiones, fallos, estado (nueva, aprendiendo, repaso o reaprendiendo) y último repaso (instante o ninguno). Estos campos SHALL bastar para reproducir el siguiente cálculo sin información adicional.

#### Scenario: Ida y vuelta
- **WHEN** se guarda el resultado de una calificación y más tarde se vuelve a cargar la tarjeta
- **THEN** la previsualización calculada sobre lo cargado coincide con la que se habría calculado sobre el resultado sin guardar

### Requirement: Antes de calificar se previsualizan los cuatro resultados
Dado el estado de programación de una tarjeta y un instante de referencia, el sistema SHALL calcular para cada grado (1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil): el nuevo estado de programación completo, el intervalo hasta el próximo vencimiento expresado en días enteros programados, el instante exacto del nuevo vencimiento y los valores previos del repaso para el historial. El cálculo SHALL ser puro: depende solo del estado recibido y del instante recibido. La previsualización que se muestra al presentar la tarjeta es informativa; el resultado que se guarda al calificar SHALL calcularse con el instante de la calificación, y su último repaso SHALL ser exactamente ese instante. El intervalo en días del resultado guardado coincide con el previsualizado salvo que entre ambos instantes haya cambiado el día.

#### Scenario: Cuatro resultados
- **WHEN** se pide la previsualización de una tarjeta
- **THEN** se obtienen cuatro resultados, uno por grado, cada uno con su nuevo estado, su intervalo en días, su vencimiento exacto y sus valores para el historial

#### Scenario: Se guarda lo previsualizado
- **WHEN** el usuario elige el grado 3 cuarenta segundos después de ver la previsualización
- **THEN** la tarjeta queda con el estado calculado para el grado 3 en el instante de la calificación, con el mismo intervalo en días que el previsualizado y con último repaso igual a ese instante

#### Scenario: El último repaso es el instante recibido
- **WHEN** se calcula el resultado de cualquier grado con un instante de referencia dado
- **THEN** el último repaso del nuevo estado es exactamente ese instante

### Requirement: El intervalo no decrece al subir el grado
Para una misma tarjeta e instante, el sistema SHALL garantizar que el intervalo en días del grado 1 es menor o igual al del 2, el del 2 menor o igual al del 3, y el del 3 menor o igual al del 4.

#### Scenario: Tarjeta en repaso
- **WHEN** una tarjeta en estado "repaso" se previsualiza
- **THEN** los intervalos cumplen 1 ≤ 2 ≤ 3 ≤ 4 (por ejemplo 0, 14, 21 y 38 días)

### Requirement: El intervalo de previsualización se expresa en días enteros
El sistema SHALL informar como intervalo los días programados enteros hasta el nuevo vencimiento, para que la cola y el historial trabajen en días. Mientras la tarjeta queda en aprendizaje o reaprendizaje (vence en minutos), el intervalo en días SHALL ser 0, aunque el vencimiento real sea 1, 6 o 10 minutos después; el vencimiento exacto SHALL seguir disponible en el resultado para mostrar esos minutos.

#### Scenario: Pasos de minutos se informan como cero días
- **WHEN** una tarjeta nueva se previsualiza
- **THEN** los grados 1, 2 y 3 informan 0 días con vencimientos exactos a minutos del instante, y el grado 4 informa varios días

### Requirement: Una tarjeta nueva entra en aprendizaje salvo que se marque Fácil
Al calificar una tarjeta "nueva", el sistema SHALL dejarla: con 1 (Otra vez) en "aprendiendo" venciendo 1 minuto después; con 2 (Difícil) en "aprendiendo" venciendo unos 6 minutos después; con 3 (Bien) en "aprendiendo" en su segundo paso venciendo 10 minutos después; con 4 (Fácil) directamente en "repaso" venciendo varios días después. En todos los casos las repeticiones pasan a 1 y los fallos siguen en 0.

#### Scenario: Nueva con Bien
- **WHEN** una tarjeta nueva se califica con 3
- **THEN** queda en "aprendiendo", vence 10 minutos después, repeticiones 1, fallos 0

#### Scenario: Nueva con Fácil
- **WHEN** una tarjeta nueva se califica con 4
- **THEN** queda en "repaso" y vence varios días después (8 días con los parámetros por defecto)

#### Scenario: Nueva con Otra vez
- **WHEN** una tarjeta nueva se califica con 1
- **THEN** queda en "aprendiendo" y vence 1 minuto después, sin contar como fallo

### Requirement: Una tarjeta en aprendizaje se gradúa a repaso con Bien o Fácil
Al calificar una tarjeta "aprendiendo", el sistema SHALL: con 1 volverla al primer paso (vence 1 minuto después); con 2 mantenerla aprendiendo (vence unos minutos después); con 3 o 4 graduarla a "repaso" con un vencimiento de al menos 1 día, mayor para 4 que para 3. Los fallos no cambian.

#### Scenario: Graduación
- **WHEN** una tarjeta en su último paso de aprendizaje se califica con 3
- **THEN** queda en "repaso" y vence al menos 1 día después

#### Scenario: Reinicio de pasos
- **WHEN** una tarjeta aprendiendo se califica con 1
- **THEN** sigue en "aprendiendo", vuelve al primer paso y vence 1 minuto después

### Requirement: Fallar una tarjeta en repaso la manda a reaprendizaje y cuenta un fallo
Al calificar con 1 una tarjeta "en repaso", el sistema SHALL pasarla a "reaprendiendo", vencer 10 minutos después, incrementar los fallos en 1 y NUNCA dejarla en "repaso". Con 2, 3 o 4 SHALL mantenerla en "repaso" con intervalos crecientes (Difícil < Bien < Fácil), sin tocar los fallos.

#### Scenario: Otra vez en repaso
- **WHEN** una tarjeta en repaso con 0 fallos se califica con 1
- **THEN** queda en "reaprendiendo", vence 10 minutos después y tiene 1 fallo

#### Scenario: Bien en repaso
- **WHEN** una tarjeta en repaso se califica con 3
- **THEN** sigue en "repaso" con un vencimiento más lejano que con 2 y más cercano que con 4

### Requirement: Una tarjeta en reaprendizaje vuelve a repaso con Bien o Fácil
Al calificar una tarjeta "reaprendiendo", el sistema SHALL: con 1 o 2 mantenerla reaprendiendo (vence minutos después); con 3 o 4 devolverla a "repaso" con un vencimiento de al menos 1 día. Los fallos no cambian en este paso.

#### Scenario: Recuperación
- **WHEN** una tarjeta reaprendiendo se califica con 3
- **THEN** queda en "repaso" y vence al menos 1 día después

#### Scenario: Sigue fallando
- **WHEN** una tarjeta reaprendiendo se califica con 1
- **THEN** sigue en "reaprendiendo" y vence minutos después, sin sumar otro fallo

### Requirement: Cada calificación actualiza repeticiones y último repaso
Con cualquier grado, el sistema SHALL incrementar las repeticiones en 1 y fijar el último repaso en el instante de referencia. Los días transcurridos del nuevo estado SHALL reflejar los días completos entre el último repaso anterior y el instante de referencia.

#### Scenario: Conteo de repeticiones
- **WHEN** una tarjeta con 2 repeticiones se califica
- **THEN** queda con 3 repeticiones y su último repaso es el instante de la calificación

### Requirement: El cálculo depende solo del instante de referencia, no de la zona horaria
El sistema SHALL calcular vencimientos e intervalos a partir del instante absoluto de referencia (el momento en que se muestra la tarjeta para previsualizar) y de los instantes guardados en la tarjeta. La zona horaria y la hora de inicio del día del usuario NO alteran el resultado del algoritmo; solo afectan a qué día de estudio se acredita el repaso.

#### Scenario: Dos zonas, mismo instante
- **WHEN** dos usuarios en zonas horarias distintas califican tarjetas idénticas en el mismo instante absoluto
- **THEN** ambas tarjetas obtienen el mismo vencimiento absoluto

### Requirement: El resultado incluye los valores previos del repaso para el historial
Cada resultado previsualizado SHALL incluir, para el historial: el estado antes del repaso, el vencimiento anterior, la estabilidad y dificultad anteriores, los días transcurridos desde el último repaso, los días transcurridos del repaso anterior y los días programados anteriores.

#### Scenario: Historial de una tarjeta en repaso
- **WHEN** una tarjeta en repaso programada a 2 días se califica 7 días después
- **THEN** los valores para el historial indican estado "repaso", 2 días programados y 7 días transcurridos

### Requirement: Los intervalos se muestran en formato humano por tramos
El sistema SHALL convertir la distancia entre el instante de referencia y el vencimiento exacto a texto así: vencimiento igual o anterior al instante → "ahora"; menos de 60 minutos → minutos redondeados al entero más cercano, mínimo 1 ("1 min", "6 min", "10 min"); menos de 24 horas → horas redondeadas ("1 h", "N h"); menos de 2 días → "1 día"; de 2 a 29 días → "N días"; de 30 a 364 → meses redondeados al entero más cercano a partir de días/30 ("1 mes" o "N meses"); 365 o más → años redondeados a partir de días/365 ("1 año" o "N años"). Los días SHALL contarse como días completos entre ambos instantes.

#### Scenario: Minutos
- **WHEN** el vencimiento está 1, 5,5 o 10 minutos después del instante
- **THEN** se muestra "1 min", "6 min" o "10 min" respectivamente

#### Scenario: Horas
- **WHEN** el vencimiento está 90 minutos o 5 horas después del instante
- **THEN** se muestra "2 h" o "5 h" respectivamente

#### Scenario: Menos de un día
- **WHEN** el vencimiento es igual o anterior al instante
- **THEN** se muestra "ahora"

#### Scenario: Días
- **WHEN** el vencimiento está 1 o 6 días después del instante
- **THEN** se muestra "1 día" o "6 días" respectivamente

#### Scenario: Meses
- **WHEN** el vencimiento está 30 o 45 días después del instante
- **THEN** se muestra "1 mes" o "2 meses" respectivamente

#### Scenario: Años
- **WHEN** el vencimiento está 365 días después del instante
- **THEN** se muestra "1 año"
