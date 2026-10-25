import type { BookPackage } from '@domain/models/book-package';

import { serializeBookPackage } from './serialize-book-package';

const pkg = (chapters: BookPackage['chapters']): BookPackage => ({
  name: 'Phrasal Verbs',
  subject: 'general',
  chapters,
});

describe('serializeBookPackage', () => {
  it('el libro de la spec, línea a línea, con línea en blanco entre capítulos y LF final', () => {
    const text = serializeBookPackage(
      pkg([
        {
          name: 'Movement',
          cards: [
            {
              cardType: 'basic',
              front: 'to give up',
              back: 'rendirse',
              example: 'I gave up smoking',
            },
            { cardType: 'basic', front: 'to look after', back: 'cuidar' },
          ],
        },
        {
          name: 'Grammar',
          cards: [{ cardType: 'cloze', front: 'She {{has lived}} here for 5 years', back: '' }],
        },
      ]),
    );

    expect(text).toBe(
      [
        '# Movement',
        'to give up | rendirse :: I gave up smoking',
        'to look after | cuidar',
        '',
        '# Grammar',
        'She {{has lived}} here for 5 years',
        '',
      ].join('\n'),
    );
  });

  it('todo capítulo lleva su encabezado, también el vacío', () => {
    const text = serializeBookPackage(
      pkg([
        { name: 'Básicos', cards: [{ cardType: 'basic', front: 'a', back: 'b' }] },
        { name: 'Pendiente', cards: [] },
      ]),
    );

    expect(text).toBe('# Básicos\na | b\n\n# Pendiente\n');
  });

  it('sin capítulos, el texto está vacío', () => {
    expect(serializeBookPackage(pkg([]))).toBe('');
  });

  it('un salto de línea dentro de un campo se vuelve un espacio; los campos se recortan', () => {
    const text = serializeBookPackage(
      pkg([
        {
          name: ' Uno\ny dos ',
          cards: [
            { cardType: 'basic', front: ' to give up ', back: 'rendirse\ndarse por vencido' },
            { cardType: 'basic', front: 'a', back: 'b', example: '   ' },
          ],
        },
      ]),
    );

    expect(text).toBe('# Uno y dos\nto give up | rendirse darse por vencido\na | b\n');
  });

  it('sin escapes: un pipe en el anverso se escribe tal cual', () => {
    expect(
      serializeBookPackage(
        pkg([{ name: 'X', cards: [{ cardType: 'basic', front: 'a | b', back: 'c' }] }]),
      ),
    ).toBe('# X\na | b | c\n');
  });
});
