import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import type { Card, CardContentChanges, NewCard } from '@domain/models/card.model';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { CardRepository } from '@domain/ports/card.repository';

import { BatchCommitError, type BatchWriter } from './batch-writer';
import { writeInCountedBatches } from './counted-batch';
import { parseDocuments } from './document-boundary';
import { cardDocumentSchema, type CardDocument } from './schemas/card.schema';

// Tarjetas del usuario en `users/{uid}/cards` (colección plana, filtrada por capítulo). Crear y
// borrar ajustan el contador del libro en el mismo lote que las tarjetas.
export class FirestoreCardRepository extends CardRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async listByChapter(uid: string, chapterId: string): Promise<Card[]> {
    const snapshot = await getDocs(query(this.cardsOf(uid), where('chapterId', '==', chapterId)));
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  // Las dos lecturas de "listas" solo acotan por vencimiento: ni filtran suspendidas (exigiría otro
  // índice y dejaría fuera documentos viejos sin el campo) ni ordenan; eso lo hace la cola.
  async listReady(uid: string, before: Date): Promise<Card[]> {
    const snapshot = await getDocs(query(this.cardsOf(uid), dueUpTo(before)));
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  async listReadyByBook(uid: string, bookId: string, before: Date): Promise<Card[]> {
    // Usa el índice compuesto `bookId + scheduling.due` declarado en firestore.indexes.json.
    const snapshot = await getDocs(
      query(this.cardsOf(uid), where('bookId', '==', bookId), dueUpTo(before)),
    );
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  async create(uid: string, card: NewCard): Promise<Card> {
    const [created] = await this.createMany(uid, [card]);
    if (!created) {
      throw new Error('La tarjeta no se creó.');
    }
    return created;
  }

  async createMany(uid: string, cards: readonly NewCard[]): Promise<Card[]> {
    const bookId = cards[0]?.bookId;
    if (bookId === undefined) {
      return [];
    }
    return this.replaceCards(uid, bookId, [], cards);
  }

  async replaceInChapter(
    uid: string,
    bookId: string,
    chapterId: string,
    cardIdsToDelete: readonly string[],
    cards: readonly NewCard[],
  ): Promise<Card[]> {
    if (cards.some((card) => card.chapterId !== chapterId)) {
      throw new Error('Las tarjetas nuevas de un reemplazo deben ser del mismo capítulo.');
    }
    return this.replaceCards(uid, bookId, cardIdsToDelete, cards);
  }

  /**
   * Bajas (−1) seguidas de altas (+1) en lotes con su ajuste del contador. Con 448 operaciones o
   * menos es un único lote: o se escribe todo o nada.
   */
  private async replaceCards(
    uid: string,
    bookId: string,
    cardIdsToDelete: readonly string[],
    cards: readonly NewCard[],
  ): Promise<Card[]> {
    if (cards.some((card) => card.bookId !== bookId)) {
      throw new Error('Todas las tarjetas de una escritura en lote deben ser del mismo libro.');
    }
    const now = new Date();
    const created = cards.map((card) => ({
      ref: doc(this.cardsOf(uid)),
      card: toStoredCard(card),
    }));
    await writeInCountedBatches({
      firestore: this.firestore,
      bookRef: this.bookRef(uid, bookId),
      operations: [
        ...cardIdsToDelete.map((cardId) => ({
          apply: (writer: BatchWriter) => writer.delete(this.cardRef(uid, cardId)),
          delta: -1 as const,
        })),
        ...created.map(({ ref, card }) => ({
          apply: (writer: BatchWriter) =>
            writer.set(ref, { ...card, createdAt: now, updatedAt: now }),
          delta: 1 as const,
        })),
      ],
    });
    return created.map(({ ref, card }) => ({
      id: ref.id,
      ...card,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /** `example: null` elimina el campo; un ejemplo se guarda recortado; ausente no se toca. */
  async updateContent(uid: string, cardId: string, changes: CardContentChanges): Promise<void> {
    const { example, ...content } = changes;
    await updateDoc(this.cardRef(uid, cardId), {
      ...content,
      ...(example === null ? { example: deleteField() } : {}),
      ...(typeof example === 'string' ? { example: example.trim() } : {}),
      updatedAt: new Date(),
    });
  }

  async setSuspended(uid: string, cardId: string, suspended: boolean): Promise<void> {
    await updateDoc(this.cardRef(uid, cardId), { suspended, updatedAt: new Date() });
  }

  async deleteWithCount(uid: string, bookId: string, cardId: string): Promise<void> {
    await this.deleteManyWithCount(uid, bookId, [cardId]);
  }

  async deleteManyWithCount(
    uid: string,
    bookId: string,
    cardIds: readonly string[],
  ): Promise<number> {
    const refs = cardIds.map((cardId) => this.cardRef(uid, cardId));
    try {
      await writeInCountedBatches({
        firestore: this.firestore,
        bookRef: this.bookRef(uid, bookId),
        operations: refs.map((ref) => ({ apply: (writer) => writer.delete(ref), delta: -1 })),
      });
    } catch (error) {
      if (error instanceof BatchCommitError) {
        // Los lotes confirmados ya descontaron lo suyo: se informa qué tarjetas se fueron.
        const committed = new Set(error.committed.map((ref) => ref.path));
        const deletedIds = cardIds.filter((cardId) =>
          committed.has(this.cardRef(uid, cardId).path),
        );
        throw new PartialDeletionError(deletedIds, error.cause);
      }
      throw error;
    }
    return cardIds.length;
  }

  private cardsOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'cards');
  }

  private cardRef(uid: string, cardId: string): DocumentReference {
    return doc(this.cardsOf(uid), cardId);
  }

  private bookRef(uid: string, bookId: string): DocumentReference {
    return doc(this.firestore, 'users', uid, 'books', bookId);
  }
}

/**
 * Lo que se escribe de una tarjeta nueva: los opcionales ausentes no se envían (Firestore rechaza
 * `undefined`), `cardType` solo en las cloze y el ejemplo recortado (vacío = sin ejemplo).
 */
function dueUpTo(before: Date) {
  return where('scheduling.due', '<=', Timestamp.fromDate(before));
}

function toStoredCard(card: NewCard): NewCard {
  const { cardType, example, ...rest } = card;
  const trimmedExample = example?.trim();
  return {
    ...withoutUndefined(rest),
    ...(cardType === 'cloze' ? { cardType } : {}),
    ...(trimmedExample ? { example: trimmedExample } : {}),
  };
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

/** El modelo de dominio a partir del documento validado, sin propiedades `undefined`. */
function toCard(document: CardDocument & { readonly id: string }): Card {
  return withoutUndefined(document) as Card;
}
