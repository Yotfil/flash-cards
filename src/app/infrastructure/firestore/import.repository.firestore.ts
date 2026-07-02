// Adaptador Firestore del puerto ImportRepository. Escribe el libro, sus capítulos y sus tarjetas en
// un writeBatch (atómico para tamaños típicos; troceado a 450 por el límite de 500 ops/batch). El id
// del libro se conoce antes de escribir (doc()), así los capítulos y tarjetas pueden referenciarlo.

import { Injectable, inject } from '@angular/core';
import { Timestamp, collection, doc, writeBatch } from 'firebase/firestore';

import { ImportRepository, type ImportBookInput } from '@domain/ports';
import { FIRESTORE } from '@infrastructure/firebase';
import { cardToFirestoreDocument } from './card-document.mapper';
import { MAX_BATCH_SIZE } from './firestore-limits';

const USERS_COLLECTION = 'users';
const BOOKS_COLLECTION = 'books';
const CHAPTERS_COLLECTION = 'chapters';
const CARDS_COLLECTION = 'cards';

@Injectable()
export class FirestoreImportRepository extends ImportRepository {
  private readonly firestore = inject(FIRESTORE);

  override async importBook(uid: string, input: ImportBookInput): Promise<string> {
    const now = new Date();
    const bookRef = doc(this.collection(uid, BOOKS_COLLECTION));

    // Gestor de batch con auto-commit al alcanzar el límite, para no superar 500 ops.
    let batch = writeBatch(this.firestore);
    let ops = 0;
    const commitIfFull = async (): Promise<void> => {
      if (ops >= MAX_BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(this.firestore);
        ops = 0;
      }
    };

    batch.set(bookRef, {
      name: input.book.name,
      subject: input.book.subject,
      studyDirection: input.book.studyDirection,
      newCardsPerDay: input.book.newCardsPerDay,
      maxReviewsPerDay: input.book.maxReviewsPerDay,
      order: input.book.order,
      cardCount: input.book.cardCount ?? 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    ops++;

    for (const chapter of input.chapters) {
      await commitIfFull();
      const chapterRef = doc(this.collection(uid, CHAPTERS_COLLECTION));
      batch.set(chapterRef, {
        bookId: bookRef.id,
        name: chapter.name,
        order: chapter.order,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      ops++;

      for (const card of chapter.cards) {
        await commitIfFull();
        const cardRef = doc(this.collection(uid, CARDS_COLLECTION));
        batch.set(
          cardRef,
          cardToFirestoreDocument({ ...card, bookId: bookRef.id, chapterId: chapterRef.id }, now),
        );
        ops++;
      }
    }

    await batch.commit();
    return bookRef.id;
  }

  private collection(uid: string, name: string) {
    return collection(this.firestore, USERS_COLLECTION, uid, name);
  }
}
