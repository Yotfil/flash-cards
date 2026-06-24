// Identidad del "día de estudio" (puro). El día no rueda a medianoche sino a `dayStartHour` (def. 4am):
// repasar a la 1am todavía cuenta para "ayer". Se usa como id del documento de `dailyStats` y, en
// F1.6, para el fin de día de la cola. Devuelve "YYYY-MM-DD" en la zona horaria del usuario.

const HOUR_MS = 60 * 60 * 1000;

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
