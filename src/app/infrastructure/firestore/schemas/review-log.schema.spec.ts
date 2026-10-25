import { Timestamp } from 'firebase/firestore';

import { CardState } from '@domain/models/card.model';
import type { ReviewLogInput } from '@domain/models/review-log.model';

import { reviewLogSchema, reviewLogToDocument } from './review-log.schema';

const T0 = new Date('2026-10-24T15:00:00.000Z');

const INPUT: ReviewLogInput = {
  cardId: 'k1',
  bookId: 'b1',
  rating: 3,
  state: CardState.New,
  due: T0,
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  lastElapsedDays: 0,
  scheduledDays: 0,
  reviewedAt: new Date('2026-10-24T15:00:08.000Z'),
  durationMs: 8000,
};

describe('documento del historial de repasos', () => {
  it('las fechas se guardan como Timestamp y la duración siempre va', () => {
    const document = reviewLogToDocument(INPUT);

    expect(document['due']).toEqual(Timestamp.fromDate(T0));
    expect(document['reviewedAt']).toEqual(Timestamp.fromDate(INPUT.reviewedAt));
    expect(document['durationMs']).toBe(8000);
    expect(document['rating']).toBe(3);
  });

  it('ida y vuelta: lo escrito se lee igual', () => {
    expect(reviewLogSchema.parse(reviewLogToDocument(INPUT))).toEqual(INPUT);
  });

  it('un registro viejo sin duración se lee', () => {
    const { durationMs, ...old } = reviewLogToDocument(INPUT);

    expect(durationMs).toBe(8000);
    expect(reviewLogSchema.parse(old).durationMs).toBeUndefined();
  });

  it('un registro sin calificación no es válido', () => {
    const { rating, ...broken } = reviewLogToDocument(INPUT);

    expect(rating).toBe(3);
    expect(reviewLogSchema.safeParse(broken).success).toBe(false);
  });
});
