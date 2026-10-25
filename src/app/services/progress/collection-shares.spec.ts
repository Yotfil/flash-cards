import { collectionShares } from './collection-shares';

describe('collectionShares', () => {
  it('el total y la parte de cada grupo, en orden nuevas, en aprendizaje, dominadas', () => {
    expect(collectionShares({ newCards: 3, learning: 2, review: 5 })).toEqual({
      total: 10,
      segments: [
        { key: 'new', count: 3, share: 0.3 },
        { key: 'learning', count: 2, share: 0.2 },
        { key: 'review', count: 5, share: 0.5 },
      ],
    });
  });

  it('sin tarjetas, total 0 y proporciones en cero', () => {
    expect(collectionShares({ newCards: 0, learning: 0, review: 0 })).toEqual({
      total: 0,
      segments: [
        { key: 'new', count: 0, share: 0 },
        { key: 'learning', count: 0, share: 0 },
        { key: 'review', count: 0, share: 0 },
      ],
    });
  });
});
