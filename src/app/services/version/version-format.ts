// Formato del pie de versión: funciones puras, para que la pantalla que lo pinta (Ajustes) solo
// pase los datos del build.

/** `v{versión} · {commit}`; el commit es `sin-git` cuando el build no tuvo historial. */
export function formatVersionLine(version: string, commit: string): string {
  return `v${version} · ${commit}`;
}

/**
 * Fecha-hora del build como `dd/MM/yyyy HH:mm` en la zona indicada (por defecto, la del
 * dispositivo). Se arma por partes para no depender del orden que cada idioma da a la fecha.
 */
export function formatBuildDate(isoDate: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date(isoDate));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}
