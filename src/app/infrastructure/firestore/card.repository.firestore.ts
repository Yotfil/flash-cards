// Adaptador Firestore del puerto CardRepository. ÚNICA pieza (junto a otros repos) que habla con
// Firestore para las tarjetas. Valida con Zod al leer (frontera) y traduce documento ↔ modelo del
// dominio, incluido el bloque `scheduling` (Date ↔ Timestamp). Las tarjetas viven en la colección
// plana `users/{uid}/cards` con campos `bookId`/`chapterId`.

import { Injectable, inject } from '@angular/core';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { CardRepository, type CardCreateInput } from '@domain/ports';
import { type Card, type CardContentDraft, type CardScheduling, CardState } from '@domain/models';
import { FIRESTORE } from '@infrastructure/firebase';
import { cardDocumentSchema, type CardDocument } from './schemas/card.schema';

const USERS_COLLECTION = 'users';
const CARDS_COLLECTION = 'cards';
// Firestore admite hasta 500 operaciones por batch; se deja margen.
const MAX_BATCH_SIZE = 450;

@Injectable()
export class FirestoreCardRepository extends CardRepository {
  private readonly firestore = inject(FIRESTORE);

  override async listByChapter(uid: string, chapterId: string): Promise<Card[]> {
    // Filtro por igualdad (auto-indexado); orden por creación en memoria para no exigir índice
    // compuesto. Las tarjetas por capítulo del MVP son una cantidad manejable.
    const cardsQuery = query(this.cardsCollection(uid), where('chapterId', '==', chapterId));
    const snapshot = await getDocs(cardsQuery);

    return snapshot.docs
      .map((document) => {
        // Frontera: cada documento es externo, se valida antes de tocarlo. `parse` lanza si no cumple.
        const data = cardDocumentSchema.parse(document.data());
        return this.toCard(document.id, data);
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  override async create(uid: string, input: CardCreateInput): Promise<Card> {
    const reference = doc(this.cardsCollection(uid));
    const now = new Date();
    await setDoc(reference, this.toCardDocument(input, now));
    return { ...input, id: reference.id, createdAt: now, updatedAt: now };
  }

  override async createMany(uid: string, inputs: CardCreateInput[]): Promise<Card[]> {
    const now = new Date();
    const created: Card[] = [];

    // Firestore limita cada batch a 500 operaciones; se trocea por si la importación es grande.
    for (const chunk of this.chunk(inputs, MAX_BATCH_SIZE)) {
      const batch = writeBatch(this.firestore);
      for (const input of chunk) {
        const reference = doc(this.cardsCollection(uid));
        batch.set(reference, this.toCardDocument(input, now));
        created.push({ ...input, id: reference.id, createdAt: now, updatedAt: now });
      }
      await batch.commit();
    }
    return created;
  }

  override async update(
    uid: string,
    cardId: string,
    changes: Partial<CardContentDraft>,
  ): Promise<void> {
    const data: Record<string, unknown> = { updatedAt: Timestamp.fromDate(new Date()) };
    if (changes.front !== undefined) {
      data['front'] = changes.front;
    }
    if (changes.back !== undefined) {
      data['back'] = changes.back;
    }
    await updateDoc(doc(this.cardsCollection(uid), cardId), data);
  }

  override async delete(uid: string, cardId: string): Promise<void> {
    await deleteDoc(doc(this.cardsCollection(uid), cardId));
  }

  private cardsCollection(uid: string) {
    return collection(this.firestore, USERS_COLLECTION, uid, CARDS_COLLECTION);
  }

  private assignOptional(target: Record<string, unknown>, key: string, value: unknown): void {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  /** Documento Firestore de una tarjeta (Dates → Timestamp, opcionales sólo si presentes). */
  private toCardDocument(input: CardCreateInput, now: Date): Record<string, unknown> {
    const document: Record<string, unknown> = {
      bookId: input.bookId,
      chapterId: input.chapterId,
      noteId: input.noteId,
      direction: input.direction,
      front: input.front,
      back: input.back,
      scheduling: this.toSchedulingDocument(input.scheduling),
      suspended: input.suspended,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };
    this.assignOptional(document, 'pronunciation', input.pronunciation);
    this.assignOptional(document, 'example', input.example);
    this.assignOptional(document, 'audioUrl', input.audioUrl);
    this.assignOptional(document, 'notes', input.notes);
    this.assignOptional(document, 'tags', input.tags);
    return document;
  }

  /** Trocea un arreglo en lotes de tamaño máximo `size`. */
  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let start = 0; start < items.length; start += size) {
      chunks.push(items.slice(start, start + size));
    }
    return chunks;
  }

  /** El bloque `scheduling` con las fechas convertidas a Timestamp para Firestore. */
  private toSchedulingDocument(scheduling: CardScheduling): Record<string, unknown> {
    return {
      due: Timestamp.fromDate(scheduling.due),
      stability: scheduling.stability,
      difficulty: scheduling.difficulty,
      elapsedDays: scheduling.elapsedDays,
      scheduledDays: scheduling.scheduledDays,
      reps: scheduling.reps,
      lapses: scheduling.lapses,
      state: scheduling.state,
      lastReview: scheduling.lastReview === null ? null : Timestamp.fromDate(scheduling.lastReview),
    };
  }

  /** Construye el modelo del dominio. Con `exactOptionalPropertyTypes`, los opcionales se asignan
   *  sólo cuando están presentes (no como `undefined`). */
  private toCard(id: string, data: CardDocument): Card {
    const card: Card = {
      id,
      bookId: data.bookId,
      chapterId: data.chapterId,
      noteId: data.noteId,
      direction: data.direction,
      front: data.front,
      back: data.back,
      scheduling: { ...data.scheduling, state: data.scheduling.state as CardState },
      suspended: data.suspended,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    if (data.pronunciation !== undefined) {
      card.pronunciation = data.pronunciation;
    }
    if (data.example !== undefined) {
      card.example = data.example;
    }
    if (data.audioUrl !== undefined) {
      card.audioUrl = data.audioUrl;
    }
    if (data.notes !== undefined) {
      card.notes = data.notes;
    }
    if (data.tags !== undefined) {
      card.tags = data.tags;
    }
    return card;
  }
}
