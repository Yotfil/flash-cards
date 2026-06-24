// Identidad del "día de estudio" (puro). El día no rueda a medianoche sino a `dayStartHour` (def. 4am):
// repasar a la 1am todavía cuenta para "ayer". Se usa como id del documento de `dailyStats` y, en
// F1.6, para el fin de día de la cola. Devuelve "YYYY-MM-DD" en la zona horaria del usuario.

const HOUR_MS = 60 * 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;

export function studyDayId(now: Date, timezone: string, dayStartHour: number): string {
  // Se corre el instante hacia atrás `dayStartHour` horas; al formatear en la zona, las horas
  // anteriores al inicio del día caen en la fecha anterior.
  const shifted = new Date(now.getTime() - dayStartHour * HOUR_MS);
  // 'en-CA' produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

/** Hora local (h/m/s) de un instante en una zona, en formato de 24h. */
function localTimeSeconds(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return get('hour') * 3600 + get('minute') * 60 + get('second');
}

/**
 * Fin del día de estudio actual: el próximo instante en que el reloj de la zona del usuario alcanza
 * `dayStartHour`. La cola usa esto como tope (`due ≤ finDía`) para no adelantar tarjetas de mañana.
 */
export function endOfStudyDay(now: Date, timezone: string, dayStartHour: number): Date {
  const secondsIntoDay = localTimeSeconds(now, timezone);
  let secondsUntilBoundary = dayStartHour * 3600 - secondsIntoDay;
  if (secondsUntilBoundary <= 0) {
    secondsUntilBoundary += DAY_SECONDS;
  }
  return new Date(now.getTime() + secondsUntilBoundary * 1000);
}
