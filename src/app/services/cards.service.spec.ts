import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { CardRepository, SchedulingPort, type CardCreateInput } from '@domain/ports';
import { type Card, type CardScheduling, CardState, type User } from '@domain/models';
import { AuthService } from './auth.service';
import { BooksService } from './books.service';
import { CardsService } from './cards.service';

const INITIAL_SCHEDULING: CardScheduling = {
  due: new Date('2026-06-23T00:00:00Z'),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: CardState.New,
  lastReview: null,
};

class FakeCardRepository extends CardRepository {
  cards: Card[] = [];
  lastCreateInput: CardCreateInput | null = null;
  shouldFail = false;

  override async listByChapter(): Promise<Card[]> {
    if (this.shouldFail) {
      throw new Error('falla de red simulada');
    }
    return [...this.cards];
  }

  override async create(_uid: string, input: CardCreateInput): Promise<Card> {
    this.lastCreateInput = input;
    const card: Card = {
      ...input,
      id: `card-${this.cards.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cards.push(card);
    return card;
  }

  override async createMany(_uid: string, inputs: CardCreateInput[]): Promise<Card[]> {
    const created = inputs.map((input, offset) => ({
      ...input,
      id: `card-${this.cards.length + offset + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    this.cards.push(...created);
    return created;
  }

  override async update(): Promise<void> {
    // No usado en estas pruebas.
  }

  override async delete(): Promise<void> {
    // No usado en estas pruebas.
  }

  override async listByBook(): Promise<Card[]> {
    return [];
  }

  override async listDue(): Promise<Card[]> {
    return [];
  }

  override async countByState(): Promise<{ newCards: number; learning: number; review: number }> {
    return { newCards: 0, learning: 0, review: 0 };
  }

  override async updateScheduling(): Promise<void> {
    // No usado en estas pruebas.
  }
}

class FakeSchedulingPort extends SchedulingPort {
  override createInitialScheduling(): CardScheduling {
    return { ...INITIAL_SCHEDULING };
  }

  override schedule(): never {
    throw new Error('no usado en estas pruebas');
  }
}

class FakeBooksService {
  cardCountCalls: { bookId: string; delta: number }[] = [];
  async changeCardCount(bookId: string, delta: number): Promise<void> {
    this.cardCountCalls.push({ bookId, delta });
  }
}

describe('CardsService', () => {
  let repository: FakeCardRepository;
  let books: FakeBooksService;

  function configure(uid: string | null): CardsService {
    repository = new FakeCardRepository();
    books = new FakeBooksService();
    const fakeAuth = { currentUser: signal<User | null>(uid ? buildUser(uid) : null) };
    TestBed.configureTestingModule({
      providers: [
        CardsService,
        { provide: CardRepository, useValue: repository },
        { provide: SchedulingPort, useClass: FakeSchedulingPort },
        { provide: AuthService, useValue: fakeAuth },
        { provide: BooksService, useValue: books },
      ],
    });
    return TestBed.inject(CardsService);
  }

  function buildUser(uid: string): User {
    return {
      id: uid,
      displayName: 'Test',
      email: 't@e.com',
      createdAt: new Date(),
      settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system', defaultNewCardsPerDay: 20 },
      isSearchable: false,
    };
  }

  it('carga las tarjetas y pasa a "ready"', async () => {
    const service = configure('u1');
    await service.load('chapter-1');

    expect(service.status()).toBe('ready');
  });

  it('crea una tarjeta forward con scheduling inicial y sube el conteo del libro', async () => {
    const service = configure('u1');
    await service.load('chapter-1');

    await service.create('book-1', 'chapter-1', { front: 'to give up', back: 'rendirse' });

    expect(repository.lastCreateInput?.direction).toBe('forward');
    expect(repository.lastCreateInput?.suspended).toBe(false);
    expect(repository.lastCreateInput?.scheduling.state).toBe(CardState.New);
    expect(repository.lastCreateInput?.noteId).toBeTruthy();
    expect(service.cards()).toHaveLength(1);
    expect(books.cardCountCalls).toEqual([{ bookId: 'book-1', delta: 1 }]);
  });

  it('createMany crea n tarjetas forward y sube el conteo del libro por n', async () => {
    const service = configure('u1');
    await service.load('chapter-1');

    await service.createMany('book-1', 'chapter-1', [
      { front: 'a', back: '1' },
      { front: 'b', back: '2' },
      { front: 'c', back: '3' },
    ]);

    expect(service.cards()).toHaveLength(3);
    expect(service.cards().every((card) => card.direction === 'forward')).toBe(true);
    expect(books.cardCountCalls).toEqual([{ bookId: 'book-1', delta: 3 }]);
  });

  it('createMany no hace nada con una lista vacía', async () => {
    const service = configure('u1');
    await service.load('chapter-1');

    await service.createMany('book-1', 'chapter-1', []);

    expect(service.cards()).toHaveLength(0);
    expect(books.cardCountCalls).toEqual([]);
  });

  it('al borrar, baja el conteo del libro', async () => {
    const service = configure('u1');
    await service.load('chapter-1');
    await service.create('book-1', 'chapter-1', { front: 'a', back: 'b' });
    const [created] = service.cards();
    if (!created) {
      throw new Error('la tarjeta creada debería existir');
    }

    await service.remove('book-1', created.id);

    expect(service.cards()).toHaveLength(0);
    expect(books.cardCountCalls).toContainEqual({ bookId: 'book-1', delta: -1 });
  });

  it('deja el estado en "error" si la carga falla', async () => {
    const service = configure('u1');
    repository.shouldFail = true;

    await service.load('chapter-1');

    expect(service.status()).toBe('error');
    expect(service.errorMessage()).not.toBeNull();
  });
});
