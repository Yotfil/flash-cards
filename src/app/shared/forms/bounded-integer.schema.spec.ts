import { boundedInteger } from './bounded-integer.schema';

const MESSAGE = 'Escribe un número entre 0 y 999.';

describe('boundedInteger', () => {
  const schema = boundedInteger(0, 999, MESSAGE);

  it.each([0, 999, 20])('acepta %s', (value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each([1000, 2.5, -1, Number.NaN])('rechaza %s con el mismo mensaje', (value) => {
    const result = schema.safeParse(value);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([MESSAGE]);
  });
});
