import { isWrittenAnswerCorrect, normalizeAnswer } from './written-answer';

describe('normalizeAnswer', () => {
  it('recorta, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeAnswer('  Rendirse   YA ')).toBe('rendirse ya');
  });

  it('conserva los acentos', () => {
    expect(normalizeAnswer('Adiós')).toBe('adiós');
  });
});

describe('isWrittenAnswerCorrect', () => {
  it('acepta la respuesta exacta ignorando mayúsculas y espacios', () => {
    expect(isWrittenAnswerCorrect('  RENDIRSE ', 'rendirse')).toBe(true);
  });

  it('acepta cualquier parte separada por coma', () => {
    expect(isWrittenAnswerCorrect('rendirse', 'rendirse, darse por vencido')).toBe(true);
    expect(isWrittenAnswerCorrect('darse por vencido', 'rendirse, darse por vencido')).toBe(true);
  });

  it('acepta también el reverso completo', () => {
    expect(
      isWrittenAnswerCorrect('rendirse, darse por vencido', 'rendirse, darse por vencido'),
    ).toBe(true);
  });

  it('rechaza una respuesta distinta', () => {
    expect(isWrittenAnswerCorrect('avanzar', 'rendirse')).toBe(false);
  });

  it('una entrada vacía nunca acierta', () => {
    expect(isWrittenAnswerCorrect('   ', 'rendirse')).toBe(false);
  });
});
