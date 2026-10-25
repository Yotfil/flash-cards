import { aCard } from '@testing/fake-card-repository';

import { selectEligibleCards } from './eligible-cards';

describe('selectEligibleCards', () => {
  it('solo las básicas con anverso y reverso; las suspendidas también', () => {
    const basic = aCard({ id: 'basica' });
    const suspended = aCard({ id: 'suspendida', suspended: true });
    const cloze = aCard({ id: 'cloze', cardType: 'cloze', front: 'El {{gato}}', back: '' });
    const blankBack = aCard({ id: 'sin-reverso', back: '   ' });
    const blankFront = aCard({ id: 'sin-anverso', front: '' });

    expect(
      selectEligibleCards([basic, cloze, blankBack, suspended, blankFront]).map((card) => card.id),
    ).toEqual(['basica', 'suspendida']);
  });

  it('sin tarjetas, ninguna elegible', () => {
    expect(selectEligibleCards([])).toEqual([]);
  });
});
