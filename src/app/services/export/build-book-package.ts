import type { BookPackage, PackageChapter } from '@domain/models/book-package';
import type { Book } from '@domain/models/book.model';
import type { Card, CardContentDraft } from '@domain/models/card.model';
import type { Chapter } from '@domain/models/chapter.model';
import { sortCardsForDisplay } from '@services/cards/sort-cards-for-display';

/** El capítulo final que recoge las tarjetas cuyo capítulo ya no existe. */
const ORPHAN_CHAPTER_NAME = 'Sin capítulo';

/**
 * El paquete de un libro guardado: su contenido, sin progreso. Capítulos en el orden recibido y,
 * dentro de cada uno, las tarjetas en el orden del listado (dos exportaciones del mismo contenido
 * dan el mismo texto). Las suspendidas entran como las demás. Las que perdieron su capítulo (se
 * borró a medias o desde otro dispositivo) van al final, en "Sin capítulo": un respaldo no las
 * pierde, y al importarlo vuelven a verse.
 */
export function buildBookPackage(
  book: Book,
  chapters: readonly Chapter[],
  cards: readonly Card[],
): BookPackage {
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const orphans = cards.filter((card) => !chapterIds.has(card.chapterId));
  return {
    name: book.name,
    subject: book.subject,
    chapters: [
      ...chapters.map((chapter) =>
        toPackageChapter(
          chapter.name,
          cards.filter((card) => card.chapterId === chapter.id),
        ),
      ),
      ...(orphans.length > 0 ? [toPackageChapter(ORPHAN_CHAPTER_NAME, orphans)] : []),
    ],
  };
}

function toPackageChapter(name: string, cards: readonly Card[]): PackageChapter {
  return { name, cards: sortCardsForDisplay(cards).map(toDraft) };
}

function toDraft(card: Card): CardContentDraft {
  return {
    cardType: card.cardType ?? 'basic',
    front: card.front,
    back: card.back,
    ...(card.example ? { example: card.example } : {}),
  };
}
