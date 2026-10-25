import type { Card, CardContentChanges, NewCard } from '../models/card.model';

// Tarjetas del usuario en el almacén. Crear y borrar ajustan el contador de tarjetas del libro EN
// EL MISMO LOTE que las tarjetas, para que nunca quede desfasado (ni tras un fallo a mitad).
export abstract class CardRepository {
  /** Las tarjetas del capítulo (sin orden: lo da el servicio). Lanza si una no es válida. */
  abstract listByChapter(uid: string, chapterId: string): Promise<Card[]>;
  /** Crea una tarjeta y suma 1 al libro. */
  abstract create(uid: string, card: NewCard): Promise<Card>;
  /** Crea varias tarjetas de un mismo libro en lotes, cada lote con su suma al libro. */
  abstract createMany(uid: string, cards: readonly NewCard[]): Promise<Card[]>;
  abstract updateContent(uid: string, cardId: string, changes: CardContentChanges): Promise<void>;
  abstract setSuspended(uid: string, cardId: string, suspended: boolean): Promise<void>;
  /** Borra una tarjeta y resta 1 al libro. El historial de repasos se conserva. */
  abstract deleteWithCount(uid: string, bookId: string, cardId: string): Promise<void>;
  /**
   * Borra varias en lotes, cada uno con su resta; devuelve cuántas borró. Si un lote falla tras
   * confirmarse otros, lanza `PartialDeletionError` con las ya borradas.
   */
  abstract deleteManyWithCount(
    uid: string,
    bookId: string,
    cardIds: readonly string[],
  ): Promise<number>;
}
