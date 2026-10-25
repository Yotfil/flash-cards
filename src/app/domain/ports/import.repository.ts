import type { Book, BookDraft } from '../models/book.model';
import type { NewCard } from '../models/card.model';

/** Una tarjeta a crear dentro de un capítulo importado: el libro y el capítulo los pone el almacén. */
export type ImportedCardInput = Omit<NewCard, 'bookId' | 'chapterId'>;

export interface ImportBookInput {
  book: BookDraft & { order: number; cardCount: number };
  chapters: { name: string; order: number; cards: ImportedCardInput[] }[];
}

/**
 * La escritura de un libro importado falló a mitad. `committedCount` dice cuántas escrituras se
 * habían confirmado y `rolledBack` si el borrado compensatorio las quitó todas.
 */
export class ImportBookError extends Error {
  override readonly name = 'ImportBookError';

  constructor(
    readonly committedCount: number,
    readonly rolledBack: boolean,
    cause: unknown,
  ) {
    super(`La importación se cortó tras ${committedCount} escrituras`, { cause });
  }
}

// Crear un libro entero de una vez (libro, capítulos y tarjetas). El libro se escribe en el
// último lote, así nunca aparece a medias en la Biblioteca; si algo falla, se deshace lo escrito.
export abstract class ImportRepository {
  /** Devuelve el libro creado. Lanza `ImportBookError` si la escritura se cortó. */
  abstract importBook(uid: string, input: ImportBookInput): Promise<Book>;
}
