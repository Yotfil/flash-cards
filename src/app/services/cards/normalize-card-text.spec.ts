import { normalizeCardText } from './normalize-card-text';

describe('normalizeCardText', () => {
  it('recorta, pasa a minúsculas y colapsa los espacios', () => {
    expect(normalizeCardText('  To   Give  Up ')).toBe('to give up');
  });

  it('los apóstrofos tipográficos cuentan como el recto', () => {
    expect(normalizeCardText('Don’t ‘say’ ʼyes')).toBe("don't 'say' 'yes");
  });

  it('las comillas tipográficas cuentan como las rectas', () => {
    expect(normalizeCardText('“Yes”')).toBe('"yes"');
  });

  it('una tilde escrita aparte es la misma letra con tilde, y la tilde se conserva', () => {
    expect(normalizeCardText('Rendi\u0301')).toBe('rend\u00ed');
    expect(normalizeCardText('rendí')).toBe('rend\u00ed');
  });
});
