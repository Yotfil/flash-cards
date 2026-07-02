import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import {
  CardRepository,
  GradePersistencePort,
  SchedulingPort,
  type CardCreateInput,
  type GradePersistenceInput,
  type RatingOutcome,
} from '@domain/ports';
import { type Card, type CardScheduling, CardState, type Rating, type User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { ReviewService } from './review.service';

function buildScheduling(overrides: Partial<CardScheduling> = {}): CardScheduling {
  return {
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
    ...overrides,
  };
}

function buildCard(id: string, scheduling: CardScheduling): Card {
  return {
    id,
    bookId: 'book-1',
    chapterId: 'chapter-1',
    noteId: id,
    direction: 'forward',
    front: id,
    back: id,
    scheduling,
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class FakeCardRepository extends CardRepository {
  cards: Card[] = [];

  override async listByBook(): Promise<Card[]> {
    return [...this.cards];
  }
  override async listByChapter(): Promise<Card[]> {
    return [...this.cards];
  }
  override async listDue(): Promise<Card[]> {
    return [...this.cards];
  }
  override async countByState(): Promise<{ newCards: number; learning: number; review: number }> {
    return { newCards: 0, learning: 0, review: 0 };
  }
  override async updateScheduling(): Promise<void> {
    // No usado: la calificación persiste vía GradePersistencePort.
  }
  override async create(_uid: string, input: CardCreateInput): Promise<Card> {
    return { ...input, id: 'x', createdAt: new Date(), updatedAt: new Date() };
  }
  override async createMany(): Promise<Card[]> {
    return [];
  }
  override async update(): Promise<void> {
    // No usado en estas pruebas.
  }
  override async delete(): Promise<void> {
    // No usado en estas pruebas.
  }
}

class FakeSchedulingPort extends SchedulingPort {
  override createInitialScheduling(): CardScheduling {
    return buildScheduling();
  }
  override schedule(): Record<Rating, RatingOutcome> {
    const outcome = (intervalDays: number, state: CardState): RatingOutcome => ({
      scheduling: buildScheduling({ state, scheduledDays: intervalDays }),
      intervalDays,
      log: {
        state: CardState.New,
        due: new Date('2026-06-23T00:00:00Z'),
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        lastElapsedDays: 0,
        scheduledDays: intervalDays,
      },
    });
    return {
      1: outcome(0, CardState.Learning),
      2: outcome(1, CardState.Review),
      3: outcome(3, CardState.Review),
      4: outcome(7, CardState.Review),
    };
  }
}

class FakeGradePersistence extends GradePersistencePort {
  grades: GradePersistenceInput[] = [];
  /** Si se define, persistGrade rechaza con este error (simula el fallo del batch). */
  failWith: Error | null = null;
  override async persistGrade(_uid: string, input: GradePersistenceInput): Promise<void> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.grades.push(input);
  }
}

describe('ReviewService', () => {
  let cards: FakeCardRepository;
  let persistence: FakeGradePersistence;

  function configure(): ReviewService {
    cards = new FakeCardRepository();
    persistence = new FakeGradePersistence();
    const user: User = {
      id: 'u1',
      displayName: 'Test',
      email: 't@e.com',
      createdAt: new Date(),
      settings: {
        timezone: 'UTC',
        dayStartHour: 4,
        theme: 'system',
        defaultNewCardsPerDay: 20,
        autoGradeByTime: true,
      },
      isSearchable: false,
    };
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        { provide: CardRepository, useValue: cards },
        { provide: SchedulingPort, useClass: FakeSchedulingPort },
        { provide: GradePersistencePort, useValue: persistence },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(user) } },
      ],
    });
    return TestBed.inject(ReviewService);
  }

  it('startBook deja fuera las tarjetas que no están listas (no vencidas y no nuevas)', async () => {
    const service = configure();
    const future = new Date(Date.now() + 7 * 86_400_000);
    cards.cards = [
      buildCard('nueva', buildScheduling({ state: CardState.New })),
      buildCard(
        'vencida',
        buildScheduling({ state: CardState.Review, due: new Date(Date.now() - 1000) }),
      ),
      buildCard('futura', buildScheduling({ state: CardState.Review, due: future })),
    ];

    const count = await service.startBook('book-1');

    expect(count).toBe(2);
    expect(service.status()).toBe('active');
    expect(service.total()).toBe(2);
  });

  it('startBook devuelve 0 y no entra si no hay tarjetas listas', async () => {
    const service = configure();
    const future = new Date(Date.now() + 7 * 86_400_000);
    cards.cards = [buildCard('futura', buildScheduling({ state: CardState.Review, due: future }))];

    expect(await service.startBook('book-1')).toBe(0);
    expect(service.status()).toBe('idle');
  });

  it('grade persiste TODO en una sola operación (scheduling + log + stats, wasNew) y avanza', async () => {
    const service = configure();
    cards.cards = [buildCard('a', buildScheduling({ state: CardState.New }))];
    await service.startBook('book-1');
    service.reveal();

    await service.grade(3);

    expect(persistence.grades).toHaveLength(1);
    const grade = persistence.grades[0];
    expect(grade?.cardId).toBe('a');
    expect(grade?.scheduling.scheduledDays).toBe(3); // el outcome del grado 3 en el fake
    expect(grade?.log).toMatchObject({ cardId: 'a', rating: 3, state: CardState.New });
    expect(grade?.stat).toMatchObject({ rating: 3, bookId: 'book-1', wasNew: true });
    expect(service.status()).toBe('finished');
    expect(service.summary()).toMatchObject({ reviewed: 1, ratingCounts: { good: 1 } });
  });

  it('si la persistencia falla: muestra el error, NO avanza y permite reintentar', async () => {
    const service = configure();
    cards.cards = [buildCard('a', buildScheduling({ state: CardState.New }))];
    await service.startBook('book-1');
    service.reveal();

    persistence.failWith = new Error('sin red');
    await service.grade(3);

    expect(service.errorMessage()).toContain('No se pudo guardar');
    expect(service.status()).toBe('active');
    expect(service.current()?.id).toBe('a'); // sigue en la misma tarjeta
    expect(service.summary().reviewed).toBe(0);

    // Reintento: al volver la red, la misma tarjeta se puede calificar.
    persistence.failWith = null;
    await service.grade(3);
    expect(persistence.grades).toHaveLength(1);
    expect(service.errorMessage()).toBeNull();
    expect(service.status()).toBe('finished');
  });

  it('avanza por toda la cola antes de terminar', async () => {
    const service = configure();
    cards.cards = [
      buildCard('a', buildScheduling({ state: CardState.New })),
      buildCard('b', buildScheduling({ state: CardState.New })),
    ];
    await service.startBook('book-1');

    service.reveal();
    await service.grade(1);
    expect(service.status()).toBe('active');
    expect(service.current()?.id).toBe('b');

    service.reveal();
    await service.grade(4);
    expect(service.status()).toBe('finished');
    expect(service.summary().reviewed).toBe(2);
  });
});
