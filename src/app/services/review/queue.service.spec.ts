import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { CardRepository, DailyStatsRepository } from '@domain/ports';
import { type Book, type Card, CardState, type DailyStats, type User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { BooksService } from '@services/books.service';
import { QueueService } from './queue.service';

function buildBook(id: string, newCardsPerDay: number): Book {
  return {
    id,
    name: id,
    subject: 'general',
    studyDirection: 'forward',
    newCardsPerDay,
    maxReviewsPerDay: 200,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildCard(id: string, bookId: string, state: CardState): Card {
  return {
    id,
    bookId,
    chapterId: 'c',
    noteId: id,
    direction: 'forward',
    front: id,
    back: id,
    suspended: false,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    scheduling: {
      due: new Date('2026-06-20'),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state,
      lastReview: null,
    },
  };
}

describe('QueueService', () => {
  const user: User = {
    id: 'u1',
    displayName: 'Test',
    email: 't@e.com',
    createdAt: new Date(),
    settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system', defaultNewCardsPerDay: 20 },
    isSearchable: false,
  };

  function configure(candidates: Card[], books: Book[], today: DailyStats | null): QueueService {
    const cardRepo: Partial<CardRepository> = { listDue: async () => candidates };
    const statsRepo: Partial<DailyStatsRepository> = { getToday: async () => today };
    const booksService: Partial<BooksService> = {
      ensureLoaded: async () => {
        // Ya cargados en la prueba.
      },
      books: signal(books).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [
        QueueService,
        { provide: CardRepository, useValue: cardRepo },
        { provide: DailyStatsRepository, useValue: statsRepo },
        { provide: BooksService, useValue: booksService },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(user) } },
      ],
    });
    return TestBed.inject(QueueService);
  }

  it('arma la cola desde tarjetas, libros y stats; queda en ready', async () => {
    const service = configure(
      [
        buildCard('due', 'b1', CardState.Review),
        buildCard('n1', 'b1', CardState.New),
        buildCard('n2', 'b1', CardState.New),
      ],
      [buildBook('b1', 1)],
      null,
    );

    await service.load();

    expect(service.status()).toBe('ready');
    expect(service.dueCount()).toBe(1);
    expect(service.newCount()).toBe(1); // tope 1
    expect(service.queue()).toHaveLength(2);
    expect(service.perBook()).toEqual([{ bookId: 'b1', name: 'b1', due: 1, new: 1 }]);
  });

  it('applyNewLimit recomputa la cola sin re-consultar', async () => {
    const service = configure(
      [
        buildCard('due', 'b1', CardState.Review),
        buildCard('n1', 'b1', CardState.New),
        buildCard('n2', 'b1', CardState.New),
        buildCard('n3', 'b1', CardState.New),
      ],
      [buildBook('b1', 1)],
      null,
    );
    await service.load();
    expect(service.newCount()).toBe(1); // tope por libro
    expect(service.availableNew()).toBe(3);

    service.applyNewLimit(3); // empujar más

    expect(service.newCount()).toBe(3);
    expect(service.queue()).toHaveLength(4); // 1 vencida + 3 nuevas

    service.applyNewLimit(0); // ninguna nueva

    expect(service.newCount()).toBe(0);
    expect(service.queue()).toHaveLength(1);
  });

  it('descuenta las nuevas ya introducidas hoy (de dailyStats)', async () => {
    const today: DailyStats = {
      id: '2026-06-23',
      date: '2026-06-23',
      newCardsIntroduced: { b1: 1 },
      reviewsCompleted: 1,
      ratingCounts: { again: 0, hard: 0, good: 1, easy: 0 },
    };
    const service = configure([buildCard('n1', 'b1', CardState.New)], [buildBook('b1', 1)], today);

    await service.load();

    expect(service.newCount()).toBe(0);
  });
});
