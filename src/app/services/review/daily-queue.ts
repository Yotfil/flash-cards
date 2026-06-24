// Armado de la cola diaria (spec §6.9). Puro y testeable. Recibe las tarjetas CANDIDATAS (las que ya
// vienen con `due ≤ fin del día`, de una sola query), los libros (para `newCardsPerDay`,
// `maxReviewsPerDay` y nombre), cuántas nuevas se introdujeron HOY por libro y cuántos repasos se
// completaron HOY por libro (ambos de `dailyStats`). Devuelve la cola y los conteos.
//
// Regla: vencidas (state≠0) por `due` asc, topadas por libro a `maxReviewsPerDay` menos las ya
// repasadas hoy (0 = sin tope); nuevas (state==0) hasta `newCardsPerDay` menos las ya introducidas
// hoy, por libro. La cola = vencidas seguidas de nuevas.

import { type Card, CardState } from '@domain/models';
import type { Book } from '@domain/models';

export interface BookPending {
  bookId: string;
  name: string;
  due: number;
  new: number;
}

export interface DailyQueue {
  cards: Card[];
  dueCount: number;
  newCount: number;
  /** Total de tarjetas nuevas candidatas (sin aplicar topes); el máximo que el usuario podría elegir. */
  availableNewCount: number;
  perBook: BookPending[];
}

/**
 * Arma la cola. Las vencidas se topan **por libro** a `maxReviewsPerDay` menos las ya repasadas hoy
 * (`maxReviewsPerDay === 0` = sin tope). Para las nuevas: si `newLimit` se omite, se topan por libro
 * con `newCardsPerDay` menos las introducidas hoy (comportamiento por defecto); si se indica, es un
 * override de SESIÓN que toma hasta `newLimit` nuevas en TOTAL (más antiguas primero), ignorando el
 * tope por libro (para empujar más, o 0 para no añadir).
 */
export function buildDailyQueue(
  candidates: Card[],
  books: Book[],
  introducedByBook: Record<string, number>,
  reviewedByBook: Record<string, number>,
  newLimit?: number,
): DailyQueue {
  const bookById = new Map(books.map((book) => [book.id, book]));

  const dueCandidates = candidates
    .filter((card) => card.scheduling.state !== CardState.New)
    .sort((a, b) => a.scheduling.due.getTime() - b.scheduling.due.getTime());
  const due = selectDueWithCap(dueCandidates, bookById, reviewedByBook);

  const newCandidates = candidates
    .filter((card) => card.scheduling.state === CardState.New && bookById.has(card.bookId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const selectedNew =
    newLimit === undefined
      ? selectByBookCap(newCandidates, bookById, introducedByBook)
      : newCandidates.slice(0, Math.max(0, newLimit));

  const perBook = buildPerBook(due, selectedNew, bookById);

  return {
    cards: [...due, ...selectedNew],
    dueCount: due.length,
    newCount: selectedNew.length,
    availableNewCount: newCandidates.length,
    perBook,
  };
}

/** Vencidas topadas por libro a `maxReviewsPerDay` menos las ya repasadas hoy. `maxReviewsPerDay`
 *  0 = sin tope. Libros desconocidos (sin metadatos) pasan sin topar. Entra ya ordenado por `due`
 *  asc, así que se conservan las más atrasadas. */
function selectDueWithCap(
  dueCandidates: Card[],
  bookById: Map<string, Book>,
  reviewedByBook: Record<string, number>,
): Card[] {
  const takenByBook = new Map<string, number>();
  const selected: Card[] = [];
  for (const card of dueCandidates) {
    const book = bookById.get(card.bookId);
    if (book === undefined || book.maxReviewsPerDay === 0) {
      selected.push(card);
      continue;
    }
    const remaining = Math.max(0, book.maxReviewsPerDay - (reviewedByBook[card.bookId] ?? 0));
    const taken = takenByBook.get(card.bookId) ?? 0;
    if (taken < remaining) {
      selected.push(card);
      takenByBook.set(card.bookId, taken + 1);
    }
  }
  return selected;
}

/** Selección por defecto: por libro, `newCardsPerDay` menos las ya introducidas hoy. */
function selectByBookCap(
  newCandidates: Card[],
  bookById: Map<string, Book>,
  introducedByBook: Record<string, number>,
): Card[] {
  const takenByBook = new Map<string, number>();
  const selected: Card[] = [];
  for (const card of newCandidates) {
    const book = bookById.get(card.bookId);
    if (book === undefined) {
      continue;
    }
    const remaining = Math.max(0, book.newCardsPerDay - (introducedByBook[card.bookId] ?? 0));
    const taken = takenByBook.get(card.bookId) ?? 0;
    if (taken < remaining) {
      selected.push(card);
      takenByBook.set(card.bookId, taken + 1);
    }
  }
  return selected;
}

function buildPerBook(
  due: Card[],
  selectedNew: Card[],
  bookById: Map<string, Book>,
): BookPending[] {
  const counts = new Map<string, { due: number; new: number }>();
  const bump = (bookId: string, key: 'due' | 'new'): void => {
    const entry = counts.get(bookId) ?? { due: 0, new: 0 };
    entry[key] += 1;
    counts.set(bookId, entry);
  };
  for (const card of due) {
    bump(card.bookId, 'due');
  }
  for (const card of selectedNew) {
    bump(card.bookId, 'new');
  }

  const perBook: BookPending[] = [];
  for (const [bookId, count] of counts) {
    const book = bookById.get(bookId);
    if (book !== undefined) {
      perBook.push({ bookId, name: book.name, due: count.due, new: count.new });
    }
  }
  // Orden estable por el orden del libro en la biblioteca.
  return perBook.sort(
    (a, b) => (bookById.get(a.bookId)?.order ?? 0) - (bookById.get(b.bookId)?.order ?? 0),
  );
}
