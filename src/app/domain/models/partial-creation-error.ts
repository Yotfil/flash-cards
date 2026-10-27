import type { Card } from './card.model';

// Un alta por lotes que se cortó a mitad. Cada lote es atómico y lleva su propia suma al contador,
// así que lo ya creado se queda: quien lo muestra debe añadirlo, para que el reintento lo cuente
// como repetido en vez de duplicarlo sin avisar. El detalle técnico viaja en `cause`.
export class PartialCreationError extends Error {
  override readonly name = 'PartialCreationError';

  constructor(
    readonly createdCards: readonly Card[],
    cause: unknown,
  ) {
    super(`El alta se cortó tras crear ${createdCards.length}`, { cause });
  }
}
