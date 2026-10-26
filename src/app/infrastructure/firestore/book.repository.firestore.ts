import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  getDocsFromServer,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Query,
} from 'firebase/firestore';

import type { Book, BookContents, BookDraft, CardStateTotals } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';

import { BatchWriter } from './batch-writer';
import { parseDocuments } from './document-boundary';
import { bookDocumentSchema, type BookDocument } from './schemas/book.schema';

// Libros del usuario en `users/{uid}/books`. Lee a través de la frontera (Zod + error con ruta).
export class FirestoreBookRepository extends BookRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async listByUser(uid: string): Promise<Book[]> {
    const snapshot = await getDocs(query(this.booksOf(uid), orderBy('order')));
    return parseDocuments(bookDocumentSchema, snapshot.docs).map(toBook);
  }

  async create(uid: string, draft: BookDraft & { order: number }): Promise<Book> {
    const ref = doc(this.booksOf(uid));
    const now = new Date();
    const document = { ...draft, cardCount: 0, createdAt: now, updatedAt: now };
    await setDoc(ref, document);
    return { id: ref.id, ...document };
  }

  async update(uid: string, bookId: string, changes: Partial<BookDraft>): Promise<void> {
    await updateDoc(this.bookRef(uid, bookId), { ...changes, updatedAt: new Date() });
  }

  async incrementCardCount(uid: string, bookId: string, delta: number): Promise<void> {
    await updateDoc(this.bookRef(uid, bookId), { cardCount: increment(delta) });
  }

  /** Agregaciones en el servidor: no descarga capítulos ni tarjetas. */
  async countContents(uid: string, bookId: string): Promise<BookContents> {
    const [chapters, cards] = await Promise.all([
      getCountFromServer(this.ofBook(uid, 'chapters', bookId)),
      getCountFromServer(this.ofBook(uid, 'cards', bookId)),
    ]);
    return { chapters: chapters.data().count, cards: cards.data().count };
  }

  /**
   * Borra tarjetas, capítulos y, en el último lote, el libro. Si un lote falla, el libro sigue
   * existiendo (con menos contenido) y reintentar borra lo que quede. El historial de repasos y las
   * estadísticas diarias no se tocan. Lo que hay que borrar se lee del servidor: la caché puede
   * tener solo parte y lo demás quedaría suelto, sin libro (sin red, falla).
   */
  async deleteWithContents(uid: string, bookId: string): Promise<void> {
    const [cards, chapters] = await Promise.all([
      getDocsFromServer(this.ofBook(uid, 'cards', bookId)),
      getDocsFromServer(this.ofBook(uid, 'chapters', bookId)),
    ]);
    const writer = new BatchWriter(this.firestore);
    cards.docs.forEach((card) => writer.delete(card.ref));
    chapters.docs.forEach((chapter) => writer.delete(chapter.ref));
    writer.delete(this.bookRef(uid, bookId));
    await writer.commit();
  }

  /**
   * Totales por estado de FSRS con agregaciones en el servidor: nuevas (0), en aprendizaje
   * (aprendiendo 1 y reaprendiendo 3) y dominadas (en repaso, 2). No descarga las tarjetas.
   */
  countCardsByState(uid: string, bookId: string): Promise<CardStateTotals> {
    return countByState(this.ofBook(uid, 'cards', bookId));
  }

  // Sin filtro de libro: `scheduling.state` usa el índice automático de un solo campo.
  countCollectionByState(uid: string): Promise<CardStateTotals> {
    return countByState(query(collection(this.firestore, 'users', uid, 'cards')));
  }

  private booksOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'books');
  }

  private ofBook(uid: string, collectionName: 'chapters' | 'cards', bookId: string) {
    return query(
      collection(this.firestore, 'users', uid, collectionName),
      where('bookId', '==', bookId),
    );
  }

  private bookRef(uid: string, bookId: string) {
    return doc(this.firestore, 'users', uid, 'books', bookId);
  }
}

function toBook(document: BookDocument & { readonly id: string }): Book {
  const { cardCount, ...rest } = document;
  return { ...rest, ...(cardCount !== undefined ? { cardCount } : {}) };
}

/** Tres agregaciones en el servidor (nunca se leen las tarjetas): aprendiendo y reaprendiendo suman. */
async function countByState(cards: Query): Promise<CardStateTotals> {
  const [newCards, learning, review] = await Promise.all([
    getCountFromServer(query(cards, where('scheduling.state', '==', 0))),
    getCountFromServer(query(cards, where('scheduling.state', 'in', [1, 3]))),
    getCountFromServer(query(cards, where('scheduling.state', '==', 2))),
  ]);
  return {
    newCards: newCards.data().count,
    learning: learning.data().count,
    review: review.data().count,
  };
}
