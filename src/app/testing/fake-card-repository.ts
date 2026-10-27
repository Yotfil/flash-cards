import {
  CardState,
  type Card,
  type CardContentChanges,
  type NewCard,
} from '@domain/models/card.model';
import { CardRepository, type ChapterReplacement } from '@domain/ports/card.repository';
import type { ReadSource } from '@domain/ports/read-source';

type FailableMethod =
  | 'listByChapter'
  | 'listReady'
  | 'listReadyByBook'
  | 'listByBookFromServer'
  | 'listByBook'
  | 'create'
  | 'createMany'
  | 'updateContent'
  | 'setSuspended'
  | 'deleteWithCount'
  | 'deleteManyWithCount'
  | 'replaceInChapter';

// Fake en memoria del repositorio de tarjetas. Simula también el contador de tarjetas de cada
// libro (`bookCardCounts`) para afirmar las sumas y restas; `failWith` hace fallar un método.
export class FakeCardRepository extends CardRepository {
  readonly cards = new Map<string, Card>();
  readonly bookCardCounts = new Map<string, number>();
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};
  readonly calls: Record<FailableMethod, number> = {
    listByChapter: 0,
    listReady: 0,
    listReadyByBook: 0,
    listByBookFromServer: 0,
    listByBook: 0,
    create: 0,
    createMany: 0,
    updateContent: 0,
    setSuspended: 0,
    deleteWithCount: 0,
    deleteManyWithCount: 0,
    replaceInChapter: 0,
  };
  readonly listedUids: string[] = [];
  readonly contentChanges: { cardId: string; changes: CardContentChanges }[] = [];
  private nextId = 1;

  seed(...cards: Card[]): void {
    for (const card of cards) {
      this.cards.set(card.id, card);
    }
  }

  /** Lo que el dispositivo tiene guardado: aparte de lo del servidor (`seed`). */
  readonly onDevice = new Map<string, Card>();
  /** Lecturas del dispositivo (las del servidor las cuenta `calls`). */
  readonly deviceCalls = { listByChapter: 0, listReady: 0 };

  seedOnDevice(...cards: Card[]): void {
    for (const card of cards) {
      this.onDevice.set(card.id, card);
    }
  }

  async listByChapter(
    uid: string,
    chapterId: string,
    source: ReadSource = 'server',
  ): Promise<Card[]> {
    if (source === 'device') {
      this.deviceCalls.listByChapter++;
      return [...this.onDevice.values()].filter((card) => card.chapterId === chapterId);
    }
    this.record('listByChapter');
    this.listedUids.push(uid);
    return [...this.cards.values()].filter((card) => card.chapterId === chapterId);
  }

  /** Con qué instante se pidieron las listas (la cola lo calcula del fin del día). */
  readonly readyBefore: Date[] = [];

  async listReady(_uid: string, before: Date, source: ReadSource = 'server'): Promise<Card[]> {
    if (source === 'device') {
      this.deviceCalls.listReady++;
      return [...this.onDevice.values()].filter((card) => card.scheduling.due <= before);
    }
    this.record('listReady');
    this.readyBefore.push(before);
    return [...this.cards.values()].filter((card) => card.scheduling.due <= before);
  }

  async listReadyByBook(_uid: string, bookId: string, before: Date): Promise<Card[]> {
    this.record('listReadyByBook');
    this.readyBefore.push(before);
    return [...this.cards.values()].filter(
      (card) => card.bookId === bookId && card.scheduling.due <= before,
    );
  }

  async listByBookFromServer(uid: string, bookId: string): Promise<Card[]> {
    this.record('listByBookFromServer');
    this.listedUids.push(uid);
    return [...this.cards.values()].filter((card) => card.bookId === bookId);
  }

  async listByBook(uid: string, bookId: string): Promise<Card[]> {
    this.record('listByBook');
    this.listedUids.push(uid);
    return [...this.cards.values()].filter((card) => card.bookId === bookId);
  }

  async create(_uid: string, card: NewCard): Promise<Card> {
    this.record('create');
    return this.store(card);
  }

  async createMany(_uid: string, cards: readonly NewCard[]): Promise<Card[]> {
    this.record('createMany');
    return cards.map((card) => this.store(card));
  }

  async updateContent(_uid: string, cardId: string, changes: CardContentChanges): Promise<void> {
    this.record('updateContent');
    this.contentChanges.push({ cardId, changes });
    const card = this.cards.get(cardId);
    if (!card) {
      return;
    }
    const { example, ...rest } = changes;
    const updated: Card = { ...card, ...rest, updatedAt: new Date() };
    if (example === null) {
      delete updated.example;
    } else if (example !== undefined) {
      updated.example = example;
    }
    this.cards.set(cardId, updated);
  }

  async setSuspended(_uid: string, cardId: string, suspended: boolean): Promise<void> {
    this.record('setSuspended');
    const card = this.cards.get(cardId);
    if (card) {
      this.cards.set(cardId, { ...card, suspended, updatedAt: new Date() });
    }
  }

  // Como el real: solo descuenta las que existían (otra pestaña pudo borrarlas ya).
  async deleteWithCount(_uid: string, bookId: string, cardId: string): Promise<void> {
    this.record('deleteWithCount');
    if (this.cards.delete(cardId)) {
      this.addToBook(bookId, -1);
    }
  }

  async deleteManyWithCount(
    _uid: string,
    bookId: string,
    cardIds: readonly string[],
  ): Promise<number> {
    this.record('deleteManyWithCount');
    const deleted = cardIds.filter((cardId) => this.cards.delete(cardId)).length;
    this.addToBook(bookId, -deleted);
    return deleted;
  }

  // Como el real: borra lo que el capítulo tiene en el almacén, no una lista de la pantalla.
  async replaceInChapter(
    _uid: string,
    bookId: string,
    chapterId: string,
    cards: readonly NewCard[],
  ): Promise<ChapterReplacement> {
    this.record('replaceInChapter');
    const current = [...this.cards.values()].filter((card) => card.chapterId === chapterId);
    current.forEach((card) => this.cards.delete(card.id));
    this.addToBook(bookId, -current.length);
    return { created: cards.map((card) => this.store(card)), deletedCount: current.length };
  }

  private store(card: NewCard): Card {
    const now = new Date();
    const stored: Card = { id: `card${this.nextId++}`, ...card, createdAt: now, updatedAt: now };
    this.cards.set(stored.id, stored);
    this.addToBook(card.bookId, 1);
    return stored;
  }

  private addToBook(bookId: string, delta: number): void {
    this.bookCardCounts.set(bookId, (this.bookCardCounts.get(bookId) ?? 0) + delta);
  }

  private record(method: FailableMethod): void {
    this.calls[method]++;
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

/** Tarjeta de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function aCard(overrides: Partial<Card> = {}): Card {
  const created = new Date('2026-06-15T10:00:00.000Z');
  return {
    id: 'k1',
    bookId: 'b1',
    chapterId: 'c1',
    noteId: 'n1',
    direction: 'forward',
    front: 'to give up',
    back: 'rendirse',
    scheduling: {
      due: created,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: CardState.New,
      lastReview: null,
    },
    suspended: false,
    createdAt: created,
    updatedAt: created,
    ...overrides,
  };
}
