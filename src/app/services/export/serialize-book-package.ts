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
 * importarse igual. No inventa escapes: lo que la convención no puede decir se aplana.
 */
export function serializeBookPackage(pkg: BookPackage): string {
  if (pkg.chapters.length === 0) {
    return '';
  }
  return `${pkg.chapters.map(serializeChapter).join('\n\n')}\n`;
}

function serializeChapter(chapter: PackageChapter): string {
  return [`${CHAPTER_PREFIX} ${flatten(chapter.name)}`, ...chapter.cards.map(serializeCard)].join(
    '\n',
  );
}

function serializeCard(card: CardContentDraft): string {
  const body =
    card.cardType === 'cloze'
      ? flatten(card.front)
      : `${flatten(card.front)} ${PIPE} ${flatten(card.back)}`;
  const example = flatten(card.example ?? '');
  return example ? `${body}${EXAMPLE_SEPARATOR}${example}` : body;
}

/** Un campo en una sola línea: cada salto de línea pasa a ser un espacio, y se recorta. */
function flatten(text: string): string {
  return text.split(LINE_BREAK).join(' ').trim();
}
