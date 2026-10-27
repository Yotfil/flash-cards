import type { BookPackage, PackageChapter } from '@domain/models/book-package';
import type { CardContentDraft } from '@domain/models/card.model';
import { parseImportText } from '@services/import/parse-import-text';

import { cardsThatWontReturn } from './cards-that-wont-return';
import { serializeBookPackage, writtenCard } from './serialize-book-package';

const pkg = (chapters: PackageChapter[]): BookPackage => ({
  name: 'Libro',
  subject: 'general',
  chapters,
});
const basic = (front: string, back: string, example?: string): CardContentDraft => ({
  cardType: 'basic',
  front,
  back,
  ...(example === undefined ? {} : { example }),
});
const cloze = (front: string, example?: string): CardContentDraft => ({
  cardType: 'cloze',
  front,
  back: '',
  ...(example === undefined ? {} : { example }),
});
const frontsOf = (book: BookPackage) => cardsThatWontReturn(book).map((card) => card.front);

/** Contenidos que el formulario de tarjeta acepta tal cual (la matriz de la revisión, EX-01). */
const MATRIX: readonly [string, CardContentDraft][] = [
  ['Haskell: " :: " en el reverso', basic('map', 'map :: (a -> b) -> [a] -> [b]')],
  ['cloze con " :: "', cloze('{{length}} :: [a] -> Int')],
  ['shell: "|" en el anverso', basic('ls | grep', 'filtra la salida')],
  ['C: el anverso empieza por "#"', basic('#include', 'incluye un archivo')],
  ['cloze que empieza por "#"', cloze('#{{1}} en ventas')],
  ['Angular: "{{ }}" en una básica', basic('{{ nombre }}', 'interpolación')],
  ['cloze con "|"', cloze('El {{gato}} | perro')],
  ['ejemplo con " :: "', basic('a', 'b', 'uno :: dos')],
  ['cloze con ejemplo con "|"', cloze('She {{has lived}} here', 'since | for')],
  ['std::vector sin espacios', basic('std::vector', 'vector dinámico')],
];

/** El texto entero vuelve idéntico: los mismos capítulos con las tarjetas tal como se escriben. */
function wholeTextReturns(book: BookPackage): boolean {
  const parsed = parseImportText(serializeBookPackage(book), 'Por defecto');
  const written = book.chapters.map((chapter) => ({
    name: chapter.name,
    cards: chapter.cards.map(writtenCard),
  }));
  return (
    parsed.errors.length === 0 &&
    JSON.stringify(parsed.package.chapters) === JSON.stringify(written)
  );
}

describe('cardsThatWontReturn', () => {
  it('lo que la convención sabe decir vuelve igual: no nombra nada', () => {
    const book = pkg([
      {
        name: 'Básicos ñandú',
        cards: [
          basic('to give up', 'rendirse', 'I gave up smoking'),
          basic('to look after', 'cuidar'),
          basic('std::vector', 'vector dinámico'),
        ],
      },
      { name: 'Pendiente', cards: [] },
      { name: 'Grammar', cards: [cloze('She {{has lived}} here'), cloze('El {{gato}}', 'gatos')] },
    ]);

    expect(cardsThatWontReturn(book)).toEqual([]);
  });

  it('un " :: " en el reverso inventaría un ejemplo: la nombra', () => {
    const book = pkg([{ name: 'Haskell', cards: [basic('map', 'map :: (a -> b) -> [a] -> [b]')] }]);

    expect(frontsOf(book)).toEqual(['map']);
  });

  it('las que empiezan por "#" se volverían capítulos y la siguiente caería en uno de ellos', () => {
    const book = pkg([
      {
        name: 'Preprocesador',
        cards: [
          basic('#define', 'define una macro'),
          basic('#include', 'incluye un archivo'),
          basic('pragma', 'directiva del compilador'),
        ],
      },
      { name: 'Otro', cards: [basic('x', 'y')] },
    ]);

    expect(frontsOf(book)).toEqual(['#define', '#include', 'pragma']);
  });

  it('un "|" en el anverso partiría la tarjeta por otro sitio: la nombra', () => {
    const book = pkg([{ name: 'Shell', cards: [basic('ls | grep', 'filtra la salida')] }]);

    expect(frontsOf(book)).toEqual(['ls | grep']);
  });

  it('el aplanado de los saltos de línea no cuenta (la spec lo acepta)', () => {
    const book = pkg([
      { name: 'Verbos', cards: [basic('to give up', 'rendirse\ndarse por vencido')] },
    ]);

    expect(cardsThatWontReturn(book)).toEqual([]);
  });

  it('devuelve las tarjetas tal como se escriben', () => {
    const book = pkg([{ name: 'C', cards: [basic('#pragma\nonce', 'una vez')] }]);

    expect(cardsThatWontReturn(book)).toEqual([basic('#pragma once', 'una vez')]);
  });

  it('si el encabezado no se puede leer, ninguna de sus tarjetas vuelve a su capítulo', () => {
    const book = pkg([
      { name: 'Uno', cards: [basic('a', 'b')] },
      { name: 'x'.repeat(121), cards: [basic('c', 'd'), basic('e', 'f')] },
    ]);

    expect(frontsOf(book)).toEqual(['c', 'e']);
  });

  it.each(MATRIX)('%s: o vuelve igual o se nombra', (_label, card) => {
    const book = pkg([{ name: 'C', cards: [card] }]);
    expect(cardsThatWontReturn(book).length === 0).toBe(wholeTextReturns(book));
  });

  it('la lista queda vacía exactamente cuando el texto entero vuelve idéntico', () => {
    const books = [
      pkg(MATRIX.map(([label, card]) => ({ name: label, cards: [card] }))),
      pkg([{ name: 'Todo', cards: MATRIX.map(([, card]) => card) }]),
      pkg([{ name: 'Seguro', cards: [basic('a', 'b'), cloze('El {{gato}}')] }]),
      pkg([{ name: 'Vacío', cards: [] }]),
      pkg([]),
    ];

    for (const book of books) {
      expect(cardsThatWontReturn(book).length === 0).toBe(wholeTextReturns(book));
    }
  });
});
