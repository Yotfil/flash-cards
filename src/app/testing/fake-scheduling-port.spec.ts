import { initialCardScheduling } from '@domain/models/card-scheduling';
import { RATINGS } from '@domain/models/rating';
import type { SchedulingPreview } from '@domain/ports/scheduling.port';

import { FakeSchedulingPort } from './fake-scheduling-port';

const T0 = new Date('2026-10-23T10:00:00Z');
const DAY_MS = 86_400_000;

describe('FakeSchedulingPort', () => {
  it('por defecto, cada grado vence en tantos días como vale, con último repaso en el instante', () => {
    const port = new FakeSchedulingPort();

    const result = port.preview(initialCardScheduling(T0), T0);

    for (const rating of RATINGS) {
      const expectedDue = new Date(T0.getTime() + rating * DAY_MS);
      expect(result[rating].intervalDays).toBe(rating);
      expect(result[rating].due).toEqual(expectedDue);
      expect(result[rating].scheduling.due).toEqual(expectedDue);
      expect(result[rating].scheduling.lastReview).toEqual(T0);
    }
  });

  it('setPreview sustituye el generador', () => {
    const port = new FakeSchedulingPort();
    const fixed: SchedulingPreview = {
      scheduling: initialCardScheduling(T0),
      intervalDays: 0,
      due: T0,
      log: {
        state: 0,
        due: T0,
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        lastElapsedDays: 0,
        scheduledDays: 0,
      },
    };

    port.setPreview(() => ({ 1: fixed, 2: fixed, 3: fixed, 4: fixed }));

    expect(port.preview(initialCardScheduling(T0), T0)[3]).toBe(fixed);
  });

  it('registra cada llamada con su estado y su instante', () => {
    const port = new FakeSchedulingPort();
    const scheduling = initialCardScheduling(T0);
    const later = new Date(T0.getTime() + 40_000);

    port.preview(scheduling, T0);
    port.preview(scheduling, later);

    expect(port.calls).toEqual([
      { scheduling, now: T0 },
      { scheduling, now: later },
    ]);
  });
});
