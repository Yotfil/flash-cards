import { type Book, type Card, CardState } from '@domain/models';
import { buildDailyQueue } from './daily-queue';

function buildBook(id: string, newCardsPerDay: number, order: number): Book {
  return {
    id,
    name: id,
    subject: 'general',
    studyDirection: 'forward',
    newCardsPerDay,
    maxReviewsPerDay: 200,
    order,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildCard(id: string, bookId: string, state: CardState, due: Date, createdAt: Date): Card {
  return {
    id,
    bookId,
    chapterId: 'c',
    noteId: id,
    direction: 'forward',
    front: id,
    back: id,
    suspended: false,
    createdAt,
    updatedAt: createdAt,
    scheduling: {
      due,
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

const t = (iso: string): Date => new Date(iso);

describe('buildDailyQueue', () => {
  it('incluye todas las vencidas ordenadas por due y respeta el tope de nuevas', () => {
    const books = [buildBook('b1', 2, 0)];
    const candidates = [
      buildCard('due2', 'b1', CardState.Review, t('2026-06-23T08:00:00Z'), t('2026-06-01')),
      buildCard('due1', 'b1', CardState.Review, t('2026-06-23T06:00:00Z'), t('2026-06-01')),
      buildCard('new1', 'b1', CardState.New, t('2026-06-20'), t('2026-06-10')),
      buildCard('new2', 'b1', CardState.New, t('2026-06-20'), t('2026-06-11')),
      buildCard('new3', 'b1', CardState.New, t('2026-06-20'), t('2026-06-12')),
    ];

    const queue = buildDailyQueue(candidates, books, {});

    expect(queue.dueCount).toBe(2);
    expect(queue.newCount).toBe(2); // tope newCardsPerDay = 2
    // Vencidas primero (por due asc), luego nuevas (por antigüedad).
    expect(queue.cards.map((card) => card.id)).toEqual(['due1', 'due2', 'new1', 'new2']);
    expect(queue.perBook).toEqual([{ bookId: 'b1', name: 'b1', due: 2, new: 2 }]);
  });

  it('descuenta las nuevas ya introducidas hoy', () => {
    const books = [buildBook('b1', 3, 0)];
    const candidates = [
      buildCard('n1', 'b1', CardState.New, t('2026-06-20'), t('2026-06-10')),
      buildCard('n2', 'b1', CardState.New, t('2026-06-20'), t('2026-06-11')),
    ];

    const queue = buildDailyQueue(candidates, books, { b1: 2 });

    expect(queue.newCount).toBe(1); // 3 - 2 ya introducidas = 1
  });

  it('no entrega nuevas si ya se alcanzó el tope', () => {
    const books = [buildBook('b1', 2, 0)];
    const candidates = [buildCard('n1', 'b1', CardState.New, t('2026-06-20'), t('2026-06-10'))];

    const queue = buildDailyQueue(candidates, books, { b1: 2 });

    expect(queue.newCount).toBe(0);
    expect(queue.cards).toHaveLength(0);
  });

  it('omite del desglose los libros sin pendiente y ordena por order del libro', () => {
    const books = [buildBook('b1', 5, 1), buildBook('b2', 5, 0), buildBook('vacío', 5, 2)];
    const candidates = [
      buildCard('d', 'b1', CardState.Review, t('2026-06-23T06:00:00Z'), t('2026-06-01')),
      buildCard('n', 'b2', CardState.New, t('2026-06-20'), t('2026-06-10')),
    ];

    const queue = buildDailyQueue(candidates, books, {});

    expect(queue.perBook.map((book) => book.bookId)).toEqual(['b2', 'b1']);
  });
});
