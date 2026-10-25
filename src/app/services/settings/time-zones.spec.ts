import { deviceTimeZone, supportedTimeZones } from './time-zones';

describe('zonas horarias', () => {
  it('la zona del dispositivo es una cadena no vacía', () => {
    expect(deviceTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });

  it('la lista trae las zonas IANA, la del dispositivo y la guardada aunque no la conozca', () => {
    const zones = supportedTimeZones('Zona/Inventada');

    expect(zones).toContain('Europe/Madrid');
    expect(zones).toContain(deviceTimeZone());
    expect(zones).toContain('Zona/Inventada');
    expect(new Set(zones).size).toBe(zones.length);
  });

  it('sin el soporte del navegador sigue ofreciendo la del dispositivo y la guardada', () => {
    const original = Intl.supportedValuesOf;
    Object.defineProperty(Intl, 'supportedValuesOf', { value: undefined, configurable: true });
    try {
      expect(supportedTimeZones('America/Bogota')).toEqual(
        [...new Set([deviceTimeZone(), 'America/Bogota'])].sort(),
      );
    } finally {
      Object.defineProperty(Intl, 'supportedValuesOf', { value: original, configurable: true });
    }
  });
});
