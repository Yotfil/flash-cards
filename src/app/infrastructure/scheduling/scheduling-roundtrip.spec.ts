import { Timestamp } from 'firebase/firestore';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import type { CardScheduling } from '@domain/models/card.model';

import { cardDocumentSchema } from '../firestore/schemas/card.schema';
import { TsFsrsSchedulingAdapter } from './ts-fsrs-scheduling.adapter';

// Instante con milisegundos: si el viaje por el almacén los perdiera, la prueba lo vería.
const T0 = new Date('2026-10-23T10:00:00.123Z');
const MINUTE_MS = 60_000;

/** Lo que Firestore guarda: las fechas como `Timestamp`. */
function asStoredDocument(scheduling: CardScheduling) {
  return {
    bookId: 'b1',
    chapterId: 'c1',
    noteId: 'n1',
    direction: 'forward',
    front: 'to give up',
    back: 'rendirse',
    suspended: false,
    createdAt: Timestamp.fromDate(T0),
    updatedAt: Timestamp.fromDate(T0),
    scheduling: {
      ...scheduling,
      due: Timestamp.fromDate(scheduling.due),
      lastReview: scheduling.lastReview ? Timestamp.fromDate(scheduling.lastReview) : null,
    },
  };
}

describe('ida y vuelta de la programación por el almacén', () => {
  it('lo calculado, guardado y leído de vuelta se sigue programando igual', () => {
    const adapter = new TsFsrsSchedulingAdapter();
    const graded = adapter.preview(initialCardScheduling(T0), T0)[3].scheduling;

    const recovered = cardDocumentSchema.parse(asStoredDocument(graded)).scheduling;

    expect(recovered).toEqual(graded);
    const later = new Date(T0.getTime() + 10 * MINUTE_MS);
    expect(adapter.preview(recovered, later)).toEqual(adapter.preview(graded, later));
  });
});
