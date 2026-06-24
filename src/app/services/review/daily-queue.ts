// Armado de la cola diaria (spec §6.9). Puro y testeable. Recibe las tarjetas CANDIDATAS (las que ya
// vienen con `due ≤ fin del día`, de una sola query), los libros (para `newCardsPerDay` y nombre) y
// cuántas nuevas se introdujeron HOY por libro (de `dailyStats`). Devuelve la cola y los conteos.
//
// Regla: vencidas (state≠0) TODAS, por `due` asc; nuevas (state==0) hasta `newCardsPerDay` menos las
// ya introducidas hoy, por libro. La cola = vencidas seguidas de nuevas.

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
  perBook: BookPending[];
}

export function buildDailyQueue(
  candidates: Card[],
  books: Book[],
  introducedByBook: Record<string, number>,
): DailyQueue {
  const bookById = new Map(books.map((book) => [book.id, book]));

  const due = candidates
    .filter((card) => card.scheduling.state !== CardState.New)
    .sort((a, b) => a.scheduling.due.getTime() - b.scheduling.due.getTime());

  // Nuevas candidatas agrupadas por libro, en orden de creación (la "tanda" es estable).
  const newByBook = new Map<string, Card[]>();
  for (const card of candidates) {
    if (card.scheduling.state === CardState.New) {
      const list = newByBook.get(card.bookId) ?? [];
      list.push(card);
      newByBook.set(card.bookId, list);
    }
  }

  const selectedNew: Card[] = [];
  for (const [bookId, cards] of newByBook) {
    const book = bookById.get(bookId);
    if (book === undefined) {
      continue; // tarjeta de un libro desconocido (no debería pasar); se ignora.
    }
    const remaining = Math.max(0, book.newCardsPerDay - (introducedByBook[bookId] ?? 0));
    const ordered = [...cards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    selectedNew.push(...ordered.slice(0, remaining));
  }

  const perBook = buildPerBook(due, selectedNew, bookById);

  return {
    cards: [...due, ...selectedNew],
    dueCount: due.length,
    newCount: selectedNew.length,
    perBook,
  };
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
