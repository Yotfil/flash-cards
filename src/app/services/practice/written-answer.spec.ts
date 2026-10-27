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

  it('el apóstrofo tipográfico y el recto son lo mismo, en los dos sentidos', () => {
    expect(isWrittenAnswerCorrect("don't", 'don’t')).toBe(true);
    expect(isWrittenAnswerCorrect('don’t', "don't")).toBe(true);
  });

  it('una tilde escrita aparte cuenta igual que la letra con tilde', () => {
    expect(isWrittenAnswerCorrect('rendí', 'rendi\u0301')).toBe(true);
  });

  it('un separador con un dígito a cada lado no parte la respuesta', () => {
    expect(isWrittenAnswerCorrect('3', '3,14')).toBe(false);
    expect(isWrittenAnswerCorrect('3,14', '3,14')).toBe(true);
    expect(isWrittenAnswerCorrect('25', '25/12')).toBe(false);
    expect(isWrittenAnswerCorrect('1', '1/2')).toBe(false);
  });

  it('entre letras la barra sigue separando', () => {
    expect(isWrittenAnswerCorrect('m', 'm/s')).toBe(true);
    expect(isWrittenAnswerCorrect('m/s', 'm/s')).toBe(true);
  });

  it('una respuesta distinta no vale', () => {
    expect(isWrittenAnswerCorrect('avanzar', 'rendirse')).toBe(false);
  });

  it('una entrada vacía nunca acierta, ni contra un reverso con separadores', () => {
    expect(isWrittenAnswerCorrect('   ', 'rendirse')).toBe(false);
    expect(isWrittenAnswerCorrect('', 'a, , b')).toBe(false);
  });
});
