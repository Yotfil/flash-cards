import type { BookPackage, PackageChapter } from '@domain/models/book-package';
import type { CardContentDraft } from '@domain/models/card.model';
import {
  CHAPTER_PREFIX,
  EXAMPLE_SEPARATOR,
  LINE_BREAK,
  PIPE,
} from '@services/import/import-grammar';

/**
 * El texto de un libro en la convención de importación, su inverso exacto: `# capítulo` por cada
 * capítulo (también el único y los vacíos), una línea por tarjeta y una línea en blanco entre
 * capítulos, terminando en LF. Usa las mismas constantes que el parser, así lo exportado vuelve a
 * importarse igual. No inventa escapes: lo que la convención no puede decir se aplana, y
 * `cardsThatWontReturn` nombra lo que, aun así, no volverá igual.
 */
export function serializeBookPackage(pkg: BookPackage): string {
  if (pkg.chapters.length === 0) {
    return '';
  }
  return `${pkg.chapters.map(serializeChapter).join('\n\n')}\n`;
}

/** La línea que abre un capítulo: `# nombre`. */
export function serializeChapterHeader(name: string): string {
  return `${CHAPTER_PREFIX} ${flatten(name)}`;
}

/** La línea de una tarjeta: `anverso | reverso`, o la cloze tal cual, y ` :: ejemplo` si lo tiene. */
export function serializeCardLine(card: CardContentDraft): string {
  const written = writtenCard(card);
  const body =
    written.cardType === 'cloze' ? written.front : `${written.front} ${PIPE} ${written.back}`;
  return written.example ? `${body}${EXAMPLE_SEPARATOR}${written.example}` : body;
}

/**
 * La tarjeta tal como la escribe la exportación: cada campo en una sola línea y recortado, el
 * reverso de una cloze vacío (no se escribe) y sin ejemplo si queda vacío.
 */
export function writtenCard(card: CardContentDraft): CardContentDraft {
  const example = flatten(card.example ?? '');
  return {
    cardType: card.cardType,
    front: flatten(card.front),
    back: card.cardType === 'cloze' ? '' : flatten(card.back),
    ...(example ? { example } : {}),
  };
}

function serializeChapter(chapter: PackageChapter): string {
  return [serializeChapterHeader(chapter.name), ...chapter.cards.map(serializeCardLine)].join('\n');
}

/** Un campo en una sola línea: cada salto de línea pasa a ser un espacio, y se recorta. */
function flatten(text: string): string {
  return text.split(LINE_BREAK).join(' ').trim();
}
