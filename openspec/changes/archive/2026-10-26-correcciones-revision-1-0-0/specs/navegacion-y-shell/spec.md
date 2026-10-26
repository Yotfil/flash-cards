# Spec Delta

## ADDED Requirements

### Requirement: Un fallo que ninguna pantalla prevé se avisa de forma discreta
Cuando ocurra un error que ninguna pantalla maneja, el sistema SHALL registrarlo en el registro de errores de la app y SHALL mostrar un aviso discreto y sólido con el texto "Algo salió mal. Si se repite, recarga la app." y una acción para cerrarlo, anunciado como alerta accesible. El aviso SHALL verse en cualquier pantalla, también en las de pantalla completa (repaso, práctica), sin tapar la navegación. Varios fallos seguidos SHALL mostrar un único aviso. Un fallo que una pantalla ya explica con su propio mensaje NO SHALL producir además este aviso.

#### Scenario: Fallo no previsto
- **WHEN** ocurre un error que ninguna pantalla maneja
- **THEN** queda registrado y aparece el aviso "Algo salió mal. Si se repite, recarga la app."

#### Scenario: Varios fallos seguidos
- **WHEN** ocurren tres errores no previstos seguidos
- **THEN** se ve un único aviso

#### Scenario: Cerrar el aviso
- **WHEN** el usuario toca la acción de cerrar del aviso
- **THEN** el aviso desaparece, y vuelve a aparecer solo si ocurre otro fallo no previsto

#### Scenario: Un fallo que la pantalla ya explica
- **WHEN** falla el guardado de un diálogo y el diálogo muestra su propio mensaje de error
- **THEN** no aparece además el aviso global
