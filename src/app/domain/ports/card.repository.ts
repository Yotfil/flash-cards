import type { Card, CardContentChanges, NewCard } from '../models/card.model';

// Tarjetas del usuario en el almacén. Crear y borrar ajustan el contador de tarjetas del libro EN
// EL MISMO LOTE que las tarjetas, para que nunca quede desfasado (ni tras un fallo a mitad).
export abstract class CardRepository {
  /** Las tarjetas del capítulo (sin orden: lo da el servicio). Lanza si una no es válida. */
  abstract listByChapter(uid: string, chapterId: string): Promise<Card[]>;
  /**
   * Las tarjetas de la cuenta que vencen hasta `before` (incluidas las nuevas, que vencen al
   * crearse). No filtra suspendidas ni ordena: eso es de la cola. Lanza si una no es válida.
   */
  abstract listReady(uid: string, before: Date): Promise<Card[]>;
  /** Lo mismo, solo las de un libro. */
  abstract listReadyByBook(uid: string, bookId: string, before: Date): Promise<Card[]>;
  /**
   * TODAS las tarjetas del libro tal como están en el servidor (para exportar). Nunca responde con
   * la caché local, que puede tener solo parte del libro: sin red, falla.
   */
  abstract listByBookFromServer(uid: string, bookId: string): Promise<Card[]>;
  /**
   * Las tarjetas del libro con la lectura normal: sin red responde con lo que el dispositivo tenga
   * guardado (para practicar, una caché parcial basta).
   */
  abstract listByBook(uid: string, bookId: string): Promise<Card[]>;
  /** Crea una tarjeta y suma 1 al libro. Falla si su capítulo ya no existe. */
  abstract create(uid: string, card: NewCard): Promise<Card>;
  /**
   * Crea varias tarjetas de un mismo capítulo en lotes, cada lote con su suma al libro. Un lote
   * falla entero si el capítulo ya no existe (otro dispositivo lo borró).
   */
  abstract createMany(uid: string, cards: readonly NewCard[]): Promise<Card[]>;
  abstract updateContent(uid: string, cardId: string, changes: CardContentChanges): Promise<void>;
  abstract setSuspended(uid: string, cardId: string, suspended: boolean): Promise<void>;
  /**
   * Borra las tarjetas indicadas del capítulo y crea las nuevas, ajustando el contador del libro en
   * la diferencia. Si todo cabe en un lote es una sola operación: o se reemplaza todo o nada.
   * Devuelve las creadas.
   */
  abstract replaceInChapter(
    uid: string,
    bookId: string,
    chapterId: string,
    cardIdsToDelete: readonly string[],
    cards: readonly NewCard[],
  ): Promise<Card[]>;
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
