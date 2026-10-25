import { splitBasicCard, splitExample } from './split-card-line';

describe('splitExample', () => {
  it('el primer " :: " con espacios separa el ejemplo', () => {
    expect(splitExample('to give up | rendirse :: I gave up smoking last year')).toEqual({
      body: 'to give up | rendirse',
      example: 'I gave up smoking last year',
    });
    expect(splitExample('She {{has lived}} here for 5 years :: present perfect')).toEqual({
      body: 'She {{has lived}} here for 5 years',
      example: 'present perfect',
    });
  });

  it('"::" pegado a texto es contenido', () => {
    expect(splitExample('std::vector | vector dinámico')).toEqual({
      body: 'std::vector | vector dinámico',
    });
  });

  it('solo cuenta el primero; los siguientes son parte del ejemplo', () => {
    expect(splitExample('a | b :: primero :: segundo')).toEqual({
      body: 'a | b',
      example: 'primero :: segundo',
    });
  });

  it('un ejemplo vacío se omite', () => {
    expect(splitExample('a | b ::')).toEqual({ body: 'a | b' });
  });
});

describe('splitBasicCard', () => {
  it('parte por el pipe y recorta', () => {
    expect(splitBasicCard('   to give up   |   rendirse   ')).toEqual({
      front: 'to give up',
      back: 'rendirse',
    });
  });

  it('sin pipe, parte por el tabulador', () => {
    expect(splitBasicCard('hola\tworld')).toEqual({ front: 'hola', back: 'world' });
  });

  it('el pipe tiene prioridad sobre el tabulador', () => {
    expect(splitBasicCard('a\tb | c')).toEqual({ front: 'a\tb', back: 'c' });
  });

  it('solo el primer separador cuenta', () => {
    expect(splitBasicCard('to look forward to | esperar con ansias | tener ganas de')).toEqual({
      front: 'to look forward to',
      back: 'esperar con ansias | tener ganas de',
    });
  });

  it('sin separador no hay tarjeta', () => {
    expect(splitBasicCard('línea mala sin separador')).toBeNull();
  });
});
