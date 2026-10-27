import type { BookPackage, PackageChapter } from '@domain/models/book-package';
import type { CardContentDraft } from '@domain/models/card.model';
import { parseImportText, type ImportParseResult } from '@services/import/parse-import-text';

import { serializeCardLine, serializeChapterHeader, writtenCard } from './serialize-book-package';

/** El capítulo por defecto al releer una línea suelta (no entra en la comparación). */
const PROBE_CHAPTER = 'Comprobación';

/**
 * Las tarjetas del paquete que no volverán igual al importar su texto, tal como se escriben y en
 * el orden del texto: las que se omitirían, cambiarían de campo o de tipo, se volverían un
 * capítulo o caerían en otro capítulo. El aplanado de saltos de línea no cuenta (la convención lo
 * acepta).
 *
 * El parser lee línea a línea y lo único que recuerda entre líneas es el capítulo actual. Por eso
 * basta releer cada línea sola con el mismo parser y seguir ese único estado: si ninguna tarjeta
 * sale nombrada, el texto entero vuelve idéntico.
 */
export function cardsThatWontReturn(pkg: BookPackage): CardContentDraft[] {
  return pkg.chapters.flatMap(chapterCardsThatWontReturn).map(writtenCard);
}

/**
 * Si el encabezado no se lee, ninguna tarjeta vuelve a su capítulo. Si no, cada tarjeta se relee;
 * una que abre un capítulo se lleva consigo a las que la siguen en el suyo.
 */
function chapterCardsThatWontReturn(chapter: PackageChapter): CardContentDraft[] {
  if (!opensChapter(reread(serializeChapterHeader(chapter.name)))) {
    return chapter.cards;
  }
  let displaced = false;
  return chapter.cards.filter((card) => {
    const result = reread(serializeCardLine(card));
    if (opensChapter(result)) {
      displaced = true;
    }
    return displaced || !returnsAs(result, writtenCard(card));
  });
}

function reread(line: string): ImportParseResult {
  return parseImportText(line, PROBE_CHAPTER);
}

/** La línea abrió un capítulo nuevo (un encabezado válido), con o sin tarjetas. */
function opensChapter(result: ImportParseResult): boolean {
  return result.errors.length === 0 && result.chapterCount === 1 && result.validCardCount === 0;
}

/** La línea volvió como esa única tarjeta, sin errores. */
function returnsAs(result: ImportParseResult, expected: CardContentDraft): boolean {
  const cards = result.package.chapters.flatMap((chapter) => chapter.cards);
  return result.errors.length === 0 && cards.length === 1 && sameCard(cards[0], expected);
}

function sameCard(actual: CardContentDraft | undefined, expected: CardContentDraft): boolean {
  return (
    actual !== undefined &&
    actual.cardType === expected.cardType &&
    actual.front === expected.front &&
    actual.back === expected.back &&
    (actual.example ?? '') === (expected.example ?? '')
  );
}
