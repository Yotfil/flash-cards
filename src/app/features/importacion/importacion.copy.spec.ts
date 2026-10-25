import {
  countsLine,
  importLabel,
  omittedHeading,
  omittedLine,
  replaceWarning,
} from './importacion.copy';

describe('textos de la importación', () => {
  it('la línea de conteos, con plural real y las repetidas solo si hay', () => {
    expect(countsLine({ chapters: 2, cards: 4, repeated: 1 }, true)).toBe(
      '2 capítulos · 4 tarjetas · 1 repetida',
    );
    expect(countsLine({ chapters: 1, cards: 1, repeated: 0 }, true)).toBe('1 capítulo · 1 tarjeta');
    expect(countsLine({ chapters: 1, cards: 4, repeated: 3 }, false)).toBe(
      '4 tarjetas · 3 repetidas',
    );
  });

  it('las líneas omitidas', () => {
    expect(omittedHeading(1)).toBe('1 línea se omitirá:');
    expect(omittedHeading(2)).toBe('2 líneas se omitirán:');
    expect(omittedLine(3, 'Anverso o reverso vacío.')).toBe('Línea 3: Anverso o reverso vacío.');
  });

  it('el botón dice cuántas importa', () => {
    expect(importLabel(4)).toBe('Importar 4');
  });

  it('el aviso de reemplazo, en singular y en plural, con el progreso y "Editar"', () => {
    expect(replaceWarning(1).startsWith('Se borrará la tarjeta actual del capítulo')).toBe(true);
    const many = replaceWarning(5);
    expect(many).toContain('las 5 tarjetas actuales');
    expect(many).toContain('progreso');
    expect(many).toContain('«Editar»');
  });
});
