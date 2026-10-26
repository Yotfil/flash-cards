import { bookSettingsFormSchema } from './book-settings-form.schema';

describe('bookSettingsFormSchema', () => {
  it('acepta los topes en rango, incluido 0', () => {
    expect(
      bookSettingsFormSchema.safeParse({ newCardsPerDay: 0, maxReviewsPerDay: 0 }).success,
    ).toBe(true);
    expect(
      bookSettingsFormSchema.safeParse({ newCardsPerDay: 999, maxReviewsPerDay: 9999 }).success,
    ).toBe(true);
  });

  it('nuevas por día fuera de 0-999 o con decimales usa su texto', () => {
    for (const value of [-1, 2.5, 1000]) {
      const result = bookSettingsFormSchema.safeParse({
        newCardsPerDay: value,
        maxReviewsPerDay: 150,
      });
      expect(result.error?.issues[0]?.message).toBe('Escribe un número entero entre 0 y 999.');
    }
  });

  it('máximo de repasos fuera de 0-9999 usa su texto', () => {
    const result = bookSettingsFormSchema.safeParse({ newCardsPerDay: 5, maxReviewsPerDay: 10000 });

    expect(result.error?.issues[0]?.message).toBe('Escribe un número entero entre 0 y 9999.');
  });
});
