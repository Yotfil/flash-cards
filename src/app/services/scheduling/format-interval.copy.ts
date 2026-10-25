// Textos de los intervalos que se muestran bajo cada cerebro ("Bien · 10 min"). El plural va aquí
// mismo: services/ no puede usar el `pluralize` de shared/ (las capas lo impiden).
const counted = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export const FORMAT_INTERVAL_COPY = {
  now: 'ahora',
  minutes: (count: number) => `${count} min`,
  hours: (count: number) => `${count} h`,
  days: (count: number) => counted(count, 'día', 'días'),
  months: (count: number) => counted(count, 'mes', 'meses'),
  years: (count: number) => counted(count, 'año', 'años'),
} as const;
