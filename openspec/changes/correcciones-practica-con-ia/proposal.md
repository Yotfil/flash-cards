# Correcciones de la revisión adversarial en la práctica con IA (1.1.0)

## Why

La revisión adversarial (2026-10-26, sección `practica-con-ia`) encontró cuatro fallos que el usuario decidió arreglar
antes del release 1.1.0: uno alto (un ítem borrado en otro dispositivo deja ilegibles todos los paquetes) y tres bajos
(una práctica que no termina nunca, "practicar" sin calificar nada y un prompt de cierre con el día equivocado). Los
cuatro cambian o precisan la letra de la spec base `practica-con-ia`, así que van con su delta.

## What Changes

- **IA-01 (alto). Un ítem borrado en otro dispositivo ya no rompe la lectura.** Hoy, calificar o editar desde un
  dispositivo con la lista vieja deja en el paquete un resto incompleto del ítem. La frontera rechaza el documento
  entero y la Biblioteca y Hoy dicen "No pudimos cargar tus paquetes." para siempre, en los dos dispositivos. Con el
  arreglo, al leer solo cuentan los ítems que el paquete lista: un resto suelto se ignora y se registra. Además,
  editar un ítem que ya no existe falla con el error del formulario y no escribe nada.
- **IA-02 (bajo). Si el paquete se borró en otro dispositivo, la práctica se cierra.** Hoy, cada nota rechazada
  vuelve a la cola y la práctica no termina nunca. Con el arreglo, la práctica se cierra con "Este paquete ya no
  existe" y un enlace a la Biblioteca. Los demás rechazos siguen como en el repaso: el ítem vuelve al final con su aviso.
- **IA-03 (bajo). Practicar es calificar.** Hoy, abrir "Practicar hoy" y salir sin calificar nada ya cuenta como "Ya
  practicaste hoy": fija el conjunto del día, deja fuera lo que se agregue después y habilita un prompt que dice que
  se practicó todo. Con el arreglo, el conjunto se fija con la primera calificación del día.
- **IA-04 (bajo). El prompt del cierre usa el día de la práctica.** Si la práctica cruza el inicio del día de
  estudio, hoy el cierre anuncia "3 para reforzar con la IA" pero el prompt sale sin difíciles. Con el arreglo, el
  prompt del cierre se arma con el día en que se practicó.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `practica-con-ia`: cambian cinco requisitos.
  - "Los ítems se agregan a mano o pegando texto…": editar un ítem que ya no existe falla.
  - "«Para hoy» son los ítems nuevos…": el conjunto se fija con la primera calificación del día.
  - "La práctica usa la pantalla de repaso…": un paquete que ya no existe cierra la práctica.
  - "El cierre de la práctica ofrece el prompt…": el prompt usa el día de la práctica.
  - "Los datos de los paquetes se validan en la frontera…": los restos de un ítem borrado se ignoran y se registran.

## Impact

- **Repositorio de paquetes** (adaptador y esquema de la frontera):
  - la lectura valida solo los ítems listados y registra los restos sueltos (el adaptador recibe el registro);
  - editar pasa a una transacción;
  - calificar traduce "el documento no existe" a un error del dominio.
- **Puerto de paquetes:** dos errores nuevos del dominio, "el paquete ya no existe" y "el ítem ya no existe".
- **Servicio de paquetes:**
  - preparar ya no fija el conjunto;
  - un método nuevo lo fija con la primera nota;
  - el prompt acepta el día de la práctica.
- **Sesión de práctica** (estado puro y servicio): un estado nuevo, "el paquete ya no existe"; la primera nota fija el
  conjunto; la sesión expone su día.
- **Pantalla de práctica:** el estado "ya no existe" y el prompt del cierre con el día de la sesión.
- **Datos:** compatibles. No cambia la forma de los documentos y no se migra nada. Los restos sueltos que ya existan
  dejan de estorbar al leer.

## Fuera de alcance

- **IA-05 e IA-06:** informativos, quedan para después del release.
- **Rechazos permanentes en el repaso y por acceso retirado:** con `permission-denied` (acceso retirado a mitad de una
  práctica) o en el repaso, cada nota rechazada sigue volviendo al final. Es el tema transversal de la revisión y
  queda para después del release.
- **Limpiar los restos sueltos en el almacén:** leer no escribe; quedan ignorados.
- **Un mensaje propio para "este ítem ya no existe" en el formulario:** sale el error genérico, igual que al editar
  una tarjeta que otro dispositivo borró.
