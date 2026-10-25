## MODIFIED Requirements

### Requirement: Una tarjeta nueva nace lista para estudiarse de inmediato
El sistema SHALL crear el estado de programación de una tarjeta recién creada con estado "nueva", vencimiento igual al instante de creación, estabilidad 0, dificultad 0, días transcurridos 0, días programados 0, paso de aprendizaje 0, repeticiones 0, fallos 0 y sin fecha de último repaso. Ese estado inicial SHALL ser idéntico al que el propio algoritmo produce para una tarjeta vacía en el mismo instante, de modo que una tarjeta creada por la app y una creada por el algoritmo se programan igual.

#### Scenario: Estado inicial
- **WHEN** se crea una tarjeta
- **THEN** su estado es "nueva", vence en el instante de creación, todos sus contadores están en cero y no tiene último repaso

#### Scenario: Equivalencia con el algoritmo
- **WHEN** se compara el estado inicial que crea la app con el que produce el algoritmo para el mismo instante
- **THEN** todos los campos coinciden

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

### Requirement: El intervalo de previsualización se expresa en días enteros
El sistema SHALL informar como intervalo los días programados enteros hasta el nuevo vencimiento, para que la cola y el historial trabajen en días. Mientras la tarjeta queda en aprendizaje o reaprendizaje (vence en minutos), el intervalo en días SHALL ser 0, aunque el vencimiento real sea 1, 6 o 10 minutos después; el vencimiento exacto SHALL seguir disponible en el resultado para mostrar esos minutos.

#### Scenario: Pasos de minutos se informan como cero días
- **WHEN** una tarjeta nueva se previsualiza
- **THEN** los grados 1, 2 y 3 informan 0 días con vencimientos exactos a minutos del instante, y el grado 4 informa varios días

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
