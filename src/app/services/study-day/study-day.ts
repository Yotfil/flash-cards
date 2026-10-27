// El "día de estudio" (puro). No rueda a medianoche sino a `dayStartHour` (por defecto, las 4):
// repasar a la 1 de la madrugada todavía cuenta para "ayer". Todo se calcula con el reloj de la
// zona horaria del perfil, que puede no ser la del dispositivo, y nunca sumando o restando horas
// reales: la noche del cambio de hora dura 23 o 25.

const SECOND_MS = 1000;
const HOUR_SECONDS = 60 * 60;
const DAY_MS = 24 * HOUR_SECONDS * SECOND_MS;

/** Id del día de estudio ("YYYY-MM-DD"): también es el id del documento de indicadores diarios. */
export function studyDayId(now: Date, timezone: string, dayStartHour: number): string {
  const local = localDateTime(now, timezone);
  return local.secondsOfDay < dayStartHour * HOUR_SECONDS ? shiftDate(local.date, -1) : local.date;
}

/**
 * Fin del día de estudio en curso: el próximo instante en que el reloj de la zona alcanza
 * `dayStartHour`. La cola lo usa como tope (`due ≤ fin del día`) para no adelantar las de mañana.
 */
export function endOfStudyDay(now: Date, timezone: string, dayStartHour: number): Date {
  const local = localDateTime(now, timezone);
  const startIsStillAhead = local.secondsOfDay < dayStartHour * HOUR_SECONDS;
  const date = startIsStillAhead ? local.date : shiftDate(local.date, 1);
  return instantOfLocalTime(date, dayStartHour, timezone);
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

/** El día de estudio anterior. */
export function previousStudyDayId(dayId: string): string {
  return shiftDate(dayId, -1);
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

/** Lo que marca el reloj de la zona en un instante: la fecha y los segundos del día (24 h). */
interface LocalDateTime {
  readonly date: string;
  readonly secondsOfDay: number;
}

function localDateTime(now: Date, timezone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '00';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    secondsOfDay:
      Number(part('hour')) * HOUR_SECONDS + Number(part('minute')) * 60 + Number(part('second')),
  };
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD". La fecha ya es local: se opera como fecha UTC. */
function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/**
 * El primer instante en que el reloj de la zona marca `hour`:00 de esa fecha, o más. Se prueba el
 * desfase de la zona de un día antes y el de un día después (ninguna zona cambia dos veces en 48 h)
 * y gana el candidato más temprano que ya llegó a esa hora: una noche normal, los dos coinciden; si
 * esa hora no existe (el reloj salta por encima), el instante del salto; si se repite (el reloj
 * vuelve atrás), la primera vez.
 */
function instantOfLocalTime(date: string, hour: number, timezone: string): Date {
  const wall = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  const candidates = [offsetMs(wall - DAY_MS, timezone), offsetMs(wall + DAY_MS, timezone)]
    .map((offset) => wall - offset)
    .filter((candidate) => wallClockMs(candidate, timezone) >= wall);
  if (candidates.length === 0) {
    // Con un solo cambio por noche siempre hay uno; si no, mejor fallar que un día inválido.
    throw new Error(`No se pudo situar las ${hour}:00 del ${date} en ${timezone}.`);
  }
  return new Date(Math.min(...candidates));
}

/** El reloj de la zona en un instante, leído como si fuera una hora UTC. */
function wallClockMs(instant: number, timezone: string): number {
  const { date, secondsOfDay } = localDateTime(new Date(instant), timezone);
  return Date.parse(`${date}T00:00:00Z`) + secondsOfDay * SECOND_MS;
}

/** Cuánto adelanta (o atrasa) el reloj de la zona a UTC en un instante. */
function offsetMs(instant: number, timezone: string): number {
  return wallClockMs(instant, timezone) - instant;
}
