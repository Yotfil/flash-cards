import { CardState } from '@domain/models/card.model';
import type { GradeRecord } from '@domain/models/grade-record';
import { initialCardScheduling } from '@domain/models/card-scheduling';

import { FakeGradePersistence } from './fake-grade-persistence';

const T0 = new Date('2026-10-24T15:00:00Z');

function aRecord(cardId: string): GradeRecord {
  const scheduling = initialCardScheduling(T0);
  return {
    cardId,
    bookId: 'b1',
    scheduling,
    dayId: '2026-10-24',
    stat: { rating: 3, wasNew: true },
    log: {
      cardId,
      bookId: 'b1',
      rating: 3,
      state: CardState.New,
      due: T0,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      lastElapsedDays: 0,
      scheduledDays: 0,
      reviewedAt: T0,
      durationMs: 8000,
    },
  };
}

describe('FakeGradePersistence', () => {
  it('guarda lo recibido y no resuelve hasta que la prueba lo pide', async () => {
    const persistence = new FakeGradePersistence();
    const settled = vi.fn();

    persistence.persistGrade('u1', aRecord('k1')).then(settled, settled);
    await Promise.resolve();

    expect(persistence.records.map((record) => record.cardId)).toEqual(['k1']);
    expect(persistence.pendingCount).toBe(1);
    expect(settled).not.toHaveBeenCalled();

    persistence.resolveNext();
    await Promise.resolve();
    expect(settled).toHaveBeenCalledWith(undefined);
    expect(persistence.pendingCount).toBe(0);
  });

  it('rechaza en orden, con el error dado', async () => {
    const persistence = new FakeGradePersistence();
    const failure = new Error('permiso denegado');
    const first = persistence.persistGrade('u1', aRecord('k1'));
    const second = persistence.persistGrade('u1', aRecord('k2'));

    persistence.rejectNext(failure);
    persistence.resolveNext();

    await expect(first).rejects.toBe(failure);
    await expect(second).resolves.toBeUndefined();
  });
});
