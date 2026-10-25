import type { BookPackage } from '@domain/models/book-package';
import type { Book } from '@domain/models/book.model';
import type { Card, CardContentDraft } from '@domain/models/card.model';
import type { Chapter } from '@domain/models/chapter.model';
import { sortCardsForDisplay } from '@services/cards/sort-cards-for-display';

/**
 * El paquete de un libro guardado: su contenido, sin progreso. Capítulos en el orden recibido y,
 * dentro de cada uno, las tarjetas en el orden del listado (dos exportaciones del mismo contenido
 * dan el mismo texto). Las suspendidas entran como las demás.
 */
export function buildBookPackage(
  book: Book,
  chapters: readonly Chapter[],
  cards: readonly Card[],
): BookPackage {
  return {
    name: book.name,
    subject: book.subject,
    chapters: chapters.map((chapter) => ({
      name: chapter.name,
      cards: sortCardsForDisplay(cards.filter((card) => card.chapterId === chapter.id)).map(
        toDraft,
      ),
    })),
  };
}

function toDraft(card: Card): CardContentDraft {
  return {
    cardType: card.cardType ?? 'basic',
    front: card.front,
    back: card.back,
    ...(card.example ? { example: card.example } : {}),
  };
}
