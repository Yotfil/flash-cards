import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { CardRepository, type CardStateCounts } from '@domain/ports';
import { type Card, type CardScheduling, CardState, type User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { DEFAULT_QUIZ_LENGTH, QuizService } from './quiz.service';

function buildScheduling(): CardScheduling {
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
  };
}

function buildCard(id: string, front: string, back: string, cardType?: 'basic' | 'cloze'): Card {
  const card: Card = {
    id,
    bookId: 'book-1',
    chapterId: 'chapter-1',
    noteId: id,
    direction: 'forward',
    front,
    back,
    scheduling: buildScheduling(),
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (cardType !== undefined) {
    card.cardType = cardType;
  }
  return card;
}

/** Sólo lista tarjetas. Cualquier escritura lanza: la práctica NO debe tocar la persistencia. */
class FakeCardRepository extends CardRepository {
  cards: Card[] = [];
  failWith: Error | null = null;

  override async listByChapter(): Promise<Card[]> {
    if (this.failWith) {
      throw this.failWith;
    }
    return [...this.cards];
  }
  override async listByBook(): Promise<Card[]> {
    return [...this.cards];
  }
  override async listDue(): Promise<Card[]> {
    return [];
  }
  override async countByState(): Promise<CardStateCounts> {
    return { newCards: 0, learning: 0, review: 0 };
  }
  override async create(): Promise<Card> {
    throw new Error('La práctica no debe crear tarjetas.');
  }
  override async createMany(): Promise<Card[]> {
    throw new Error('La práctica no debe crear tarjetas.');
  }
  override async update(): Promise<void> {
    throw new Error('La práctica no debe editar tarjetas.');
  }
  override async updateScheduling(): Promise<void> {
    throw new Error('La práctica no debe tocar el scheduling FSRS.');
  }
  override async delete(): Promise<void> {
    throw new Error('La práctica no debe borrar tarjetas.');
  }
}

describe('QuizService', () => {
  let cards: FakeCardRepository;

  function configure(): QuizService {
    cards = new FakeCardRepository();
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
        QuizService,
        { provide: CardRepository, useValue: cards },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(user) } },
      ],
    });
    return TestBed.inject(QuizService);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('startChapter devuelve 0 y no entra si el capítulo no tiene tarjetas elegibles', async () => {
    const service = configure();
    cards.cards = [buildCard('c1', '{{hueco}}', '', 'cloze')]; // las cloze se omiten

    expect(await service.startChapter('chapter-1')).toBe(0);
    expect(service.status()).toBe('idle');
    expect(service.errorMessage()).toBeNull();
  });

  it('startChapter maneja el error de carga de forma visible (contrato)', async () => {
    const service = configure();
    cards.failWith = new Error('sin red');

    expect(await service.startChapter('chapter-1')).toBe(0);
    expect(service.errorMessage()).toContain('No se pudieron cargar');
  });

  it('recorre el quiz llevando puntaje y termina en finished (sin tocar persistencia)', async () => {
    const service = configure();
    // Con 2 tarjetas no hay distractores suficientes: ambas preguntas caen a "escribir".
    cards.cards = [buildCard('a', 'cat', 'gato'), buildCard('b', 'dog', 'perro')];

    expect(await service.startChapter('chapter-1')).toBe(2);
    expect(service.status()).toBe('active');
    expect(service.total()).toBe(2);

    // Primera: correcta (comparación tolerante a mayúsculas/espacios).
    service.answerWritten(`  ${service.current()?.answer?.toUpperCase()} `);
    expect(service.lastCorrect()).toBe(true);
    // Responder dos veces la misma pregunta no cuenta doble.
    service.answerWritten(service.current()?.answer ?? '');
    expect(service.summary().correct).toBe(1);

    service.next();
    expect(service.position()).toBe(2);

    // Segunda: incorrecta.
    service.answerWritten('equivocada');
    expect(service.lastCorrect()).toBe(false);

    service.next();
    expect(service.status()).toBe('finished');
    expect(service.summary()).toEqual({ correct: 1, total: 2 });
  });

  it('no avanza sin responder y no acepta respuestas tras terminar', async () => {
    const service = configure();
    cards.cards = [buildCard('a', 'cat', 'gato'), buildCard('b', 'dog', 'perro')];
    await service.startChapter('chapter-1');

    service.next(); // sin responder: se queda en la primera
    expect(service.position()).toBe(1);

    service.answerWritten(service.current()?.answer ?? '');
    service.next();
    service.answerWritten(service.current()?.answer ?? '');
    service.next();
    expect(service.status()).toBe('finished');

    service.answerWritten('tarde'); // ya no hay pregunta actual
    expect(service.summary().correct).toBe(2);
  });

  it('recorta el quiz al largo por defecto y responde ambos tipos de pregunta', async () => {
    const service = configure();
    cards.cards = Array.from({ length: DEFAULT_QUIZ_LENGTH + 5 }, (_, index) =>
      buildCard(`c${index}`, `front-${index}`, `back-${index}`),
    );

    expect(await service.startChapter('chapter-1')).toBe(DEFAULT_QUIZ_LENGTH);

    // Responde todo correctamente, usando el método que corresponde al tipo generado.
    while (service.status() === 'active') {
      const question = service.current();
      if (!question) {
        break;
      }
      if (question.type === 'multiple-choice') {
        expect(question.options).toContain(question.answer);
        service.answerMultiple(question.answer);
      } else {
        service.answerWritten(question.answer);
      }
      service.next();
    }

    expect(service.status()).toBe('finished');
    expect(service.summary()).toEqual({ correct: DEFAULT_QUIZ_LENGTH, total: DEFAULT_QUIZ_LENGTH });
  });
});
