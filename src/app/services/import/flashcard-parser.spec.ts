import { parseFlashcards } from './flashcard-parser';

describe('parseFlashcards', () => {
  it('procesa el ejemplo completo de la spec (§5.6): 2 capítulos, 4 tarjetas, 0 errores', () => {
    const text = [
      '# Movement & Direction',
      'to give up | rendirse, darse por vencido',
      'to look forward to | esperar con ansias',
      '',
      '# Present Perfect',
      'I have lived here for 5 years | He vivido aquí por 5 años',
      'She has just left | Ella acaba de irse',
    ].join('\n');

    const result = parseFlashcards(text, 'Phrasal Verbs');

    expect(result.errors).toEqual([]);
    expect(result.validCardCount).toBe(4);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toEqual({
      name: 'Movement & Direction',
      cards: [
        { cardType: 'basic', front: 'to give up', back: 'rendirse, darse por vencido' },
        { cardType: 'basic', front: 'to look forward to', back: 'esperar con ansias' },
      ],
    });
    expect(result.chapters[1]?.name).toBe('Present Perfect');
  });

  it('un archivo sin ningún # va a un capítulo por defecto con el nombre dado', () => {
    const result = parseFlashcards('a | b\nc | d', 'Mi libro');

    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.name).toBe('Mi libro');
    expect(result.validCardCount).toBe(2);
  });

  it('agrupa las tarjetas anteriores al primer # en el capítulo por defecto', () => {
    const text = ['suelta | tarjeta', '# Capítulo 1', 'dentro | del capítulo'].join('\n');

    const result = parseFlashcards(text, 'Defecto');

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toEqual({
      name: 'Defecto',
      cards: [{ cardType: 'basic', front: 'suelta', back: 'tarjeta' }],
    });
    expect(result.chapters[1]?.name).toBe('Capítulo 1');
  });

  it('no crea el capítulo por defecto si el texto arranca con #', () => {
    const result = parseFlashcards('# Solo este\nx | y', 'Defecto');

    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.name).toBe('Solo este');
  });

  it('acepta el tabulador como separador cuando no hay pipe (pegado desde Excel/Sheets)', () => {
    const result = parseFlashcards('hola\tworld', 'L');

    expect(result.errors).toEqual([]);
    expect(result.chapters[0]?.cards[0]).toEqual({
      cardType: 'basic',
      front: 'hola',
      back: 'world',
    });
  });

  it('parte sólo en el primer separador: el reverso conserva pipes posteriores (§5.3)', () => {
    const result = parseFlashcards('to look forward to | esperar con ansias | tener ganas de', 'L');

    expect(result.chapters[0]?.cards[0]).toEqual({
      cardType: 'basic',
      front: 'to look forward to',
      back: 'esperar con ansias | tener ganas de',
    });
  });

  it('recorta espacios alrededor del anverso y del reverso', () => {
    const result = parseFlashcards('   to give up   |   rendirse   ', 'L');

    expect(result.chapters[0]?.cards[0]).toEqual({
      cardType: 'basic',
      front: 'to give up',
      back: 'rendirse',
    });
  });

  it('reporta líneas sin separador con su número (1-based) y sigue procesando', () => {
    const text = ['buena | tarjeta', 'línea mala sin separador', 'otra | buena'].join('\n');

    const result = parseFlashcards(text, 'L');

    expect(result.validCardCount).toBe(2);
    expect(result.errors).toEqual([{ line: 2, reason: 'Línea sin separador ("|" o tabulador).' }]);
  });

  it('una línea con {{...}} es una tarjeta cloze (sin separador, reverso vacío)', () => {
    const result = parseFlashcards('El {{gato}} es {{negro}}', 'L');

    expect(result.errors).toEqual([]);
    expect(result.chapters[0]?.cards[0]).toEqual({
      cardType: 'cloze',
      front: 'El {{gato}} es {{negro}}',
      back: '',
    });
  });

  it('reporta anverso o reverso vacío como inválido', () => {
    const text = ['to give up |', '| rendirse', 'ok | bien'].join('\n');

    const result = parseFlashcards(text, 'L');

    expect(result.validCardCount).toBe(1);
    expect(result.errors).toEqual([
      { line: 1, reason: 'Anverso o reverso vacío.' },
      { line: 2, reason: 'Anverso o reverso vacío.' },
    ]);
  });

  it('reporta un # sin nombre y no abre capítulo', () => {
    const text = ['#', '#   ', 'a | b'].join('\n');

    const result = parseFlashcards(text, 'Defecto');

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toEqual({ line: 1, reason: 'Encabezado de capítulo sin nombre.' });
    // La tarjeta cae en el capítulo por defecto, no en uno abierto por el "#".
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.name).toBe('Defecto');
  });

  it('ignora líneas en blanco y de solo espacios sin generar error', () => {
    const result = parseFlashcards('a | b\n\n   \nc | d', 'L');

    expect(result.errors).toEqual([]);
    expect(result.validCardCount).toBe(2);
  });

  it('un texto vacío no produce capítulos ni errores', () => {
    const result = parseFlashcards('', 'L');

    expect(result).toEqual({ chapters: [], errors: [], validCardCount: 0 });
  });

  it('maneja saltos de línea CRLF (archivos de Windows)', () => {
    const result = parseFlashcards('a | b\r\nc | d', 'L');

    expect(result.validCardCount).toBe(2);
    expect(result.errors).toEqual([]);
  });
});
