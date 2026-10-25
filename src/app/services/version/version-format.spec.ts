import { formatBuildDate, formatVersionLine } from './version-format';

describe('formato del pie de versión', () => {
  it('une la versión y el commit en una línea', () => {
    expect(formatVersionLine('0.4.0', '99ed108')).toBe('v0.4.0 · 99ed108');
  });

  it('muestra sin-git cuando el build no tuvo historial', () => {
    expect(formatVersionLine('0.4.0', 'sin-git')).toBe('v0.4.0 · sin-git');
  });

  it('formatea la fecha del build como dd/MM/yyyy HH:mm en la zona del usuario', () => {
    expect(formatBuildDate('2026-07-02T16:47:00Z', 'America/Bogota')).toBe('02/07/2026 11:47');
  });

  it('usa 24 horas y ceros a la izquierda', () => {
    expect(formatBuildDate('2026-01-05T03:04:00Z', 'UTC')).toBe('05/01/2026 03:04');
    expect(formatBuildDate('2026-01-05T23:59:00Z', 'UTC')).toBe('05/01/2026 23:59');
  });

  it('sin zona usa la del dispositivo', () => {
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    expect(formatBuildDate('2026-07-02T16:47:00Z')).toBe(
      formatBuildDate('2026-07-02T16:47:00Z', deviceZone),
    );
  });
});
