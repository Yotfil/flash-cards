import { normalizeCardText } from './normalize-card-text';

describe('normalizeCardText', () => {
  it('recorta, pasa a minúsculas y colapsa los espacios', () => {
    expect(normalizeCardText('  To   Give  Up ')).toBe('to give up');
  });
});
