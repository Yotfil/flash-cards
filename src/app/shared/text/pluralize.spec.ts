import { pluralize } from './pluralize';

describe('pluralize', () => {
  it.each([
    [0, '0 tarjetas'],
    [1, '1 tarjeta'],
    [12, '12 tarjetas'],
  ])('%s → %s', (count, expected) => {
    expect(pluralize(count, 'tarjeta', 'tarjetas')).toBe(expected);
  });
});
