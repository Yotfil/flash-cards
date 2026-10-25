import type { Book, BookContents, BookDraft, CardStateTotals } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';

type FailableMethod =
  | 'listByUser'
  | 'create'
  | 'update'
  | 'incrementCardCount'
  | 'countContents'
  | 'deleteWithContents'
  | 'countCardsByState'
  | 'countCollectionByState';

// Fake en memoria del repositorio de libros. `failWith` hace fallar un método; `calls` cuenta las
// llamadas para afirmar que algo NO se pidió (por ejemplo, conteos sin red).
export class FakeBookRepository extends BookRepository {
  readonly books = new Map<string, Book>();
  readonly contents = new Map<string, BookContents>();
  readonly stateTotals = new Map<string, CardStateTotals>();
  /** Lo que devuelve el conteo de toda la cuenta. */
  collectionTotals: CardStateTotals = { newCards: 0, learning: 0, review: 0 };
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};
  readonly calls: Record<FailableMethod, number> = {
    listByUser: 0,
    create: 0,
    update: 0,
    incrementCardCount: 0,
    countContents: 0,
    deleteWithContents: 0,
    countCardsByState: 0,
    countCollectionByState: 0,
  };
  readonly listedUids: string[] = [];
  private nextId = 1;

  seed(...books: Book[]): void {
    for (const book of books) {
      this.books.set(book.id, book);
    }
  }

  async listByUser(uid: string): Promise<Book[]> {
    this.record('listByUser');
    this.listedUids.push(uid);
    return [...this.books.values()].sort((a, b) => a.order - b.order);
  }

  async create(_uid: string, draft: BookDraft & { order: number }): Promise<Book> {
    this.record('create');
    const now = new Date();
    const book: Book = {
      id: `b${this.nextId++}`,
      ...draft,
      cardCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.books.set(book.id, book);
    return book;
  }

  async update(_uid: string, bookId: string, changes: Partial<BookDraft>): Promise<void> {
    this.record('update');
    const book = this.books.get(bookId);
    if (book) {
      this.books.set(bookId, { ...book, ...changes, updatedAt: new Date() });
    }
  }

  async incrementCardCount(_uid: string, bookId: string, delta: number): Promise<void> {
    this.record('incrementCardCount');
    const book = this.books.get(bookId);
    if (book) {
      this.books.set(bookId, { ...book, cardCount: (book.cardCount ?? 0) + delta });
    }
  }

  async countContents(_uid: string, bookId: string): Promise<BookContents> {
    this.record('countContents');
    return this.contents.get(bookId) ?? { chapters: 0, cards: 0 };
  }

  async deleteWithContents(_uid: string, bookId: string): Promise<void> {
    this.record('deleteWithContents');
    this.books.delete(bookId);
  }

  async countCardsByState(_uid: string, bookId: string): Promise<CardStateTotals> {
    this.record('countCardsByState');
    return this.stateTotals.get(bookId) ?? { newCards: 0, learning: 0, review: 0 };
  }

  async countCollectionByState(uid: string): Promise<CardStateTotals> {
    this.record('countCollectionByState');
    this.listedUids.push(uid);
    return this.collectionTotals;
  }

  private record(method: FailableMethod): void {
    this.calls[method]++;
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

/** Libro de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function aBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    name: 'Inglés',
    subject: 'language-en',
    studyDirection: 'forward',
    newCardsPerDay: 20,
    maxReviewsPerDay: 200,
    order: 0,
    cardCount: 12,
    createdAt: new Date('2026-06-15T10:00:00.000Z'),
    updatedAt: new Date('2026-06-15T10:00:00.000Z'),
    ...overrides,
  };
}
