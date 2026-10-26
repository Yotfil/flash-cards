import { createEmptyCard } from 'ts-fsrs';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import { CardState, type CardScheduling } from '@domain/models/card.model';
import { RATINGS } from '@domain/models/rating';

import {
  TsFsrsSchedulingAdapter,
  toCardScheduling,
  toFsrsCard,
} from './ts-fsrs-scheduling.adapter';

const T0 = new Date('2026-10-23T10:00:00Z');
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const at = (ms: number) => new Date(T0.getTime() + ms);

describe('TsFsrsSchedulingAdapter · traducción y estado inicial', () => {
  it('el estado inicial del dominio es idéntico al que el algoritmo da a una tarjeta vacía', () => {
    expect(toCardScheduling(createEmptyCard(T0))).toEqual(initialCardScheduling(T0));
  });

  it('una tarjeta repasada va y vuelve entre ambos formatos sin perder nada', () => {
    const reviewed: CardScheduling = {
      due: new Date(T0.getTime() + 4 * DAY_MS),
      stability: 10,
      difficulty: 5,
      elapsedDays: 2,
      scheduledDays: 4,
      learningSteps: 0,
      reps: 3,
      lapses: 1,
      state: CardState.Review,
      lastReview: new Date(T0.getTime() - 2 * DAY_MS),
    };

    expect(toCardScheduling(toFsrsCard(reviewed))).toEqual(reviewed);
  });

  it('"sin último repaso" es null en el dominio y ausente en el algoritmo', () => {
    const fresh = initialCardScheduling(T0);

    expect('last_review' in toFsrsCard(fresh)).toBe(false);
    expect(toCardScheduling(toFsrsCard(fresh)).lastReview).toBeNull();
  });
});

describe('TsFsrsSchedulingAdapter · tarjeta nueva', () => {
  const adapter = new TsFsrsSchedulingAdapter();
  const result = adapter.preview(initialCardScheduling(T0), T0);

  it('da un resultado por grado con su estado, sus días, su vencimiento y su historial', () => {
    expect(Object.keys(result)).toEqual(['1', '2', '3', '4']);
    for (const rating of RATINGS) {
      expect(result[rating]).toEqual({
        scheduling: expect.any(Object),
        intervalDays: expect.any(Number),
        due: expect.any(Date),
        log: expect.any(Object),
      });
      expect(result[rating].scheduling.due).toEqual(result[rating].due);
    }
  });

  it('Otra vez, Difícil y Bien vencen en minutos (0 días); Fácil, en 8 días', () => {
    expect(RATINGS.map((rating) => result[rating].intervalDays)).toEqual([0, 0, 0, 8]);
    expect(result[1].due).toEqual(at(MINUTE_MS));
    expect(result[3].due).toEqual(at(10 * MINUTE_MS));
    expect(result[2].due.getTime()).toBeGreaterThan(result[1].due.getTime());
    expect(result[2].due.getTime()).toBeLessThan(result[3].due.getTime());
  });

  it('los tres primeros quedan aprendiendo y Fácil pasa a repaso', () => {
    expect(RATINGS.map((rating) => result[rating].scheduling.state)).toEqual([
      CardState.Learning,
      CardState.Learning,
      CardState.Learning,
      CardState.Review,
    ]);
  });

  it('cuenta una repetición, ningún fallo, y el último repaso es el instante recibido', () => {
    for (const rating of RATINGS) {
      expect(result[rating].scheduling.reps).toBe(1);
      expect(result[rating].scheduling.lapses).toBe(0);
      expect(result[rating].scheduling.lastReview).toEqual(T0);
    }
  });

  it('la misma entrada da siempre el mismo resultado', () => {
    expect(adapter.preview(initialCardScheduling(T0), T0)).toEqual(result);
  });
});

