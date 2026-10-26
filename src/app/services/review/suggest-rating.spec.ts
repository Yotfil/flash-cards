import { suggestRatingByLatency } from './suggest-rating';

describe('suggestRatingByLatency', () => {
  it.each([
    [0, 4],
    [1500, 4],
    [1501, 3],
    [7000, 3],
    [7001, 2],
    [600_000, 2],
  ] as const)('recordar en %d ms sugiere %d', (latencyMs, rating) => {
    expect(suggestRatingByLatency(latencyMs)).toBe(rating);
  });

  it('nunca sugiere "Otra vez"', () => {
    expect([0, 1500, 7000, 7001, 1e9].map(suggestRatingByLatency)).not.toContain(1);
  });
});
