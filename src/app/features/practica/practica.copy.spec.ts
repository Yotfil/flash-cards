import {
  PRACTICA_COPY,
  backLabel,
  positionLabel,
  scoreLabel,
  wrongAnswerLabel,
} from './practica.copy';

describe('textos de la práctica', () => {
  it('posición, puntaje y respuesta correcta', () => {
    expect(positionLabel(4, 10)).toBe('4 / 10');
    expect(scoreLabel(7, 10)).toBe('Acertaste 7 de 10.');
    expect(scoreLabel(1, 2)).toBe('Acertaste 1 de 2.');
    expect(wrongAnswerLabel('rendirse')).toBe('La respuesta era «rendirse».');
  });

  it('volver según el origen', () => {
    expect(backLabel('chapter')).toBe('Volver al capítulo');
    expect(backLabel('book')).toBe('Volver al libro');
  });

  it('los textos son los de la spec', () => {
    expect(PRACTICA_COPY.practice).toBe('Practicar');
    expect(PRACTICA_COPY.correct).toBe('¡Correcto!');
    expect(PRACTICA_COPY.check).toBe('Comprobar');
    expect(PRACTICA_COPY.next).toBe('Siguiente');
    expect(PRACTICA_COPY.seeResult).toBe('Ver resultado');
    expect(PRACTICA_COPY.completedTitle).toBe('¡Práctica completada!');
    expect(PRACTICA_COPY.nothingToPractice).toBe('Nada que practicar aún.');
    expect(PRACTICA_COPY.prepareError).toBe('No se pudo preparar la práctica. Inténtalo de nuevo.');
  });
});
