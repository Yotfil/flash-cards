import type { Book, BookContents, BookDraft, CardStateTotals } from '../models/book.model';
import type { ReadSource } from './read-source';

// Libros del usuario en el almacén. Los conteos son agregaciones en el servidor: no leen tarjetas.
export abstract class BookRepository {
  /** Los libros del usuario ordenados por `order`. Lanza si un documento no es válido. */
  abstract listByUser(uid: string, source?: ReadSource): Promise<Book[]>;
  abstract create(uid: string, draft: BookDraft & { order: number }): Promise<Book>;
  /** Cambia solo los campos indicados (y la fecha de actualización). */
  abstract update(uid: string, bookId: string, changes: Partial<BookDraft>): Promise<void>;
  /** Suma o resta al contador de tarjetas de forma atómica. */
  abstract incrementCardCount(uid: string, bookId: string, delta: number): Promise<void>;
  abstract countContents(uid: string, bookId: string): Promise<BookContents>;
  /** Borra las tarjetas, los capítulos y por último el libro. El historial de repasos se conserva. */
  abstract deleteWithContents(uid: string, bookId: string): Promise<void>;
  abstract countCardsByState(uid: string, bookId: string): Promise<CardStateTotals>;
  /** Las mismas tres agregaciones sobre todas las tarjetas de la cuenta (incluidas suspendidas). */
  abstract countCollectionByState(uid: string): Promise<CardStateTotals>;
}
