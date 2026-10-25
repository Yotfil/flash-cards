import { initialCardScheduling } from './card-scheduling';
import { CardState } from './card.model';

describe('initialCardScheduling', () => {
  it('una tarjeta nueva nace lista para estudiarse ya, sin historia', () => {
    const now = new Date('2026-06-15T10:30:00.000Z');

    expect(initialCardScheduling(now)).toEqual({
      due: now,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: CardState.New,
      lastReview: null,
    });
  });
});
