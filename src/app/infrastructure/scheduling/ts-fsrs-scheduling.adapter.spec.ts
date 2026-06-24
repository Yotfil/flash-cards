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

  it('mapea todos los campos numéricos del bloque (incluido learningSteps)', () => {
    const scheduling = adapter.createInitialScheduling();

    for (const value of [
      scheduling.stability,
      scheduling.difficulty,
      scheduling.elapsedDays,
      scheduling.scheduledDays,
      scheduling.learningSteps,
    ]) {
      expect(typeof value).toBe('number');
    }
  });

  describe('schedule', () => {
    const now = new Date('2026-06-23T10:00:00Z');

    it('devuelve las 4 opciones con su scheduling, log e intervalo', () => {
      const outcomes = adapter.schedule(adapter.createInitialScheduling(now), now);

      for (const rating of [1, 2, 3, 4] as const) {
        expect(outcomes[rating].scheduling.due).toBeInstanceOf(Date);
        expect(typeof outcomes[rating].intervalDays).toBe('number');
        expect(outcomes[rating].log.state).toBe(CardState.New);
      }
    });

    it('el intervalo crece de Again a Easy (1 ≤ 2 ≤ 3 ≤ 4)', () => {
      // Tarjeta ya en repaso (estable) para que se vean intervalos de días separados.
      const reviewed = adapter.schedule(adapter.createInitialScheduling(now), now)[3].scheduling;
      const later = new Date('2026-06-30T10:00:00Z');

      const outcomes = adapter.schedule(reviewed, later);

      expect(outcomes[1].intervalDays).toBeLessThanOrEqual(outcomes[2].intervalDays);
      expect(outcomes[2].intervalDays).toBeLessThanOrEqual(outcomes[3].intervalDays);
      expect(outcomes[3].intervalDays).toBeLessThanOrEqual(outcomes[4].intervalDays);
    });

    it('Again deja la tarjeta en aprendizaje/reaprendizaje (no en Review)', () => {
      const reviewed = adapter.schedule(adapter.createInitialScheduling(now), now)[3].scheduling;
      const later = new Date('2026-06-30T10:00:00Z');

      const again = adapter.schedule(reviewed, later)[1].scheduling;

      expect(again.state).not.toBe(CardState.Review);
    });
  });
});
