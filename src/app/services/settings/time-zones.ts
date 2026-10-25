// Zonas horarias para el selector de Ajustes. La lista sale del propio dispositivo (todas las
// zonas IANA que conoce) y siempre incluye la del dispositivo y la guardada en el perfil, para que
// el selector nunca pierda el valor actual. En navegadores viejos sin la API, al menos esas dos.

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function supportedTimeZones(savedZone?: string): readonly string[] {
  const known =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const zones = new Set([...known, deviceTimeZone(), ...(savedZone ? [savedZone] : [])]);
  return [...zones].sort();
}
