// El "día de estudio" (puro). No rueda a medianoche sino a `dayStartHour` (por defecto, las 4):
// repasar a la 1 de la madrugada todavía cuenta para "ayer". Todo se calcula en la zona horaria
// del perfil, que puede no ser la del dispositivo.

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;
const DAY_SECONDS = 24 * 60 * 60;

/** Id del día de estudio ("YYYY-MM-DD"): también es el id del documento de indicadores diarios. */
export function studyDayId(now: Date, timezone: string, dayStartHour: number): string {
  // Se corre el instante hacia atrás `dayStartHour` horas: las horas anteriores al inicio del día
  // caen así en la fecha anterior. 'en-CA' formatea como YYYY-MM-DD.
  const shifted = new Date(now.getTime() - dayStartHour * HOUR_MS);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

/**
 * Fin del día de estudio en curso: el próximo instante en que el reloj de la zona alcanza
 * `dayStartHour`. La cola lo usa como tope (`due ≤ fin del día`) para no adelantar las de mañana.
 */
export function endOfStudyDay(now: Date, timezone: string, dayStartHour: number): Date {
  let secondsUntilStart = dayStartHour * 3600 - localSecondsOfDay(now, timezone);
  if (secondsUntilStart <= 0) {
    secondsUntilStart += DAY_SECONDS;
  }
  const startOfCurrentSecond = now.getTime() - (now.getTime() % SECOND_MS);
  return new Date(startOfCurrentSecond + secondsUntilStart * SECOND_MS);
}

/** Un día de estudio: su id y el instante en que termina. */
export interface StudyDay {
  readonly id: string;
  readonly endOfDay: Date;
}

/** El día de estudio de un instante, con su fin (lo que la cola y las sesiones necesitan). */
export function studyDayAt(now: Date, timezone: string, dayStartHour: number): StudyDay {
  return {
    id: studyDayId(now, timezone, dayStartHour),
    endOfDay: endOfStudyDay(now, timezone, dayStartHour),
  };
}

/** El día de estudio anterior. La cadena ya es una fecha local: se resta como fecha UTC. */
export function previousStudyDayId(dayId: string): string {
  const date = new Date(`${dayId}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Fecha civil del usuario para el subtítulo de Hoy ("Miércoles, 22 de octubre"). Es la fecha del
 * reloj, no la del día de estudio: a la 01:30 del miércoles no se dice "martes".
 */
export function formatLocalDate(now: Date, timezone: string): string {
  const text = new Intl.DateTimeFormat('es', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Segundos transcurridos del día en el reloj de la zona (formato de 24 h). */
function localSecondsOfDay(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value ?? '0');
  return part('hour') * 3600 + part('minute') * 60 + part('second');
}
