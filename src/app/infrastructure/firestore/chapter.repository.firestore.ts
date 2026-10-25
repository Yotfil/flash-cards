import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import type { Chapter } from '@domain/models/chapter.model';
import { ChapterRepository } from '@domain/ports/chapter.repository';

import { writeInCountedBatches } from './counted-batch';
import { parseDocuments } from './document-boundary';
import { chapterDocumentSchema } from './schemas/chapter.schema';

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
   * Borra las tarjetas en lotes, cada uno con su descuento en el contador del libro, y el capítulo
   * en el último: si un lote falla a mitad, el contador sigue cuadrando con lo que queda, el
   * capítulo sigue existiendo y reintentar termina.
   */
  async deleteWithCards(uid: string, bookId: string, chapterId: string): Promise<number> {
    const cards = (await getDocs(this.cardsOfChapter(uid, chapterId))).docs;
    await writeInCountedBatches({
      firestore: this.firestore,
      bookRef: doc(this.firestore, 'users', uid, 'books', bookId),
      operations: cards.map((card) => ({
        apply: (writer) => writer.delete(card.ref),
        delta: -1,
      })),
      trailing: {
        apply: (writer) => writer.delete(doc(this.chaptersOf(uid), chapterId)),
        delta: 0,
      },
    });
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
