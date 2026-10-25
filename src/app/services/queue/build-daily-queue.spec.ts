import { CardState, type Card } from '@domain/models/card.model';
import { aBook } from '@testing/fake-book-repository';
import { aCard } from '@testing/fake-card-repository';

import { buildDailyQueue, type BuildDailyQueueInput } from './build-daily-queue';

const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Vencida hace `minutesAgo` minutos (antes = más atrasada). */
function dueCard(id: string, bookId: string, minutesAgo: number): Card {
  const base = aCard({ id, bookId });
  return {
    ...base,
    scheduling: {
      ...base.scheduling,
      state: CardState.Review,
      due: new Date(END_OF_DAY.getTime() - minutesAgo * MINUTE_MS),
    },
  };
}

/** Nueva creada hace `daysAgo` días (antes = más antigua). */
function newCard(id: string, bookId: string, daysAgo: number): Card {
  const createdAt = new Date(END_OF_DAY.getTime() - daysAgo * DAY_MS);
  const base = aCard({ id, bookId, createdAt });
  return { ...base, scheduling: { ...base.scheduling, state: CardState.New, due: createdAt } };
}

const dues = (count: number, bookId: string, prefix = bookId) =>
  Array.from({ length: count }, (_, index) =>
    dueCard(`${prefix}-d${index}`, bookId, count - index),
  );
const news = (count: number, bookId: string) =>
  Array.from({ length: count }, (_, index) =>
    newCard(`${bookId}-n${index}`, bookId, count - index),
  );

function build(overrides: Partial<BuildDailyQueueInput>) {
  return buildDailyQueue({
    candidates: [],
    books: [],
    endOfDay: END_OF_DAY,
    introducedByBook: {},
    reviewedByBook: {},
    ...overrides,
  });
}

const ids = (cards: readonly Card[]) => cards.map((card) => card.id);

describe('buildDailyQueue · vencidas', () => {
  it('el tope del libro conserva las más atrasadas', () => {
    const queue = build({
      books: [aBook({ id: 'b1', maxReviewsPerDay: 2 })],
      candidates: dues(5, 'b1'),
    });

    expect(ids(queue.cards)).toEqual(['b1-d0', 'b1-d1']);
    expect(queue.dueCount).toBe(2);
  });

  it('descuenta los repasos ya hechos hoy', () => {
    const queue = build({
      books: [aBook({ id: 'b1', maxReviewsPerDay: 10 })],
      candidates: dues(20, 'b1'),
      reviewedByBook: { b1: 8 },
    });

    expect(queue.dueCount).toBe(2);
  });

  it('cero significa sin tope', () => {
    const queue = build({
      books: [aBook({ id: 'b1', maxReviewsPerDay: 0 })],
      candidates: dues(300, 'b1'),
    });

    expect(queue.dueCount).toBe(300);
  });

  it('las vencidas de un libro sin metadatos pasan sin tope', () => {
    const queue = build({
      books: [aBook({ id: 'b1', maxReviewsPerDay: 1 })],
      candidates: [...dues(3, 'b1'), ...dues(3, 'sin-libro')],
    });

    expect(queue.dueCount).toBe(4);
  });
});

describe('buildDailyQueue · nuevas por libro', () => {
  it('respeta la tanda del libro con las más antiguas', () => {
    const queue = build({
      books: [aBook({ id: 'b1', newCardsPerDay: 3 })],
      candidates: news(10, 'b1'),
    });

    expect(ids(queue.cards)).toEqual(['b1-n0', 'b1-n1', 'b1-n2']);
    expect(queue.newCount).toBe(3);
    expect(queue.availableNewByBook).toEqual({ b1: 10 });
  });

  it('descuenta las introducidas hoy', () => {
    const queue = build({
      books: [aBook({ id: 'b1', newCardsPerDay: 5 })],
      candidates: news(10, 'b1'),
      introducedByBook: { b1: 4 },
    });

    expect(queue.newCount).toBe(1);
  });

  it('con la tanda agotada no entra ninguna, pero siguen disponibles para el ajuste', () => {
    const queue = build({
      books: [aBook({ id: 'b1', newCardsPerDay: 5 })],
      candidates: news(10, 'b1'),
      introducedByBook: { b1: 5 },
    });

    expect(queue.newCount).toBe(0);
    expect(queue.availableNewByBook).toEqual({ b1: 10 });
  });

  it('las nuevas de un libro sin metadatos no entran', () => {
    const queue = build({ books: [], candidates: news(4, 'sin-libro') });

    expect(queue.newCount).toBe(0);
    expect(queue.availableNewByBook).toEqual({});
  });

  it('las vencidas van antes que las nuevas', () => {
    const queue = build({
      books: [aBook({ id: 'b1', newCardsPerDay: 2 })],
      candidates: [...news(2, 'b1'), ...dues(2, 'b1')],
    });

    expect(ids(queue.cards)).toEqual(['b1-d0', 'b1-d1', 'b1-n0', 'b1-n1']);
  });
});

