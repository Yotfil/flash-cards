import type { BookPackage } from '@domain/models/book-package';
import { parseImportText } from '@services/import/parse-import-text';
import { aBook } from '@testing/fake-book-repository';
import { aCard } from '@testing/fake-card-repository';
import { aChapter } from '@testing/fake-chapter-repository';

import { buildBookPackage } from './build-book-package';
import { serializeBookPackage } from './serialize-book-package';

const pkg = (chapters: BookPackage['chapters']): BookPackage => ({
  name: 'Libro',
  subject: 'general',
  chapters,
});

const roundTrip = (book: BookPackage) => parseImportText(serializeBookPackage(book), 'x');

describe('exportar e importar de nuevo', () => {
  it.each([
    [
      'básicas, con y sin ejemplo',
      pkg([
        {
          name: 'Movement',
          cards: [
            {
              cardType: 'basic',
              front: 'to give up',
              back: 'rendirse',
              example: 'I gave up smoking',
            },
            { cardType: 'basic', front: 'to look after', back: 'cuidar' },
          ],
        },
      ]),
    ],
    [
      'cloze, con y sin ejemplo',
      pkg([
        {
          name: 'Grammar',
          cards: [
            { cardType: 'cloze', front: 'She {{has lived}} here for 5 years', back: '' },
            { cardType: 'cloze', front: 'El {{gato}} es {{negro}}', back: '', example: 'colores' },
          ],
        },
      ]),
    ],
    [
      'capítulos vacíos y nombres con acentos',
      pkg([
        { name: 'Básicos ñandú', cards: [{ cardType: 'basic', front: 'café', back: 'coffee' }] },
        { name: 'Pendiente', cards: [] },
        { name: 'Él y ella', cards: [{ cardType: 'basic', front: 'std::vector', back: 'vector' }] },
      ]),
    ],
  ])('%s: mismo contenido y ninguna línea omitida', (_label, book) => {
    const parsed = roundTrip(book);

    expect(parsed.package.chapters).toEqual(book.chapters);
    expect(parsed.errors).toEqual([]);
  });

  it('el límite aceptado: un pipe en el anverso vuelve partido por el primer separador', () => {
    const parsed = roundTrip(
      pkg([{ name: 'X', cards: [{ cardType: 'basic', front: 'a | b', back: 'c' }] }]),
    );

    expect(parsed.package.chapters[0]?.cards).toEqual([
      { cardType: 'basic', front: 'a', back: 'b | c' },
    ]);
  });

  it('un capítulo sin nombre vuelve como capítulo aparte, sin mezclarse con el anterior', () => {
    const exported = buildBookPackage(
      aBook({ id: 'b1' }),
      [
        aChapter({ id: 'ch1', name: 'Básicos', order: 0 }),
        aChapter({ id: 'ch2', name: '', order: 1 }),
      ],
      [
        aCard({ id: 'k1', chapterId: 'ch1', front: 'hello', back: 'hola' }),
        aCard({ id: 'k2', chapterId: 'ch2', front: 'bye', back: 'adiós' }),
      ],
    );

    const parsed = roundTrip(exported);

    expect(parsed.errors).toEqual([]);
    expect(parsed.package.chapters).toEqual([
      { name: 'Básicos', cards: [{ cardType: 'basic', front: 'hello', back: 'hola' }] },
      { name: 'Capítulo sin nombre', cards: [{ cardType: 'basic', front: 'bye', back: 'adiós' }] },
    ]);
  });
});
