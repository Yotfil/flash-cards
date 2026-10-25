import { Timestamp } from 'firebase/firestore';

import { cardDocumentSchema } from './card.schema';

const NOW = Timestamp.fromDate(new Date('2026-06-15T10:00:00.000Z'));

function document(
  overrides: Record<string, unknown> = {},
  scheduling: Record<string, unknown> = {},
) {
  return {
    bookId: 'b1',
    chapterId: 'c1',
    noteId: 'n1',
    direction: 'forward',
    front: 'to give up',
    back: 'rendirse',
    suspended: false,
    createdAt: NOW,
    updatedAt: NOW,
    scheduling: {
      due: NOW,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      ...scheduling,
    },
    ...overrides,
  };
}

describe('cardDocumentSchema', () => {
  it('una tarjeta sin tipo se lee como básica (sin tipo)', () => {
    expect(cardDocumentSchema.parse(document()).cardType).toBeUndefined();
  });

  it('una tarjeta sin bandera de suspensión se lee como activa', () => {
    const withoutSuspended: Record<string, unknown> = document();
    delete withoutSuspended['suspended'];

    expect(cardDocumentSchema.parse(withoutSuspended).suspended).toBe(false);
  });

  it('una tarjeta anterior a los pasos de aprendizaje los lee como 0', () => {
    const legacy = document();
    delete (legacy.scheduling as Record<string, unknown>)['learningSteps'];

    expect(cardDocumentSchema.parse(legacy).scheduling.learningSteps).toBe(0);
  });

  it('conserva los campos futuros que ya existan', () => {
    const parsed = cardDocumentSchema.parse(
      document({ pronunciation: '/ɡɪv ʌp/', tags: ['verbos'] }),
    );

    expect(parsed.pronunciation).toBe('/ɡɪv ʌp/');
    expect(parsed.tags).toEqual(['verbos']);
  });

  it('las fechas se leen como Date', () => {
    expect(cardDocumentSchema.parse(document()).scheduling.due).toBeInstanceOf(Date);
  });

  it('sin anverso o con un estado fuera de 0-3, el documento es inválido', () => {
    const withoutFront: Record<string, unknown> = document();
    delete withoutFront['front'];

    expect(cardDocumentSchema.safeParse(withoutFront).success).toBe(false);
    expect(cardDocumentSchema.safeParse(document({}, { state: 4 })).success).toBe(false);
  });
});
