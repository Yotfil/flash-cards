import {
  REASON_CLOZE_WITH_SEPARATOR,
  REASON_EMPTY_CHAPTER_NAME,
  REASON_EMPTY_SIDE,
  REASON_NO_SEPARATOR,
  tooLongReason,
} from './import-reasons';

describe('motivos de las líneas omitidas', () => {
  it('los textos fijos de la spec', () => {
    expect(REASON_NO_SEPARATOR).toBe('Línea sin separador ("|" o tabulador).');
    expect(REASON_EMPTY_SIDE).toBe('Anverso o reverso vacío.');
    expect(REASON_EMPTY_CHAPTER_NAME).toBe('Encabezado de capítulo sin nombre.');
    expect(REASON_CLOZE_WITH_SEPARATOR).toBe('Una línea con huecos {{…}} no lleva separador.');
  });

  it('el de longitud nombra la parte y su máximo', () => {
    expect(tooLongReason('anverso', 2000)).toBe('El anverso supera los 2000 caracteres.');
    expect(tooLongReason('ejemplo', 2000)).toBe('El ejemplo supera los 2000 caracteres.');
    expect(tooLongReason('nombre del capítulo', 120)).toBe(
      'El nombre del capítulo supera los 120 caracteres.',
    );
  });
});
