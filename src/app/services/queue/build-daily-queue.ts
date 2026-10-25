import type { Book } from '@domain/models/book.model';
import { CardState, type Card } from '@domain/models/card.model';

import { orderReadyCards } from './ready-cards';

export interface BuildDailyQueueInput {
  /** Las candidatas leídas del almacén (vencen hasta el fin del día). */
  readonly candidates: readonly Card[];
  readonly books: readonly Book[];
  readonly endOfDay: Date;
  /** Nuevas ya introducidas hoy, por libro (de los indicadores del día). */
  readonly introducedByBook: Readonly<Record<string, number>>;
  /** Vencidas ya repasadas hoy, por libro (de los indicadores del día). */
  readonly reviewedByBook: Readonly<Record<string, number>>;
  /**
   * Ajuste de nuevas de la sesión de hoy, por libro. Solo cambia el libro que lo tiene; nunca toma
   * nuevas de otro. Ausente = la cola base.
   */
  readonly sessionNewByBook?: Readonly<Record<string, number>>;
}

/** Lo que un libro aporta a la cola de hoy (una fila del desglose "Por libro"). */
export interface BookPending {
  readonly bookId: string;
  readonly name: string;
  readonly due: number;
  /** Nuevas que entran, con el ajuste de la sesión aplicado. */
  readonly new: number;
  /** Nuevas que le da la cola base: su tanda menos las introducidas hoy. */
  readonly baseNew: number;
  /** Nuevas listas del libro, sin topes: el máximo que el ajuste puede elegir. */
  readonly availableNew: number;
}

export interface DailyQueue {
  /** En orden de estudio: vencidas primero, luego nuevas. */
  readonly cards: Card[];
  readonly dueCount: number;
  readonly newCount: number;
  /** Libros con pendientes, en el orden de la biblioteca. */
  readonly perBook: BookPending[];
  /** Nuevas listas de cada libro (0 si no tiene), para el control de ajuste. */
  readonly availableNewByBook: Readonly<Record<string, number>>;
}

interface NewCardsPlan {
  readonly available: number;
  readonly base: number;
  readonly chosen: number;
}

// Armado de la cola de Hoy (puro). Parte de la definición única de "lista" y aplica los topes
// diarios de cada libro: vencidas topadas por `maxReviewsPerDay` y nuevas por su tanda, o por el
// ajuste de la sesión de ese libro.
export function buildDailyQueue(input: BuildDailyQueueInput): DailyQueue {
  const bookById = new Map(input.books.map((book) => [book.id, book]));
  const ready = orderReadyCards(input.candidates, input.endOfDay);
  const due = capDueByBook(
    ready.filter((card) => card.scheduling.state !== CardState.New),
    bookById,
    input.reviewedByBook,
  );
  // Las nuevas de un libro sin metadatos no entran: no hay tanda que aplicarles.
  const newByBook = groupByBook(
    ready.filter((card) => card.scheduling.state === CardState.New && bookById.has(card.bookId)),
  );
  const plans = new Map(
    input.books.map((book) => [book.id, planNewCards(book, newByBook.get(book.id) ?? [], input)]),
  );
  const fresh = orderReadyCards(
    [...newByBook].flatMap(([bookId, cards]) => cards.slice(0, plans.get(bookId)?.chosen ?? 0)),
    input.endOfDay,
  );

  return {
    cards: [...due, ...fresh],
    dueCount: due.length,
    newCount: fresh.length,
    perBook: breakdown(input.books, plans, countByBook(due)),
    availableNewByBook: Object.fromEntries(
      [...plans].map(([bookId, plan]) => [bookId, plan.available]),
    ),
  };
}

function planNewCards(
  book: Book,
  available: readonly Card[],
  input: BuildDailyQueueInput,
): NewCardsPlan {
  const remaining = Math.max(0, book.newCardsPerDay - (input.introducedByBook[book.id] ?? 0));
  const base = Math.min(available.length, remaining);
  const requested = input.sessionNewByBook?.[book.id];
  const chosen = requested === undefined ? base : clamp(requested, 0, available.length);
  return { available: available.length, base, chosen };
}

/**
 * Vencidas topadas por libro a `maxReviewsPerDay` menos las ya repasadas hoy (0 = sin tope). Entran
 * ordenadas de la más atrasada a la más reciente, así el tope conserva las más atrasadas. Las de
 * un libro sin metadatos pasan sin tope: no hay tope que aplicar.
 */
function capDueByBook(
  due: readonly Card[],
  bookById: ReadonlyMap<string, Book>,
  reviewedByBook: Readonly<Record<string, number>>,
): Card[] {
  const takenByBook = new Map<string, number>();
  return due.filter((card) => {
    const book = bookById.get(card.bookId);
    if (!book || book.maxReviewsPerDay === 0) {
      return true;
    }
    const remaining = Math.max(0, book.maxReviewsPerDay - (reviewedByBook[card.bookId] ?? 0));
    const taken = takenByBook.get(card.bookId) ?? 0;
    if (taken >= remaining) {
      return false;
    }
    takenByBook.set(card.bookId, taken + 1);
    return true;
  });
}

function breakdown(
  books: readonly Book[],
  plans: ReadonlyMap<string, NewCardsPlan>,
  dueByBook: ReadonlyMap<string, number>,
): BookPending[] {
  return [...books]
    .sort((a, b) => a.order - b.order)
    .map((book) => {
      const plan = plans.get(book.id) ?? { available: 0, base: 0, chosen: 0 };
      return {
        bookId: book.id,
        name: book.name,
        due: dueByBook.get(book.id) ?? 0,
        new: plan.chosen,
        baseNew: plan.base,
        availableNew: plan.available,
      };
    })
    .filter((row) => row.due + row.new > 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Agrupa por libro conservando el orden de entrada (aquí, de la más antigua a la más nueva). */
function groupByBook(cards: readonly Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    groups.set(card.bookId, [...(groups.get(card.bookId) ?? []), card]);
  }
  return groups;
}

function countByBook(cards: readonly Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.bookId, (counts.get(card.bookId) ?? 0) + 1);
  }
  return counts;
}
