# Spec Delta

## MODIFIED Requirements

### Requirement: Guardar un ajuste fusiona el cambio sobre los ajustes actuales y actualiza la sesión
El sistema SHALL aplicar cada cambio como una actualización parcial sobre los ajustes vigentes: SHALL persistir solo los ajustes cambiados, sin reescribir el resto del perfil ni los ajustes guardados que esta versión de la app no conozca (los que añada una versión posterior), y SHALL reflejar el nuevo valor en la sesión en cuanto el guardado termine, aplicado sobre el perfil vigente en ese momento, de modo que el resto de la app lo vea sin recargar y dos ajustes cambiados seguidos se conserven los dos. Sin sesión activa, la actualización SHALL fallar con un error explícito.

#### Scenario: Cambiar un ajuste no toca los otros
- **WHEN** el usuario guarda `defaultNewCardsPerDay` 5
- **THEN** `timezone`, `dayStartHour`, `theme` y `autoGradeByTime` conservan sus valores

#### Scenario: La sesión refleja el cambio al instante
- **WHEN** el guardado de `autoGradeByTime` termina con éxito
- **THEN** la próxima sesión de repaso usa ya el nuevo valor sin recargar la app

#### Scenario: Un ajuste que esta versión no conoce sobrevive
- **WHEN** el perfil guarda un ajuste que añadió una versión posterior de la app y, desde esta versión, el usuario cambia el tema
- **THEN** el tema queda cambiado y el ajuste desconocido conserva su valor

#### Scenario: Dos ajustes seguidos se guardan los dos
- **WHEN** el usuario toca "Claro" y, antes de que termine ese guardado, desmarca "Sugerir calificación por tiempo"
- **THEN** el perfil queda con `theme` `light` y `autoGradeByTime` `false`, y la app sigue en claro
