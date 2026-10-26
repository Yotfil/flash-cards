import { bookPendingMeta, heroCount, newAvailableLabel, streakLabel } from './hoy.copy';

describe('textos de Hoy', () => {
  it('el bloque principal cuenta las tarjetas con plural real', () => {
    expect(heroCount(21)).toBe('21 tarjetas');
    expect(heroCount(1)).toBe('1 tarjeta');
    expect(heroCount(0)).toBe('0 tarjetas');
  });

  it('la fila de un libro omite la parte que es cero', () => {
    expect(bookPendingMeta(10, 8)).toBe('10 por repasar, 8 nuevas');
    expect(bookPendingMeta(3, 0)).toBe('3 por repasar');
    expect(bookPendingMeta(0, 1)).toBe('1 nueva');
    expect(bookPendingMeta(1, 1)).toBe('1 por repasar, 1 nueva');
  });

  it('la racha no se dice con cero y se corta en 60+', () => {
    expect(streakLabel(0)).toBeNull();
    expect(streakLabel(1)).toBe('1 día');
    expect(streakLabel(6)).toBe('6 días seguidos');
    expect(streakLabel(60)).toBe('60+ días seguidos');
  });

  it('el control de ajuste dice el máximo elegible', () => {
    expect(newAvailableLabel(20)).toBe('de 20');
  });
});
