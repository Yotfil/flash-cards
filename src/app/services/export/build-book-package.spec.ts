import { CardState } from '@domain/models/card.model';
import { aBook } from '@testing/fake-book-repository';
import { aCard } from '@testing/fake-card-repository';
import { aChapter } from '@testing/fake-chapter-repository';

import { buildBookPackage } from './build-book-package';

const BOOK = aBook({ id: 'b1', name: 'Phrasal Verbs', subject: 'language-en' });
const ONE = aChapter({ id: 'c1', bookId: 'b1', name: 'Uno', order: 0 });
const TWO = aChapter({ id: 'c2', bookId: 'b1', name: 'Dos', order: 1 });

describe('buildBookPackage', () => {
  it('copia nombre y materia; capítulos en el orden recibido', () => {
    const pkg = buildBookPackage(BOOK, [TWO, ONE], []);

    expect(pkg.name).toBe('Phrasal Verbs');
    expect(pkg.subject).toBe('language-en');
    expect(pkg.chapters.map((chapter) => chapter.name)).toEqual(['Dos', 'Uno']);
  });

  it('exporta el contenido, no el progreso: las suspendidas entran y la programación no cuenta', () => {
    const base = aCard({ chapterId: 'c1', front: 'a', back: 'b' });
    const reviewed = aCard({
      id: 'k2',
      chapterId: 'c1',
      front: 'a',
      back: 'b',
      suspended: true,
      scheduling: { ...base.scheduling, state: CardState.Review, reps: 12 },
    });
    const third = aCard({ id: 'k3', chapterId: 'c1', front: 'c', back: 'd', example: 'ej' });

    const [chapter] = buildBookPackage(BOOK, [ONE], [base, reviewed, third]).chapters;

    expect(chapter?.cards).toEqual([
      { cardType: 'basic', front: 'a', back: 'b' },
      { cardType: 'basic', front: 'a', back: 'b' },
      { cardType: 'basic', front: 'c', back: 'd', example: 'ej' },
    ]);
  });

  it('cada capítulo con sus tarjetas, en el orden del listado; las cloze conservan su tipo', () => {
    const cards = [
      aCard({ id: 'k1', chapterId: 'c1', front: 'banana', back: 'fruta' }),
      aCard({ id: 'k2', chapterId: 'c1', front: 'Apple', back: 'manzana' }),
      aCard({ id: 'k3', chapterId: 'c1', front: 'apple', back: 'fruta roja' }),
      aCard({ id: 'k4', chapterId: 'c2', cardType: 'cloze', front: 'El {{gato}}', back: '' }),
      aCard({ id: 'k5', chapterId: 'otro', front: 'fuera', back: 'x' }),
    ];

    const pkg = buildBookPackage(BOOK, [ONE, TWO], cards);

    expect(pkg.chapters[0]?.cards.map((card) => card.front)).toEqual(['apple', 'Apple', 'banana']);
    expect(pkg.chapters[1]?.cards).toEqual([{ cardType: 'cloze', front: 'El {{gato}}', back: '' }]);
  });

  it('las tarjetas cuyo capítulo ya no existe salen al final, en «Sin capítulo», en el orden del listado', () => {
    // Su capítulo se borró a medias o desde otro dispositivo: sin esto, el respaldo las perdería.
    const cards = [
      aCard({ id: 'k1', chapterId: 'c1', front: 'hello', back: 'hola' }),
      aCard({ id: 'k2', chapterId: 'borrado', front: 'to get by', back: 'arreglárselas' }),
      aCard({ id: 'k3', chapterId: 'otro-borrado', front: 'bye', back: 'adiós' }),
    ];

    const pkg = buildBookPackage(BOOK, [ONE], cards);

    expect(pkg.chapters.map((chapter) => chapter.name)).toEqual(['Uno', 'Sin capítulo']);
    expect(pkg.chapters[1]?.cards.map((card) => card.front)).toEqual(['bye', 'to get by']);
  });

  it('sin tarjetas huérfanas no aparece «Sin capítulo»', () => {
    const pkg = buildBookPackage(BOOK, [ONE], [aCard({ chapterId: 'c1' })]);

    expect(pkg.chapters.map((chapter) => chapter.name)).toEqual(['Uno']);
  });
});
