import { LISTED_AT_MOST, andMore, limitList } from './limited-list';

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('limitList', () => {
  it('se muestran como mucho 100', () => {
    expect(LISTED_AT_MOST).toBe(100);
  });

  it('una lista corta se muestra entera', () => {
    expect(limitList(numbers(3))).toEqual({ shown: [1, 2, 3], hiddenCount: 0 });
  });

  it('justo 100: todas, sin ocultas', () => {
    const { shown, hiddenCount } = limitList(numbers(100));

    expect(shown).toHaveLength(100);
    expect(hiddenCount).toBe(0);
  });

  it('101: las 100 primeras y 1 oculta', () => {
    const { shown, hiddenCount } = limitList(numbers(101));

    expect(shown.at(-1)).toBe(100);
    expect(hiddenCount).toBe(1);
  });

  it('20000: las 100 primeras y 19900 ocultas', () => {
    const { shown, hiddenCount } = limitList(numbers(20000));

    expect(shown).toEqual(numbers(100));
    expect(hiddenCount).toBe(19900);
  });

  it('otro tope', () => {
    expect(limitList(numbers(5), 2)).toEqual({ shown: [1, 2], hiddenCount: 3 });
  });
});

describe('andMore', () => {
  it('"y N más"', () => {
    expect(andMore(19900)).toBe('y 19900 más');
    expect(andMore(1)).toBe('y 1 más');
  });
});
