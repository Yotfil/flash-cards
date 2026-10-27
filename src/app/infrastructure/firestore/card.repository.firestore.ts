import {
  collection,
  deleteField,
  doc,
  getDocs,
  getDocsFromServer,
  increment,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import type { Card, CardContentChanges, NewCard } from '@domain/models/card.model';
import { PartialCreationError } from '@domain/models/partial-creation-error';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { CardRepository, type ChapterReplacement } from '@domain/ports/card.repository';
import type { ReadSource } from '@domain/ports/read-source';

import { BatchCommitError, chunksOf, type BatchWriter } from './batch-writer';
import { COUNTED_GROUP_SIZE, writeInCountedBatches } from './counted-batch';
import { parseDocuments } from './document-boundary';
import { readFrom } from './read-from';
import { cardDocumentSchema, type CardDocument } from './schemas/card.schema';

// Tarjetas del usuario en `users/{uid}/cards` (colección plana, filtrada por capítulo). Crear y
// borrar ajustan el contador del libro en el mismo lote que las tarjetas.
export class FirestoreCardRepository extends CardRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async listByChapter(
    uid: string,
    chapterId: string,
    source: ReadSource = 'server',
  ): Promise<Card[]> {
    const snapshot = await readFrom(
      query(this.cardsOf(uid), where('chapterId', '==', chapterId)),
      source,
    );
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  // Las dos lecturas de "listas" solo acotan por vencimiento: ni filtran suspendidas (exigiría otro
  // índice y dejaría fuera documentos viejos sin el campo) ni ordenan; eso lo hace la cola.
  async listReady(uid: string, before: Date, source: ReadSource = 'server'): Promise<Card[]> {
    const snapshot = await readFrom(query(this.cardsOf(uid), dueUpTo(before)), source);
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  async listReadyByBook(uid: string, bookId: string, before: Date): Promise<Card[]> {
    // Usa el índice compuesto `bookId + scheduling.due` declarado en firestore.indexes.json.
    const snapshot = await getDocs(
      query(this.cardsOf(uid), where('bookId', '==', bookId), dueUpTo(before)),
    );
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  // Del servidor, nunca de la caché: la caché puede tener solo parte del libro y un archivo
  // exportado incompleto que parece completo es peor que ninguno. Sin red, falla.
  async listByBookFromServer(uid: string, bookId: string): Promise<Card[]> {
    const snapshot = await getDocsFromServer(
      query(this.cardsOf(uid), where('bookId', '==', bookId)),
    );
    return parseDocuments(cardDocumentSchema, snapshot.docs).map(toCard);
  }

  // La lectura normal (caché primero sin red): para practicar, lo que el dispositivo tenga basta.
  async listByBook(uid: string, bookId: string): Promise<Card[]> {
    const snapshot = await getDocs(query(this.cardsOf(uid), where('bookId', '==', bookId)));
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
    cards: readonly NewCard[],
  ): Promise<ChapterReplacement> {
    if (cards.some((card) => card.chapterId !== chapterId)) {
      throw new Error('Las tarjetas nuevas de un reemplazo deben ser del mismo capítulo.');
    }
    // Lo que el capítulo tiene de verdad, del servidor: la lista cargada pudo quedarse vieja.
    const current = await getDocsFromServer(
      query(this.cardsOf(uid), where('chapterId', '==', chapterId)),
    );
    const idsToDelete = current.docs.map((card) => card.id);
    const created = await this.replaceCards(uid, bookId, idsToDelete, cards);
    return { created, deletedCount: idsToDelete.length };
  }

  /**
   * Bajas (−1) seguidas de altas (+1) en lotes con su ajuste del contador. Con 447 operaciones o
   * menos es un único lote: o se escribe todo o nada. Cada lote que crea toca también el capítulo
   * (`updatedAt`): si otro dispositivo lo borró, el lote falla entero (no existe el documento) y no
   * quedan tarjetas sin capítulo, que nadie podría ver ni borrar.
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
    const chapterId = cards[0]?.chapterId;
    if (cards.some((card) => card.chapterId !== chapterId)) {
      throw new Error('Todas las tarjetas de una escritura en lote deben ser del mismo capítulo.');
    }
    const now = new Date();
    const created = cards.map((card, position) => ({
      ref: doc(this.cardsOf(uid)),
      card: toStoredCard(card),
      // Escalonadas por posición: la cola desempata las nuevas por fecha de creación, así entran
      // en el orden recibido (el del archivo al importar).
      createdAt: new Date(now.getTime() + position),
    }));
    const asCard = ({ ref, card, createdAt }: (typeof created)[number]): Card => ({
      id: ref.id,
      ...card,
      createdAt,
      updatedAt: createdAt,
    });
    try {
      await this.writeReplacement(uid, bookId, chapterId, cardIdsToDelete, created, now);
    } catch (error) {
      // Un alta (sin bajas) cortada a mitad: los lotes confirmados ya crearon y sumaron lo suyo.
      if (error instanceof BatchCommitError && cardIdsToDelete.length === 0) {
        const committed = new Set(error.committed.map((ref) => ref.path));
        throw new PartialCreationError(
          created.filter(({ ref }) => committed.has(ref.path)).map(asCard),
          error,
        );
      }
      throw error;
    }
    return created.map(asCard);
  }

  private async writeReplacement(
    uid: string,
    bookId: string,
    chapterId: string | undefined,
    cardIdsToDelete: readonly string[],
    created: readonly { ref: DocumentReference; card: NewCard; createdAt: Date }[],
    now: Date,
  ): Promise<void> {
    await writeInCountedBatches({
      firestore: this.firestore,
      bookRef: this.bookRef(uid, bookId),
      ...(chapterId !== undefined
        ? {
            everyBatch: {
              apply: (writer: BatchWriter) =>
                writer.update(this.chapterRef(uid, chapterId), { updatedAt: now }),
              delta: 0 as const,
            },
          }
        : {}),
      operations: [
        ...cardIdsToDelete.map((cardId) => ({
          apply: (writer: BatchWriter) => writer.delete(this.cardRef(uid, cardId)),
          delta: -1 as const,
        })),
        ...created.map(({ ref, card, createdAt }) => ({
          apply: (writer: BatchWriter) =>
            writer.set(ref, { ...card, createdAt, updatedAt: createdAt }),
          delta: 1 as const,
        })),
      ],
    });
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
    const goneIds: string[] = [];
    let deleted = 0;
    for (const chunk of chunksOf(cardIds, COUNTED_GROUP_SIZE)) {
      try {
        deleted += await this.deleteExisting(uid, bookId, chunk);
      } catch (error) {
        // Los tramos confirmados ya descontaron lo suyo: se informa qué tarjetas ya no están.
        throw new PartialDeletionError(goneIds, error);
      }
      goneIds.push(...chunk);
    }
    return deleted;
  }

  /**
   * Un tramo en una transacción: lee las tarjetas, borra las que existen y descuenta exactamente
   * esas. Una que otra pestaña ya borró no descuenta otra vez (el contador guardado no se
   * descuadra). Devuelve cuántas borró.
   */
  private deleteExisting(uid: string, bookId: string, cardIds: readonly string[]): Promise<number> {
    return runTransaction(this.firestore, async (transaction) => {
      const snapshots = await Promise.all(
        cardIds.map((cardId) => transaction.get(this.cardRef(uid, cardId))),
      );
      const existing = snapshots.filter((snapshot) => snapshot.exists());
      existing.forEach((snapshot) => transaction.delete(snapshot.ref));
      if (existing.length > 0) {
        transaction.update(this.bookRef(uid, bookId), { cardCount: increment(-existing.length) });
      }
      return existing.length;
    });
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

  private chapterRef(uid: string, chapterId: string): DocumentReference {
    return doc(this.firestore, 'users', uid, 'chapters', chapterId);
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
