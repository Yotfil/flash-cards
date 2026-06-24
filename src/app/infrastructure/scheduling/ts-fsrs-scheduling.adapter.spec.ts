import { CardState } from '@domain/models';
import { TsFsrsSchedulingAdapter } from './ts-fsrs-scheduling.adapter';

describe('TsFsrsSchedulingAdapter', () => {
  const adapter = new TsFsrsSchedulingAdapter();

  it('crea el scheduling inicial de una tarjeta nueva (estado New, contadores en cero)', () => {
    const now = new Date('2026-06-23T10:00:00Z');

    const scheduling = adapter.createInitialScheduling(now);

    expect(scheduling.state).toBe(CardState.New);
    expect(scheduling.reps).toBe(0);
    expect(scheduling.lapses).toBe(0);
    expect(scheduling.lastReview).toBeNull();
    expect(scheduling.due).toBeInstanceOf(Date);
  });

  it('mapea todos los campos numéricos del bloque (sin undefined)', () => {
    const scheduling = adapter.createInitialScheduling();

    for (const value of [
      scheduling.stability,
      scheduling.difficulty,
      scheduling.elapsedDays,
      scheduling.scheduledDays,
    ]) {
      expect(typeof value).toBe('number');
    }
  });
});
