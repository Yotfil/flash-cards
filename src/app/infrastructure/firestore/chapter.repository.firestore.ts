import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import type { Chapter } from '@domain/models/chapter.model';
import { ChapterRepository } from '@domain/ports/chapter.repository';

import { BatchWriter, MAX_BATCH_SIZE } from './batch-writer';
import { parseDocuments } from './document-boundary';
import { chapterDocumentSchema } from './schemas/chapter.schema';

/** Tarjetas por lote: deja sitio al descuento del libro y al borrado del capítulo. */
const CARDS_PER_BATCH = MAX_BATCH_SIZE - 2;

// Capítulos del usuario en `users/{uid}/chapters`. Se filtran por libro y se ordenan en memoria:
// son pocos por libro y así no hace falta un índice compuesto `bookId + order`.
export class FirestoreChapterRepository extends ChapterRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async listByBook(uid: string, bookId: string): Promise<Chapter[]> {
    const snapshot = await getDocs(query(this.chaptersOf(uid), where('bookId', '==', bookId)));
    return parseDocuments(chapterDocumentSchema, snapshot.docs).sort((a, b) => a.order - b.order);
  }

  async create(
    uid: string,
    chapter: { bookId: string; name: string; order: number },
  ): Promise<Chapter> {
    const ref = doc(this.chaptersOf(uid));
    const now = new Date();
    const document = { ...chapter, createdAt: now, updatedAt: now };
    await setDoc(ref, document);
    return { id: ref.id, ...document };
  }

  async rename(uid: string, chapterId: string, name: string): Promise<void> {
    await updateDoc(doc(this.chaptersOf(uid), chapterId), { name, updatedAt: new Date() });
  }

  /** Agregación en el servidor: no descarga las tarjetas. */
  async countCards(uid: string, chapterId: string): Promise<number> {
    const snapshot = await getCountFromServer(this.cardsOfChapter(uid, chapterId));
    return snapshot.data().count;
  }

  /**
   * Borra las tarjetas en grupos y, en el último, el capítulo. Cada grupo es un único lote que lleva
   * también el descuento de sus tarjetas en el contador del libro: si un lote falla a mitad, el
   * contador sigue cuadrando con lo que queda, el capítulo sigue existiendo y reintentar termina.
   */
  async deleteWithCards(uid: string, bookId: string, chapterId: string): Promise<number> {
    const cards = (await getDocs(this.cardsOfChapter(uid, chapterId))).docs.map((card) => card.ref);
    const groups = chunksOf(cards, CARDS_PER_BATCH);
    const bookRef = doc(this.firestore, 'users', uid, 'books', bookId);
    for (const [index, group] of groups.entries()) {
      const writer = new BatchWriter(this.firestore);
      group.forEach((card) => writer.delete(card));
      if (group.length > 0) {
        writer.update(bookRef, { cardCount: increment(-group.length) });
      }
      if (index === groups.length - 1) {
        writer.delete(doc(this.chaptersOf(uid), chapterId));
      }
      await writer.commit();
    }
    return cards.length;
  }

  private cardsOfChapter(uid: string, chapterId: string) {
    return query(
      collection(this.firestore, 'users', uid, 'cards'),
      where('chapterId', '==', chapterId),
    );
  }

  private chaptersOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'chapters');
  }
}

/** Grupos de hasta `size`; siempre al menos uno (vacío), para que el capítulo se borre igual. */
function chunksOf(cards: readonly DocumentReference[], size: number): DocumentReference[][] {
  if (cards.length === 0) {
    return [[]];
  }
  const groups: DocumentReference[][] = [];
  for (let start = 0; start < cards.length; start += size) {
    groups.push(cards.slice(start, start + size));
  }
  return groups;
}
