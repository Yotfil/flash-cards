import { bookFormSchema } from './book-form.schema';

describe('bookFormSchema', () => {
  it('un nombre de solo espacios falla con "El nombre es obligatorio."', () => {
    const result = bookFormSchema.safeParse({ name: '   ', subject: '' });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'El nombre es obligatorio.',
    ]);
  });

  it('un nombre de más de 120 caracteres falla', () => {
    expect(bookFormSchema.safeParse({ name: 'a'.repeat(121), subject: '' }).success).toBe(false);
    expect(bookFormSchema.safeParse({ name: 'a'.repeat(120), subject: '' }).success).toBe(true);
  });

  it('la materia vacía es válida', () => {
    expect(bookFormSchema.safeParse({ name: 'Inglés', subject: '' }).success).toBe(true);
  });

  it('no tiene campo de dirección de estudio', () => {
    expect(Object.keys(bookFormSchema.shape)).toEqual(['name', 'subject']);
  });
});
