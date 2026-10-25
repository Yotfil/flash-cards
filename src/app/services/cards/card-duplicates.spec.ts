import { aCard } from '@testing/fake-card-repository';

import { findDuplicateCardIds, isDuplicateDraft } from './card-duplicates';

describe('tarjetas repetidas', () => {
  it('marca las dos que solo difieren en mayúsculas y espacios, no la distinta', () => {
    const cards = [
      aCard({ id: 'a', front: 'to give up', back: 'rendirse' }),
      aCard({ id: 'b', front: 'To Give Up', back: '  rendirse ' }),
      aCard({ id: 'c', front: 'to wake up', back: 'despertarse' }),
    ];

    expect([...findDuplicateCardIds(cards)].sort()).toEqual(['a', 'b']);
  });

  it('el mismo anverso con otro reverso es una doble traducción, no una repetida', () => {
    const cards = [
      aCard({ id: 'a', front: 'get', back: 'obtener' }),
      aCard({ id: 'b', front: 'get', back: 'llegar' }),
    ];

    expect(findDuplicateCardIds(cards).size).toBe(0);
  });

  it('tres idénticas se marcan las tres', () => {
    const cards = ['a', 'b', 'c'].map((id) => aCard({ id, front: 'hola', back: 'hello' }));

    expect([...findDuplicateCardIds(cards)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('un borrador repetido con otro formato se detecta; con otro reverso no', () => {
    const cards = [aCard({ front: 'to give up', back: 'rendirse' })];

    expect(isDuplicateDraft({ front: ' TO give up', back: 'Rendirse ' }, cards)).toBe(true);
    expect(isDuplicateDraft({ front: 'to give up', back: 'abandonar' }, cards)).toBe(false);
  });
});
