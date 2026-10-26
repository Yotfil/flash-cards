import { CLOZE_BLANK, clozeQuestion, clozeSegments, hasCloze } from './parse-cloze';

describe('cloze', () => {
  it('un hueco válido cuenta como cloze', () => {
    expect(hasCloze('El {{gato}} es negro')).toBe(true);
  });

  it('sin marcadores no es cloze', () => {
    expect(hasCloze('El gato es negro')).toBe(false);
  });

  it.each(['El {{}} es negro', 'El {{   }} es negro'])(
    'un marcador vacío no cuenta: %s',
    (text) => {
      expect(hasCloze(text)).toBe(false);
      expect(clozeSegments(text)).toEqual([{ kind: 'text', text }]);
    },
  );

  it('varios huecos cuentan como cloze con dos huecos', () => {
    const hidden = clozeSegments('El {{gato}} es {{negro}}').filter(
      (segment) => segment.kind === 'hidden',
    );

    expect(hasCloze('El {{gato}} es {{negro}}')).toBe(true);
    expect(hidden).toHaveLength(2);
  });

  it('los segmentos recortan el contenido del hueco y conservan los literales', () => {
    expect(clozeSegments('El {{ gato }} es {{negro}}')).toEqual([
      { kind: 'text', text: 'El ' },
      { kind: 'hidden', text: 'gato' },
      { kind: 'text', text: ' es ' },
      { kind: 'hidden', text: 'negro' },
    ]);
  });

  it('un texto sin huecos es un único literal', () => {
    expect(clozeSegments('hola mundo')).toEqual([{ kind: 'text', text: 'hola mundo' }]);
  });

  it('un hueco al inicio no deja un literal vacío delante', () => {
    expect(clozeSegments('{{Hola}} mundo')).toEqual([
      { kind: 'hidden', text: 'Hola' },
      { kind: 'text', text: ' mundo' },
    ]);
  });

  it('la pregunta compacta sustituye cada hueco por el marcador', () => {
    expect(CLOZE_BLANK).toBe('[…]');
    expect(clozeQuestion('El {{gato}} es {{negro}}')).toBe('El […] es […]');
  });
});
