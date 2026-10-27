# Spec Delta

## MODIFIED Requirements

### Requirement: El default de nuevas siembra los libros nuevos y la importación
El sistema SHALL usar `defaultNewCardsPerDay` del usuario como `newCardsPerDay` de cada libro que se crea: al guardar el diálogo "Nuevo libro", que solo pide nombre y materia (ver spec de libros), y al crear un libro desde la importación. Ninguno de los dos pregunta las nuevas por día. Los ajustes de un libro existente SHALL mostrar su propio valor, no el default. Crear un libro exige una sesión activa, así que el default siempre es el del usuario.

#### Scenario: Crear libro
- **WHEN** el usuario con `defaultNewCardsPerDay` 10 crea un libro con solo su nombre y su materia
- **THEN** el libro se guarda con `newCardsPerDay` 10, sin que el diálogo haya preguntado las nuevas por día

#### Scenario: Editar libro
- **WHEN** el usuario con `defaultNewCardsPerDay` 10 abre los ajustes de un libro que tiene `newCardsPerDay` 30
- **THEN** el campo de nuevas por día muestra 30

#### Scenario: Cambiar el default no altera libros existentes
- **WHEN** el usuario cambia `defaultNewCardsPerDay` de 20 a 5
- **THEN** los libros ya creados conservan su `newCardsPerDay`

#### Scenario: Importar un libro
- **WHEN** el usuario con `defaultNewCardsPerDay` 7 importa un libro
- **THEN** el libro se crea con `newCardsPerDay` 7
