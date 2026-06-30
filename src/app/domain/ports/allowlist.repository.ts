// Puerto de la lista de acceso (early access): consulta si un email está autorizado a usar la
// app, SIN saber que detrás está Firestore. La implementación vive en `infrastructure/firestore`.
// La lista se administra a mano desde la consola de Firebase; aquí solo se consulta.

export abstract class AllowlistRepository {
  /** True si el email está en la lista de acceso autorizada. */
  abstract isAllowed(email: string): Promise<boolean>;
}
