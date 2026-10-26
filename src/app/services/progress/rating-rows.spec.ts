import { aDailyStats } from '@testing/fake-daily-stats-repository';

import { ratingRows } from './rating-rows';

describe('ratingRows', () => {
  it('cuatro filas en orden Otra vez, Difícil, Bien, Fácil con su parte de los repasos', () => {
    const stats = aDailyStats({
      reviewsCompleted: 7,
      ratingCounts: { again: 1, hard: 1, good: 4, easy: 1 },
    });

    expect(ratingRows(stats)).toEqual([
      { rating: 1, count: 1, share: 1 / 7 },
      { rating: 2, count: 1, share: 1 / 7 },
      { rating: 3, count: 4, share: 4 / 7 },
      { rating: 4, count: 1, share: 1 / 7 },
    ]);
  });

  it('sin contador del día, cuatro filas en cero', () => {
    expect(ratingRows(null)).toEqual([
      { rating: 1, count: 0, share: 0 },
      { rating: 2, count: 0, share: 0 },
      { rating: 3, count: 0, share: 0 },
      { rating: 4, count: 0, share: 0 },
    ]);
  });

  it('un contador parcial cuenta como cero lo que falta', () => {
    const partial = aDailyStats({ reviewsCompleted: 3 });
    // Un documento viejo puede traer solo los grados que se usaron.
    Object.assign(partial, { ratingCounts: { good: 3 } });

    expect(ratingRows(partial).map((row) => row.count)).toEqual([0, 0, 3, 0]);
    expect(ratingRows(partial)[2]?.share).toBe(1);
  });
});