describe('buildDailyQueue · ajuste de nuevas de la sesión por libro', () => {
  const INGLES = aBook({ id: 'ingles', name: 'Inglés', newCardsPerDay: 5, order: 0 });
  const MEDICINA = aBook({ id: 'medicina', name: 'Medicina', newCardsPerDay: 5, order: 1 });
  const candidates = [...news(20, 'ingles'), ...news(12, 'medicina'), ...dues(3, 'ingles')];
  const newIds = (cards: readonly Card[], bookId: string) =>
    cards.filter((card) => card.bookId === bookId && card.id.includes('-n')).map((card) => card.id);

  it('subir un libro por encima de su tanda toma sus nuevas más antiguas y no toca a los demás', () => {
    const queue = build({
      books: [INGLES, MEDICINA],
      candidates,
      sessionNewByBook: { ingles: 11 },
    });

    expect(newIds(queue.cards, 'ingles')).toEqual(news(11, 'ingles').map((card) => card.id));
    expect(newIds(queue.cards, 'medicina')).toHaveLength(5);
  });

  it('un libro no toma nuevas de otro: se detiene en sus disponibles', () => {
    const queue = build({
      books: [INGLES, MEDICINA],
      candidates,
      sessionNewByBook: { medicina: 50 },
    });

    expect(newIds(queue.cards, 'medicina')).toHaveLength(12);
    expect(newIds(queue.cards, 'ingles')).toHaveLength(5);
  });

  it('con todos los libros a cero quedan solo las vencidas', () => {
    const queue = build({
      books: [INGLES, MEDICINA],
      candidates,
      sessionNewByBook: { ingles: 0, medicina: 0 },
    });

    expect(queue.newCount).toBe(0);
    expect(queue.dueCount).toBe(3);
  });

  it('un libro sin nuevas tiene cero disponibles', () => {
    const queue = build({
      books: [INGLES, aBook({ id: 'vacio', order: 2 })],
      candidates,
    });

    expect(queue.availableNewByBook).toEqual({ ingles: 20, vacio: 0 });
  });

  it('el ajuste no toca la configuración de los libros', () => {
    const books = [INGLES, MEDICINA].map((book) => Object.freeze({ ...book }));

    build({ books, candidates, sessionNewByBook: { ingles: 11, medicina: 0 } });

    expect(books.map((book) => book.newCardsPerDay)).toEqual([5, 5]);
  });
});

describe('buildDailyQueue · desglose por libro', () => {
  const INGLES = aBook({ id: 'ingles', name: 'Inglés', newCardsPerDay: 8, order: 0 });
  const MEDICINA = aBook({ id: 'medicina', name: 'Medicina', order: 1 });
  const QUIMICA = aBook({ id: 'quimica', name: 'Química', order: 2 });
  const candidates = [...dues(3, 'medicina'), ...dues(10, 'ingles'), ...news(20, 'ingles')];

  it('lista los libros con pendientes en el orden de la biblioteca y omite los demás', () => {
    const queue = build({ books: [QUIMICA, MEDICINA, INGLES], candidates });

    expect(queue.perBook).toEqual([
      { bookId: 'ingles', name: 'Inglés', due: 10, new: 8, baseNew: 8, availableNew: 20 },
      { bookId: 'medicina', name: 'Medicina', due: 3, new: 0, baseNew: 0, availableNew: 0 },
    ]);
  });

  it('las nuevas de la fila reflejan el ajuste de la sesión; la base sigue a la vista', () => {
    const queue = build({
      books: [INGLES, MEDICINA],
      candidates,
      sessionNewByBook: { ingles: 12 },
    });

    expect(queue.perBook[0]).toEqual({
      bookId: 'ingles',
      name: 'Inglés',
      due: 10,
      new: 12,
      baseNew: 8,
      availableNew: 20,
    });
  });
});
