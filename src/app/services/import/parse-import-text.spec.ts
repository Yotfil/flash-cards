import { parseImportText } from './parse-import-text';

const lines = (...text: string[]) => text.join('\n');
const chapterNames = (text: string, fallback = 'Mi libro') =>
  parseImportText(text, fallback).package.chapters.map((chapter) => chapter.name);

describe('parseImportText · líneas y encabezados', () => {
  it('ignora líneas en blanco o de solo espacios y entiende saltos de Windows', () => {
    const result = parseImportText('a | b\r\n   \r\n\r\nc | d', 'Mi libro');

    expect(result.validCardCount).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it('un texto vacío no produce nada', () => {
    expect(parseImportText('', 'Mi libro')).toEqual({
      package: { chapters: [] },
      errors: [],
      validCardCount: 0,
      chapterCount: 0,
    });
  });

  it('no hay comentarios: "// nota" es una línea sin separador', () => {
    expect(parseImportText('// nota', 'Mi libro').errors).toEqual([
      { line: 1, reason: 'Línea sin separador ("|" o tabulador).' },
    ]);
  });

  it('el ejemplo completo de la convención: 2 capítulos, 4 tarjetas, 0 errores', () => {
    const result = parseImportText(
      lines(
        '# Movement & Direction',
        'to give up | rendirse',
        'to look up | buscar',
        '',
        '# Present Perfect',
        'I have eaten | he comido',
        'She has gone | ella se ha ido',
      ),
      'Mi libro',
    );

    expect(result.package.chapters.map((chapter) => [chapter.name, chapter.cards.length])).toEqual([
      ['Movement & Direction', 2],
      ['Present Perfect', 2],
    ]);
    expect(result.validCardCount).toBe(4);
    expect(result.chapterCount).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.package.chapters[0]?.cards[0]).toEqual({
      cardType: 'basic',
      front: 'to give up',
      back: 'rendirse',
    });
  });

  it('un encabezado sin nombre se reporta y la tarjeta cae en el capítulo por defecto', () => {
    const result = parseImportText(lines('#', '#   ', 'a | b'), 'Defecto');

    expect(result.errors).toEqual([
      { line: 1, reason: 'Encabezado de capítulo sin nombre.' },
      { line: 2, reason: 'Encabezado de capítulo sin nombre.' },
    ]);
    expect(chapterNames(lines('#', '#   ', 'a | b'), 'Defecto')).toEqual(['Defecto']);
  });

  it('un encabezado sin tarjetas es un capítulo vacío', () => {
    const result = parseImportText(lines('# A', 'x | y', '# B'), 'Mi libro');

    expect(result.package.chapters).toEqual([
      { name: 'A', cards: [{ cardType: 'basic', front: 'x', back: 'y' }] },
      { name: 'B', cards: [] },
    ]);
    expect(result.chapterCount).toBe(2);
  });

  it('un encabezado de más de 120 caracteres se reporta y no abre capítulo', () => {
    const result = parseImportText(lines(`# ${'x'.repeat(121)}`, 'a | b'), 'Defecto');

    expect(result.errors).toEqual([
      { line: 1, reason: 'El nombre del capítulo supera los 120 caracteres.' },
    ]);
    expect(result.package.chapters.map((chapter) => chapter.name)).toEqual(['Defecto']);
  });

  it('sin encabezados todo va al capítulo por defecto; si arranca con "#", no hay por defecto', () => {
    expect(chapterNames(lines('a | b', 'c | d'))).toEqual(['Mi libro']);
    expect(chapterNames(lines('a | b', '# Uno', 'c | d'), 'Defecto')).toEqual(['Defecto', 'Uno']);
    expect(chapterNames(lines('# Uno', 'a | b'))).toEqual(['Uno']);
  });
});

describe('parseImportText · tarjetas, cloze y ejemplo', () => {
  const cards = (text: string) =>
    parseImportText(text, 'Mi libro').package.chapters.flatMap((chapter) => chapter.cards);

  it('un lado vacío se reporta en su línea', () => {
    const result = parseImportText(lines('to give up |', '| rendirse', 'ok | bien'), 'Mi libro');

    expect(result.validCardCount).toBe(1);
    expect(result.errors).toEqual([
      { line: 1, reason: 'Anverso o reverso vacío.' },
      { line: 2, reason: 'Anverso o reverso vacío.' },
    ]);
  });

  it('una línea sin separador se reporta y las demás entran', () => {
    const result = parseImportText(
      lines('buena | tarjeta', 'línea mala sin separador', 'otra | buena'),
      'Mi libro',
    );

    expect(result.validCardCount).toBe(2);
    expect(result.errors).toEqual([{ line: 2, reason: 'Línea sin separador ("|" o tabulador).' }]);
  });

  it('una línea con huecos es una cloze, sin reverso', () => {
    expect(cards('El {{gato}} es {{negro}}')).toEqual([
      { cardType: 'cloze', front: 'El {{gato}} es {{negro}}', back: '' },
    ]);
  });

  it('un marcador vacío no hace cloze', () => {
    expect(parseImportText('El {{}} es negro', 'Mi libro').errors).toEqual([
      { line: 1, reason: 'Línea sin separador ("|" o tabulador).' },
    ]);
  });

  it('una cloze con separador se omite, sin adivinar', () => {
    const result = parseImportText(lines('I {{gave up}} | rendirse', 'ok | bien'), 'Mi libro');

    expect(result.validCardCount).toBe(1);
    expect(result.errors).toEqual([
      { line: 1, reason: 'Una línea con huecos {{…}} no lleva separador.' },
    ]);
  });

  it('el ejemplo acompaña a la básica y a la cloze', () => {
    expect(
      cards(
        lines(
          'to give up | rendirse :: I gave up smoking last year',
          'She {{has lived}} here for 5 years :: present perfect',
          'std::vector | vector dinámico',
        ),
      ),
    ).toEqual([
      {
        cardType: 'basic',
        front: 'to give up',
        back: 'rendirse',
        example: 'I gave up smoking last year',
      },
      {
        cardType: 'cloze',
        front: 'She {{has lived}} here for 5 years',
        back: '',
        example: 'present perfect',
      },
      { cardType: 'basic', front: 'std::vector', back: 'vector dinámico' },
    ]);
  });

  it('mezcla de válidas e inválidas, con las líneas exactas (las en blanco cuentan)', () => {
    const result = parseImportText(
      lines('a | b', '', 'sin separador', 'c | d', '| vacío', 'e | f'),
      'Mi libro',
    );

    expect(result.validCardCount).toBe(3);
    expect(result.errors).toEqual([
      { line: 3, reason: 'Línea sin separador ("|" o tabulador).' },
      { line: 5, reason: 'Anverso o reverso vacío.' },
    ]);
  });
});

describe('parseImportText · validez de los formularios', () => {
  const long = 'x'.repeat(2001);
  const reason = (text: string) => parseImportText(text, 'Mi libro').errors[0]?.reason;

  it('anverso, reverso y ejemplo respetan los 2000 caracteres del formulario', () => {
    expect(reason(`${long} | b`)).toBe('El anverso supera los 2000 caracteres.');
    expect(reason(`a | ${long}`)).toBe('El reverso supera los 2000 caracteres.');
    expect(reason(`a | b :: ${long}`)).toBe('El ejemplo supera los 2000 caracteres.');
  });

  it('una cloze demasiado larga se reporta por su anverso', () => {
    expect(reason(`{{hueco}} ${long}`)).toBe('El anverso supera los 2000 caracteres.');
  });

  it('justo en el límite entra', () => {
    expect(parseImportText(`${'x'.repeat(2000)} | b`, 'Mi libro').validCardCount).toBe(1);
  });
});
