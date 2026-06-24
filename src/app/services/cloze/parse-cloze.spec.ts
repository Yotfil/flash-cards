import { CLOZE_BLANK, clozeQuestion, clozeSegments, hasCloze } from './parse-cloze';

describe('hasCloze', () => {
  it('detecta un hueco válido', () => {
    expect(hasCloze('El {{gato}} es negro')).toBe(true);
  });

  it('es falso sin marcadores', () => {
    expect(hasCloze('El gato es negro')).toBe(false);
  });

  it('un marcador vacío no cuenta como hueco', () => {
    expect(hasCloze('El {{}} es negro')).toBe(false);
    expect(hasCloze('El {{   }} es negro')).toBe(false);
  });

  it('detecta varios huecos', () => {
    expect(hasCloze('El {{gato}} es {{negro}}')).toBe(true);
  });
});

describe('clozeSegments', () => {
  it('separa literales y huecos, recortando el contenido', () => {
    expect(clozeSegments('El {{ gato }} es {{negro}}')).toEqual([
      { text: 'El ', cloze: false },
      { text: 'gato', cloze: true },
      { text: ' es ', cloze: false },
      { text: 'negro', cloze: true },
    ]);
  });

  it('texto sin huecos es un único literal', () => {
    expect(clozeSegments('hola mundo')).toEqual([{ text: 'hola mundo', cloze: false }]);
  });

  it('un hueco al inicio no genera literal vacío delante', () => {
    expect(clozeSegments('{{Hola}} mundo')).toEqual([
      { text: 'Hola', cloze: true },
      { text: ' mundo', cloze: false },
    ]);
  });
});

describe('clozeQuestion', () => {
  it('reemplaza cada hueco por el marcador de blanco', () => {
    expect(clozeQuestion('El {{gato}} es {{negro}}')).toBe(`El ${CLOZE_BLANK} es ${CLOZE_BLANK}`);
  });
});
