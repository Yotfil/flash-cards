import { settingsFormSchema } from './settings-form.schema';

describe('settingsFormSchema', () => {
  it('acepta un número entero entre 0 y 999', () => {
    expect(settingsFormSchema.safeParse({ defaultNewCardsPerDay: 5 }).success).toBe(true);
  });

  it('rechaza valores fuera de rango o con decimales con el mensaje de la spec', () => {
    for (const value of [1000, 2.5, -1]) {
      const result = settingsFormSchema.safeParse({ defaultNewCardsPerDay: value });
      expect(result.error?.issues[0]?.message).toBe('Escribe un número entre 0 y 999.');
    }
  });
});
