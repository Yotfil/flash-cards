import { formatInterval } from './format-interval';

describe('formatInterval', () => {
  it('intervalos cortos (< 1 día) se resumen', () => {
    expect(formatInterval(0)).toBe('<1 día');
    expect(formatInterval(-1)).toBe('<1 día');
  });

  it('días', () => {
    expect(formatInterval(1)).toBe('1 día');
    expect(formatInterval(6)).toBe('6 días');
  });

  it('meses y años', () => {
    expect(formatInterval(30)).toBe('1 mes');
    expect(formatInterval(45)).toBe('2 meses');
    expect(formatInterval(365)).toBe('1 año');
  });
});
