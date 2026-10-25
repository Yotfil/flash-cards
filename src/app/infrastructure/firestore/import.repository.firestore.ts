import { collection, doc, type DocumentReference, type Firestore } from 'firebase/firestore';

import type { Book } from '@domain/models/book.model';
import {
  ImportBookError,
  ImportRepository,
  type ImportBookInput,
} from '@domain/ports/import.repository';

import { BatchCommitError, BatchWriter } from './batch-writer';

// Un libro importado entero en lotes de 450: capítulos y tarjetas primero y el documento del libro
// en el último, con su `cardCount` ya calculado, así el libro nunca aparece a medias en la
// Biblioteca. (No usa `writeInCountedBatches`: su `increment` sería un `update` sobre un libro que
// aún no existe.) Si un lote falla, se intenta borrar lo ya escrito.
export class FirestoreImportRepository extends ImportRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async importBook(uid: string, input: ImportBookInput): Promise<Book> {
    const now = new Date();
    const bookRef = doc(this.collectionOf(uid, 'books'));
    const writer = new BatchWriter(this.firestore);
    for (const chapter of input.chapters) {
      const chapterRef = doc(this.collectionOf(uid, 'chapters'));
      writer.set(chapterRef, {
        bookId: bookRef.id,
        name: chapter.name,
        order: chapter.order,
        createdAt: now,
        updatedAt: now,
      });
      for (const card of chapter.cards) {
        writer.set(doc(this.collectionOf(uid, 'cards')), {
          ...card,
          bookId: bookRef.id,
          chapterId: chapterRef.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    const book = { ...input.book, createdAt: now, updatedAt: now };
    writer.set(bookRef, book);

    try {
      await writer.commit();
    } catch (error) {
      if (error instanceof BatchCommitError) {
        const rolledBack = await this.rollBack(error.committed);
        throw new ImportBookError(error.committed.length, rolledBack, error.cause);
      }
      throw error;
    }
    return { id: bookRef.id, ...book };
  }

  /** Borrado compensatorio de lo ya confirmado. Dice si lo consiguió (no lanza). */
  private async rollBack(committed: readonly DocumentReference[]): Promise<boolean> {
    const writer = new BatchWriter(this.firestore);
    committed.forEach((ref) => writer.delete(ref));
    try {
      await writer.commit();
      return true;
    } catch {
      // El fallo no se pierde: viaja como `rolledBack: false` en `ImportBookError` y el servicio
      // de importación lo registra con el número de escrituras confirmadas.
      return false;
    }
  }

  private collectionOf(uid: string, name: string) {
    return collection(this.firestore, 'users', uid, name);
  }
}
