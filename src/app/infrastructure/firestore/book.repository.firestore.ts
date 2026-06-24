// Adaptador Firestore del puerto BookRepository. ÚNICA pieza (junto a otros repos) que habla con
// Firestore para los libros. Valida con Zod al leer (frontera) y traduce documento ↔ modelo del
// dominio. Los libros viven en la subcolección `users/{uid}/books`; el `id` del modelo es la clave
// del documento.

import { Injectable, inject } from '@angular/core';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { BookRepository, type BookCreateInput } from '@domain/ports';
import type { Book, BookDraft } from '@domain/models';
import { FIRESTORE } from '@infrastructure/firebase';
import { bookDocumentSchema, type BookDocument } from './schemas/book.schema';

const USERS_COLLECTION = 'users';
const BOOKS_COLLECTION = 'books';

@Injectable()
export class FirestoreBookRepository extends BookRepository {
  private readonly firestore = inject(FIRESTORE);

  override async listByUser(uid: string): Promise<Book[]> {
    const booksQuery = query(this.booksCollection(uid), orderBy('order'));
    const snapshot = await getDocs(booksQuery);

    return snapshot.docs.map((document) => {
      // Frontera: cada documento es externo, se valida antes de tocarlo. `parse` lanza si no cumple.
      const data = bookDocumentSchema.parse(document.data());
      return this.toBook(document.id, data);
    });
  }

  override async create(uid: string, input: BookCreateInput): Promise<Book> {
    const reference = doc(this.booksCollection(uid));
    const now = new Date();

    const document = {
      name: input.name,
      subject: input.subject,
      studyDirection: input.studyDirection,
      newCardsPerDay: input.newCardsPerDay,
      maxReviewsPerDay: input.maxReviewsPerDay,
      order: input.order,
      cardCount: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };
    await setDoc(reference, document);

    return {
      id: reference.id,
      name: input.name,
      subject: input.subject,
      studyDirection: input.studyDirection,
      newCardsPerDay: input.newCardsPerDay,
      maxReviewsPerDay: input.maxReviewsPerDay,
      order: input.order,
      cardCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  override async update(uid: string, bookId: string, changes: Partial<BookDraft>): Promise<void> {
    // Sólo se escriben los campos presentes; `updatedAt` se refresca siempre.
    const data: Record<string, unknown> = { updatedAt: Timestamp.fromDate(new Date()) };
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }
    await updateDoc(doc(this.booksCollection(uid), bookId), data);
  }

  override async delete(uid: string, bookId: string): Promise<void> {
    await deleteDoc(doc(this.booksCollection(uid), bookId));
  }

  override async incrementCardCount(uid: string, bookId: string, delta: number): Promise<void> {
    // `increment` es atómico en el servidor: dos escrituras concurrentes no se pisan.
    await updateDoc(doc(this.booksCollection(uid), bookId), {
      cardCount: increment(delta),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  private booksCollection(uid: string) {
    return collection(this.firestore, USERS_COLLECTION, uid, BOOKS_COLLECTION);
  }

  /** Construye el modelo del dominio. Con `exactOptionalPropertyTypes`, los opcionales se asignan
   *  sólo cuando están presentes (no como `undefined`). */
  private toBook(id: string, data: BookDocument): Book {
    const book: Book = {
      id,
      name: data.name,
      subject: data.subject,
      studyDirection: data.studyDirection,
      newCardsPerDay: data.newCardsPerDay,
      maxReviewsPerDay: data.maxReviewsPerDay,
      order: data.order,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    if (data.cardCount !== undefined) {
      book.cardCount = data.cardCount;
    }
    return book;
  }
}
