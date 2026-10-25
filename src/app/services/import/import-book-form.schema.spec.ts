import { importBookFormSchema } from './import-book-form.schema';

describe('importBookFormSchema', () => {
  it('el nombre puede quedar vacío (será "Libro importado") pero no pasar de 120', () => {
    expect(importBookFormSchema.safeParse({ name: '', subject: '' }).success).toBe(true);
    expect(importBookFormSchema.safeParse({ name: '   ', subject: '' }).success).toBe(true);
    expect(importBookFormSchema.safeParse({ name: 'x'.repeat(121), subject: '' }).success).toBe(
      false,
    );
  });

  it('la materia sigue las reglas de "Nuevo libro": libre y opcional', () => {
    expect(importBookFormSchema.safeParse({ name: 'Inglés', subject: '   ' }).success).toBe(true);
    expect(
      importBookFormSchema.safeParse({ name: 'Inglés', subject: 'x'.repeat(500) }).success,
    ).toBe(true);
  });

  it('el mensaje de un nombre demasiado largo es el del formulario de libro', () => {
    const result = importBookFormSchema.safeParse({ name: 'x'.repeat(121), subject: '' });

    expect(result.error?.issues[0]?.message).toBe('Usa como máximo 120 caracteres.');
  });
});
