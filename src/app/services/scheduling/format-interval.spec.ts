import { formatInterval } from './format-interval';

const T0 = new Date('2026-10-23T10:00:00Z');
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const after = (ms: number) => new Date(T0.getTime() + ms);

describe('formatInterval', () => {
  it.each([
    [MINUTE_MS, '1 min'],
    [5.5 * MINUTE_MS, '6 min'],
    [10 * MINUTE_MS, '10 min'],
  ])('minutos: %d ms → "%s"', (ms, expected) => {
    expect(formatInterval(after(ms), T0)).toBe(expected);
  });

  it.each([
    [90 * MINUTE_MS, '2 h'],
    [5 * HOUR_MS, '5 h'],
  ])('horas: %d ms → "%s"', (ms, expected) => {
    expect(formatInterval(after(ms), T0)).toBe(expected);
  });

  it.each([0, -MINUTE_MS])('un vencimiento ya alcanzado (%d ms) es "ahora"', (ms) => {
    expect(formatInterval(after(ms), T0)).toBe('ahora');
  });

  it.each([
    [DAY_MS, '1 día'],
    [DAY_MS + 23 * HOUR_MS, '1 día'],
    [6 * DAY_MS, '6 días'],
  ])('días completos: %d ms → "%s"', (ms, expected) => {
    expect(formatInterval(after(ms), T0)).toBe(expected);
  });

  it.each([
    [30 * DAY_MS, '1 mes'],
    [45 * DAY_MS, '2 meses'],
  ])('meses: %d ms → "%s"', (ms, expected) => {
    expect(formatInterval(after(ms), T0)).toBe(expected);
  });

  it('años: 365 días → "1 año"', () => {
    expect(formatInterval(after(365 * DAY_MS), T0)).toBe('1 año');
  });
});
