import type { CardContentDraft } from '@domain/models/card.model';

import { countRepeatedLines } from './count-repeated-lines';

const basic = (front: string, back: string): CardContentDraft => ({
  cardType: 'basic',
  front,
  back,
});

describe('countRepeatedLines', () => {
  it('una línea igual a una tarjeta del capítulo cuenta', () => {
    expect(
      countRepeatedLines(
        [basic('to give up', 'rendirse')],
        [{ front: 'to give up', back: 'rendirse' }],
      ),
    ).toBe(1);
  });

  it('dos líneas iguales dentro del texto cuentan las dos', () => {
    expect(countRepeatedLines([basic('x', 'y'), basic('x', 'y'), basic('a', 'b')], [])).toBe(2);
  });

  it('con la misma normalización que el listado (mayúsculas y espacios)', () => {
    expect(
      countRepeatedLines(
        [basic('To Give  Up', ' rendirse ')],
        [{ front: 'to give up', back: 'rendirse' }],
      ),
    ).toBe(1);
  });

  it('el mismo anverso con otro reverso no es repetida', () => {
    expect(countRepeatedLines([basic('get', 'llegar')], [{ front: 'get', back: 'obtener' }])).toBe(
      0,
    );
  });

  it('sin coincidencias no hay repetidas', () => {
    expect(countRepeatedLines([basic('a', 'b'), basic('c', 'd')], [])).toBe(0);
  });
});
