import { FORMAT_INTERVAL_COPY as copy } from './format-interval.copy';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Texto humano de la distancia hasta un vencimiento, por tramos: "ahora", minutos, horas y luego
 * días completos, meses y años. Sale del vencimiento exacto (no de los días enteros programados),
 * así un paso de aprendizaje se lee "10 min" y no "<1 día". Cada tramo decide con su valor ya
 * redondeado: si el redondeo llega al primero del tramo siguiente, se muestra ese ("1 h" y no
 * "60 min", "1 día" y no "24 h", "1 año" y no "12 meses").
 */
export function formatInterval(due: Date, now: Date): string {
  const ms = due.getTime() - now.getTime();
  if (ms <= 0) {
    return copy.now;
  }
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) {
    return copy.minutes(minutes);
  }
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 24) {
    return copy.hours(hours);
  }
  const days = Math.max(1, Math.floor(ms / DAY_MS));
  if (days < 30) {
    return copy.days(days);
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return copy.months(months);
  }
  return copy.years(Math.max(1, Math.round(days / 365)));
}
