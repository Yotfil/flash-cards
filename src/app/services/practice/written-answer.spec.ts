import { isWrittenAnswerCorrect } from './written-answer';

describe('isWrittenAnswerCorrect', () => {
  it('mayúsculas y espacios no importan', () => {
    expect(isWrittenAnswerCorrect('  RENDIRSE ', 'rendirse')).toBe(true);
  });

  it('cualquier fragmento del reverso vale', () => {
    expect(isWrittenAnswerCorrect('darse por vencido', 'rendirse, darse por vencido')).toBe(true);
    expect(isWrittenAnswerCorrect('casa', 'hogar; casa')).toBe(true);
    expect(isWrittenAnswerCorrect('vivienda', 'casa / vivienda')).toBe(true);
  });

  it('el reverso completo también vale', () => {
    expect(
      isWrittenAnswerCorrect('rendirse, darse por vencido', 'rendirse, darse por vencido'),
    ).toBe(true);
  });

  it('los acentos sí importan', () => {
    expect(isWrittenAnswerCorrect('rendi', 'rendí')).toBe(false);
  });

  it('una respuesta distinta no vale', () => {
    expect(isWrittenAnswerCorrect('avanzar', 'rendirse')).toBe(false);
  });

  it('una entrada vacía nunca acierta, ni contra un reverso con separadores', () => {
    expect(isWrittenAnswerCorrect('   ', 'rendirse')).toBe(false);
    expect(isWrittenAnswerCorrect('', 'a, , b')).toBe(false);
  });
});
