import { ACCESS_LOST_COPY } from './access-lost.copy';

describe('textos de acceso retirado', () => {
  it('son los de la spec', () => {
    expect(ACCESS_LOST_COPY).toEqual({
      title: 'Ya no tienes acceso',
      message: 'Lo que calificaste antes quedó guardado.',
      continue: 'Continuar',
    });
  });
});
