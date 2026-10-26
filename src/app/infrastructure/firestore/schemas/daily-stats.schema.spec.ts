import { dailyStatsDocumentSchema } from './daily-stats.schema';

// Los indicadores se escriben con incrementos y `merge`: un documento solo tiene los contadores que
// algún repaso tocó. El esquema rellena con cero lo que falte.
describe('dailyStatsDocumentSchema', () => {
  it('un documento viejo sin repasos por libro se lee con el mapa vacío', () => {
    const parsed = dailyStatsDocumentSchema.parse({
      date: '2026-10-24',
      newCardsIntroduced: { b1: 3 },
      reviewsCompleted: 5,
      ratingCounts: { again: 1, hard: 1, good: 2, easy: 1 },
    });

    expect(parsed.reviewsCompletedByBook).toEqual({});
    expect(parsed.newCardsIntroduced).toEqual({ b1: 3 });
  });

  it('las calificaciones que nunca se dieron cuentan cero', () => {
    const parsed = dailyStatsDocumentSchema.parse({
      date: '2026-10-24',
      reviewsCompleted: 2,
      ratingCounts: { good: 2 },
    });

    expect(parsed.ratingCounts).toEqual({ again: 0, hard: 0, good: 2, easy: 0 });
  });

  it('sin nuevas introducidas ni contadores, todo arranca en cero', () => {
    const parsed = dailyStatsDocumentSchema.parse({ date: '2026-10-24' });

    expect(parsed).toEqual({
      date: '2026-10-24',
      newCardsIntroduced: {},
      reviewsCompleted: 0,
      reviewsCompletedByBook: {},
      ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 },
    });
  });

  it('un documento sin fecha no es válido', () => {
    expect(dailyStatsDocumentSchema.safeParse({ reviewsCompleted: 3 }).success).toBe(false);
  });
});
