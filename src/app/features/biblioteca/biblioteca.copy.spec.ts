import { BIBLIOTECA_COPY, bookDeletionDetail } from './biblioteca.copy';

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
});
