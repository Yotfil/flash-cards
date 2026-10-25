import type { BookPackage, PackageChapter } from '@domain/models/book-package';
import type { CardContentDraft } from '@domain/models/card.model';
import { MAX_NAME_LENGTH } from '@services/books/book-form.schema';
import { MAX_CARD_TEXT, cardFormSchema } from '@services/cards/card-form.schema';
import { hasCloze } from '@services/cards/cloze/parse-cloze';
import { chapterFormSchema } from '@services/chapters/chapter-form.schema';

import { CHAPTER_PREFIX, LINE_BREAK, PIPE, TAB } from './import-grammar';
import {
  REASON_CLOZE_WITH_SEPARATOR,
  REASON_EMPTY_CHAPTER_NAME,
  REASON_EMPTY_SIDE,
  REASON_NO_SEPARATOR,
  tooLongReason,
  type LimitedPart,
} from './import-reasons';
import { splitBasicCard, splitExample } from './split-card-line';

/** Una línea que no entra, con su número (contando las líneas en blanco). */
export interface ImportLineError {
  readonly line: number;
  readonly reason: string;
}

export interface ImportParseResult {
  /** El contenido, sin nombre ni materia del libro (los pone quien importa). */
  readonly package: Pick<BookPackage, 'chapters'>;
  readonly errors: ImportLineError[];
  readonly validCardCount: number;
  readonly chapterCount: number;
}

type CardLine = { readonly draft: CardContentDraft } | { readonly reason: string };

/** El campo del formulario que falló, como se nombra en el motivo. */
const PART_BY_FIELD: Readonly<Record<string, LimitedPart>> = {
  front: 'anverso',
  back: 'reverso',
  example: 'ejemplo',
};

/**
 * Lee el texto de importación línea a línea, en memoria: `#` abre un capítulo y cada otra línea
 * es una tarjeta. Ninguna línea mala aborta las demás: se omite con su motivo y su número. Las
 * tarjetas anteriores al primer encabezado caen en un capítulo por defecto, que solo existe si
 * hace falta.
 */
export function parseImportText(text: string, defaultChapterName: string): ImportParseResult {
  const chapters: PackageChapter[] = [];
  const errors: ImportLineError[] = [];
  let current: PackageChapter | null = null;

  text.split(LINE_BREAK).forEach((raw, index) => {
    const line = raw.trim();
    const lineNumber = index + 1;
    if (line === '') {
      return;
    }
    if (line.startsWith(CHAPTER_PREFIX)) {
      const header = readChapterName(line.slice(CHAPTER_PREFIX.length).trim());
      if ('reason' in header) {
        errors.push({ line: lineNumber, reason: header.reason });
        return;
      }
      current = { name: header.name, cards: [] };
      chapters.push(current);
      return;
    }
    const card = readCardLine(line);
    if ('reason' in card) {
      errors.push({ line: lineNumber, reason: card.reason });
      return;
    }
    if (current === null) {
      current = { name: defaultChapterName, cards: [] };
      chapters.push(current);
    }
    current.cards.push(card.draft);
  });

  return {
    package: { chapters },
    errors,
    validCardCount: chapters.reduce((sum, chapter) => sum + chapter.cards.length, 0),
    chapterCount: chapters.length,
  };
}

/** El nombre del capítulo cumple la misma regla que el formulario de capítulo. */
function readChapterName(name: string): { name: string } | { reason: string } {
  if (chapterFormSchema.shape.name.safeParse(name).success) {
    return { name };
  }
  return {
    reason:
      name === ''
        ? REASON_EMPTY_CHAPTER_NAME
        : tooLongReason('nombre del capítulo', MAX_NAME_LENGTH),
  };
}

/**
 * Una línea de tarjeta: primero se aparta el ejemplo, luego, si tiene huecos, es una cloze (sin
 * separador: si lo lleva no se adivina), y si no, una básica partida por el primer separador.
 */
function readCardLine(line: string): CardLine {
  const card = splitCardLine(line);
  return 'reason' in card ? card : validateCard(card.draft);
}

function splitCardLine(line: string): CardLine {
  const { body, example } = splitExample(line);
  const withExample = example === undefined ? {} : { example };
  if (hasCloze(body)) {
    if (body.includes(PIPE) || body.includes(TAB)) {
      return { reason: REASON_CLOZE_WITH_SEPARATOR };
    }
    return { draft: { cardType: 'cloze', front: body, back: '', ...withExample } };
  }
  const sides = splitBasicCard(body);
  if (sides === null) {
    return { reason: REASON_NO_SEPARATOR };
  }
  if (sides.front === '' || sides.back === '') {
    return { reason: REASON_EMPTY_SIDE };
  }
  return { draft: { cardType: 'basic', front: sides.front, back: sides.back, ...withExample } };
}

/** La misma validez que el formulario de tarjeta: lo que no pasa se omite con su motivo. */
function validateCard(draft: CardContentDraft): CardLine {
  const result = cardFormSchema.safeParse({ ...draft, example: draft.example ?? '' });
  if (result.success) {
    return { draft };
  }
  const field = String(result.error.issues[0]?.path[0] ?? 'front');
  return { reason: tooLongReason(PART_BY_FIELD[field] ?? 'anverso', MAX_CARD_TEXT) };
}
