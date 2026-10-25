import { FORMAT_INTERVAL_COPY as copy } from './format-interval.copy';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Texto humano de la distancia hasta un vencimiento, por tramos: "ahora", minutos, horas y luego
 * días completos, meses y años. Sale del vencimiento exacto (no de los días enteros programados),
 * así un paso de aprendizaje se lee "10 min" y no "<1 día".
 */
export function formatInterval(due: Date, now: Date): string {
  const ms = due.getTime() - now.getTime();
  if (ms <= 0) {
    return copy.now;
  }
  if (ms < HOUR_MS) {
    return copy.minutes(Math.max(1, Math.round(ms / MINUTE_MS)));
  }
  if (ms < DAY_MS) {
    return copy.hours(Math.round(ms / HOUR_MS));
  }
  const days = Math.floor(ms / DAY_MS);
  if (days < 30) {
    return copy.days(days);
  }
  if (days < 365) {
    return copy.months(Math.round(days / 30));
  }
  return copy.years(Math.round(days / 365));
}
