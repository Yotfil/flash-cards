import { SLOW_RECALL_MS, VERY_FAST_RECALL_MS, suggestRatingByLatency } from './suggest-rating';

describe('suggestRatingByLatency', () => {
  it('recuerdo instantáneo sugiere Fácil (4)', () => {
    expect(suggestRatingByLatency(0)).toBe(4);
    expect(suggestRatingByLatency(VERY_FAST_RECALL_MS)).toBe(4); // límite inclusivo
  });

  it('recuerdo normal sugiere Bien (3)', () => {
    expect(suggestRatingByLatency(VERY_FAST_RECALL_MS + 1)).toBe(3);
    expect(suggestRatingByLatency(SLOW_RECALL_MS)).toBe(3); // límite inclusivo
  });

  it('recuerdo lento sugiere Difícil (2)', () => {
    expect(suggestRatingByLatency(SLOW_RECALL_MS + 1)).toBe(2);
    expect(suggestRatingByLatency(60000)).toBe(2);
  });

  it('nunca sugiere Again (1)', () => {
    for (const ms of [0, 1000, 5000, 10000, 999999]) {
      expect(suggestRatingByLatency(ms)).not.toBe(1);
    }
  });
});
