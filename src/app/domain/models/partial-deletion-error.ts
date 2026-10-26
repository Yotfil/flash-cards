// Un borrado por lotes que se cortó a mitad. Cada lote es atómico y lleva su propio descuento del
// contador, así que lo ya borrado no vuelve: quien reintenta debe pedir solo lo que falta (repetir
// los mismos ids descontaría dos veces las que ya no existen). El detalle técnico viaja en `cause`.
export class PartialDeletionError extends Error {
  override readonly name = 'PartialDeletionError';

  constructor(
    readonly deletedIds: readonly string[],
    cause: unknown,
  ) {
    super(`El borrado se cortó tras borrar ${deletedIds.length}`, { cause });
  }
}
