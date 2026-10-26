import { chapterFormSchema } from './chapter-form.schema';

describe('chapterFormSchema', () => {
  it('un nombre de solo espacios falla con "El nombre es obligatorio."', () => {
    const result = chapterFormSchema.safeParse({ name: '   ' });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'El nombre es obligatorio.',
    ]);
  });

  it('un nombre de 121 caracteres falla', () => {
    expect(chapterFormSchema.safeParse({ name: 'a'.repeat(121) }).success).toBe(false);
  });

  it('recorta los espacios alrededor', () => {
    expect(chapterFormSchema.parse({ name: '  Phrasal verbs  ' }).name).toBe('Phrasal verbs');
  });
});
