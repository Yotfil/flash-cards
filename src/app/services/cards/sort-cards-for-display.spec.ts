import { aCard } from '@testing/fake-card-repository';

import { sortCardsForDisplay } from './sort-cards-for-display';

describe('sortCardsForDisplay', () => {
  it('ordena por anverso y luego reverso normalizados, agrupando la misma palabra', () => {
    const cards = [
      aCard({ id: 'banana', front: 'banana', back: 'fruta' }),
      aCard({ id: 'Apple', front: 'Apple', back: 'manzana' }),
      aCard({ id: 'apple', front: 'apple', back: 'fruta roja' }),
    ];

    expect(sortCardsForDisplay(cards).map((card) => card.id)).toEqual(['apple', 'Apple', 'banana']);
  });

  it('las comillas tipográficas ordenan junto a las rectas', () => {
    const cards = [
      aCard({ id: 'rectas-z', front: '"b"', back: 'z' }),
      aCard({ id: 'tipograficas-m', front: '“b”', back: 'm' }),
      aCard({ id: 'rectas-a', front: '"b"', back: 'a' }),
    ];

    expect(sortCardsForDisplay(cards).map((card) => card.id)).toEqual([
      'rectas-a',
      'tipograficas-m',
      'rectas-z',
    ]);
  });

  it('a igual anverso y reverso, la creada antes va primero', () => {
    const newer = aCard({ id: 'nueva', createdAt: new Date('2026-06-15T12:00:00Z') });
    const older = aCard({ id: 'vieja', createdAt: new Date('2026-06-14T12:00:00Z') });

    expect(sortCardsForDisplay([newer, older]).map((card) => card.id)).toEqual(['vieja', 'nueva']);
  });

  it('a igual texto normalizado y fecha, decide el texto tal cual, venga como venga', () => {
    // Las importadas antes de escalonar sus fechas comparten instante: sin este desempate, el
    // orden lo decidía el almacén (por id, al azar) y dos exportaciones salían distintas.
    const sameInstant = new Date('2026-10-25T15:00:00Z');
    const upper = aCard({ id: 'zz', front: 'Apple', back: 'manzana', createdAt: sameInstant });
    const lower = aCard({ id: 'aa', front: 'apple', back: 'manzana', createdAt: sameInstant });

    const oneWay = sortCardsForDisplay([upper, lower]).map((card) => card.id);
    const otherWay = sortCardsForDisplay([lower, upper]).map((card) => card.id);

    expect(otherWay).toEqual(oneWay);
  });

  it('no muta la lista recibida', () => {
    const cards = [aCard({ id: 'b', front: 'b' }), aCard({ id: 'a', front: 'a' })];

    sortCardsForDisplay(cards);

    expect(cards.map((card) => card.id)).toEqual(['b', 'a']);
  });
});
