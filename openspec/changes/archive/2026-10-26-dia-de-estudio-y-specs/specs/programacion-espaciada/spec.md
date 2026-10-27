# Spec Delta

## MODIFIED Requirements

### Requirement: Los intervalos se muestran en formato humano por tramos
El sistema SHALL convertir la distancia entre el instante de referencia y el vencimiento exacto a texto así: vencimiento igual o anterior al instante → "ahora"; menos de 60 minutos → minutos redondeados al entero más cercano, mínimo 1 ("1 min", "6 min", "10 min"); menos de 24 horas → horas redondeadas ("1 h", "N h"); menos de 2 días → "1 día"; de 2 a 29 días → "N días"; de 30 a 364 → meses redondeados al entero más cercano a partir de días/30 ("1 mes" o "N meses"); 365 o más → años redondeados a partir de días/365 ("1 año" o "N años"). Los días SHALL contarse como días completos entre ambos instantes. Si el redondeo de un tramo llega al primer valor del tramo siguiente, SHALL mostrarse el tramo siguiente: nunca "60 min", "24 h" ni "12 meses".

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

#### Scenario: El redondeo llega al tramo siguiente
- **WHEN** el vencimiento está 59,6 minutos, 23,7 horas o 345 días después del instante
- **THEN** se muestra "1 h", "1 día" o "1 año" respectivamente