describe('TsFsrsSchedulingAdapter · transiciones', () => {
  const adapter = new TsFsrsSchedulingAdapter();
  const inReview: CardScheduling = {
    due: T0,
    stability: 10,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 2,
    learningSteps: 0,
    reps: 3,
    lapses: 0,
    state: CardState.Review,
    lastReview: at(-2 * DAY_MS),
  };

  it('aprendiendo en su segundo paso: Bien gradúa a repaso; Otra vez reinicia los pasos', () => {
    // Una nueva calificada Bien hace 10 minutos: queda en el segundo paso y vence ahora.
    const learning = adapter.preview(
      initialCardScheduling(at(-10 * MINUTE_MS)),
      at(-10 * MINUTE_MS),
    )[3].scheduling;
    expect(learning.learningSteps).toBe(1);

    const result = adapter.preview(learning, T0);

    expect(result[3].scheduling.state).toBe(CardState.Review);
    expect(result[3].intervalDays).toBeGreaterThanOrEqual(1);
    expect(result[1].scheduling.state).toBe(CardState.Learning);
    expect(result[1].scheduling.learningSteps).toBe(0);
    expect(result[1].due).toEqual(at(MINUTE_MS));
  });

  it('en repaso, Otra vez pasa a reaprender en 10 minutos y suma un fallo', () => {
    const again = adapter.preview(inReview, T0)[1];

    expect(again.scheduling.state).toBe(CardState.Relearning);
    expect(again.due).toEqual(at(10 * MINUTE_MS));
    expect(again.scheduling.lapses).toBe(1);
  });

  it('en repaso, los intervalos crecen con el grado y solo Otra vez cuenta fallo', () => {
    const result = adapter.preview(inReview, T0);
    const days = RATINGS.map((rating) => result[rating].intervalDays);

    expect(days[0]).toBe(0);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(result[2].due.getTime()).toBeLessThan(result[3].due.getTime());
    expect(result[3].due.getTime()).toBeLessThan(result[4].due.getTime());
    expect([2, 3, 4].map((rating) => result[rating as 2 | 3 | 4].scheduling.lapses)).toEqual([
      0, 0, 0,
    ]);
  });

  it('reaprendiendo: Bien la recupera a repaso; Otra vez la deja en minutos sin otro fallo', () => {
    const relearning = adapter.preview(inReview, T0)[1].scheduling;
    const now = at(10 * MINUTE_MS);

    const result = adapter.preview(relearning, now);

    expect(result[3].scheduling.state).toBe(CardState.Review);
    expect(result[3].intervalDays).toBeGreaterThanOrEqual(1);
    expect(result[1].scheduling.state).toBe(CardState.Relearning);
    expect(result[1].due.getTime() - now.getTime()).toBeLessThan(60 * MINUTE_MS);
    expect(result[1].scheduling.lapses).toBe(relearning.lapses);
  });

  it('cada grado suma una repetición', () => {
    const result = adapter.preview({ ...inReview, reps: 2 }, T0);

    expect(RATINGS.map((rating) => result[rating].scheduling.reps)).toEqual([3, 3, 3, 3]);
  });
});

describe('TsFsrsSchedulingAdapter · historial e instantes', () => {
  const adapter = new TsFsrsSchedulingAdapter();
  const dueToday: CardScheduling = {
    due: at(-5 * DAY_MS),
    stability: 4,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 2,
    learningSteps: 0,
    reps: 2,
    lapses: 0,
    state: CardState.Review,
    lastReview: at(-7 * DAY_MS),
  };

  it('el historial guarda el estado previo, los días programados y los transcurridos', () => {
    const { log } = adapter.preview(dueToday, T0)[3];

    expect(log.state).toBe(CardState.Review);
    expect(log.scheduledDays).toBe(2);
    expect(log.elapsedDays).toBe(7);
  });

  it('calificar 40 segundos después de ver da los mismos días y su propio último repaso', () => {
    const later = at(40_000);

    const shown = adapter.preview(dueToday, T0)[3];
    const graded = adapter.preview(dueToday, later)[3];

    expect(graded.intervalDays).toBe(shown.intervalDays);
    expect(shown.scheduling.lastReview).toEqual(T0);
    expect(graded.scheduling.lastReview).toEqual(later);
  });

  it('el mismo instante escrito en dos zonas horarias da los mismos vencimientos', () => {
    const utc = adapter.preview(dueToday, new Date('2026-10-23T10:00:00Z'));
    const bogota = adapter.preview(dueToday, new Date('2026-10-23T05:00:00-05:00'));

    expect(RATINGS.map((rating) => bogota[rating].due)).toEqual(
      RATINGS.map((rating) => utc[rating].due),
    );
  });
});
