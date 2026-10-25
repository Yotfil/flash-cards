import { cardFormSchema } from './card-form.schema';

const messages = (value: unknown) =>
  cardFormSchema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

describe('cardFormSchema', () => {
  it('básica: recorta anverso, reverso y ejemplo', () => {
    expect(
      cardFormSchema.parse({
        cardType: 'basic',
        front: '  hola ',
        back: ' hello ',
        example: ' Hi! ',
      }),
    ).toEqual({ cardType: 'basic', front: 'hola', back: 'hello', example: 'Hi!' });
  });

  it('básica: anverso y reverso de solo espacios fallan con su mensaje', () => {
    expect(messages({ cardType: 'basic', front: '   ', back: 'x', example: '' })).toEqual([
      'El anverso es obligatorio.',
    ]);
    expect(messages({ cardType: 'basic', front: 'x', back: '   ', example: '' })).toEqual([
      'El reverso es obligatorio.',
    ]);
  });

  it('un texto de más de 2000 caracteres falla', () => {
    expect(
      cardFormSchema.safeParse({
        cardType: 'basic',
        front: 'a'.repeat(2001),
        back: 'b',
        example: '',
      }).success,
    ).toBe(false);
    expect(
      cardFormSchema.safeParse({
        cardType: 'basic',
        front: 'a',
        back: 'b',
        example: 'e'.repeat(2001),
      }).success,
    ).toBe(false);
  });

  it('el ejemplo es opcional', () => {
    expect(
      cardFormSchema.safeParse({ cardType: 'basic', front: 'a', back: 'b', example: '' }).success,
    ).toBe(true);
  });

  it('cloze sin hueco falla con su mensaje; con hueco pasa sin pedir reverso', () => {
    expect(
      messages({ cardType: 'cloze', front: 'El gato es negro', back: '', example: '' }),
    ).toEqual(['Escribe un texto con al menos un hueco marcado con {{…}}.']);
    expect(
      cardFormSchema.safeParse({
        cardType: 'cloze',
        front: 'El {{gato}} es negro',
        back: '',
        example: '',
      }).success,
    ).toBe(true);
  });
});
