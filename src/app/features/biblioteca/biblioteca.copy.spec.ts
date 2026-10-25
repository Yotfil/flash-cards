import {
  BIBLIOTECA_COPY,
  bookDeletionDetail,
  chapterDeletionDetail,
  chapterDisplayName,
} from './biblioteca.copy';
import { aChapter } from '@testing/fake-chapter-repository';

describe('textos de la Biblioteca', () => {
  it('el detalle del borrado nombra cuántos capítulos y tarjetas se van', () => {
    expect(bookDeletionDetail({ chapters: 3, cards: 40 })).toBe(
      'Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva.',
    );
  });

  it('usa el singular cuando toca', () => {
    expect(bookDeletionDetail({ chapters: 1, cards: 1 })).toBe(
      'Se borrarán 1 capítulo y 1 tarjeta. Tu historial de repasos se conserva.',
    );
  });

  it('sin conteos lo dice sin números', () => {
    expect(bookDeletionDetail(null)).toBe(
      'También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva.',
    );
  });

  it('el número de tarjetas de un libro usa plural real', () => {
    expect([0, 1, 12].map(BIBLIOTECA_COPY.cards)).toEqual([
      '0 tarjetas',
      '1 tarjeta',
      '12 tarjetas',
    ]);
  });

  it.each([
    [42, 'Se borrarán 42 tarjetas. Tu historial de repasos se conserva. No se puede deshacer.'],
    [1, 'Se borrará 1 tarjeta. Tu historial de repasos se conserva. No se puede deshacer.'],
    [0, 'No se puede deshacer.'],
    [
      null,
      'También se borrarán sus tarjetas. Tu historial de repasos se conserva. No se puede deshacer.',
    ],
  ])('el detalle del borrado de un capítulo con %s tarjetas concuerda el verbo', (count, text) => {
    expect(chapterDeletionDetail(count)).toBe(text);
  });

  it('un capítulo sin nombre se pinta como "Capítulo sin nombre"', () => {
    expect(chapterDisplayName(aChapter({ name: '' }))).toBe('Capítulo sin nombre');
    expect(chapterDisplayName(aChapter({ name: 'Básicos' }))).toBe('Básicos');
  });
});
