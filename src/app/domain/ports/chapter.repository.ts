import type { Chapter } from '../models/chapter.model';
import type { ReadSource } from './read-source';

// Capítulos del usuario en el almacén. El conteo y la cascada de tarjetas son preguntas sobre el
// capítulo: no leen el contenido de las tarjetas.
export abstract class ChapterRepository {
  /** Los capítulos del libro ordenados por `order`. Lanza si un documento no es válido. */
  abstract listByBook(uid: string, bookId: string, source?: ReadSource): Promise<Chapter[]>;
  abstract create(
    uid: string,
    chapter: { bookId: string; name: string; order: number },
  ): Promise<Chapter>;
  /** Cambia solo el nombre (y la fecha de actualización). */
  abstract rename(uid: string, chapterId: string, name: string): Promise<void>;
  /** Cuántas tarjetas tiene el capítulo (agregación en el servidor). */
  abstract countCards(uid: string, chapterId: string): Promise<number>;
  /**
   * Borra las tarjetas del capítulo descontándolas del libro en cada lote y, al final, el capítulo.
   * Devuelve cuántas tarjetas borró. El historial de repasos se conserva.
   */
  abstract deleteWithCards(uid: string, bookId: string, chapterId: string): Promise<number>;
}
