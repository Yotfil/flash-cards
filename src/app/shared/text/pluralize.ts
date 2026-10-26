/** Conteo con plural real: "1 tarjeta", "0 tarjetas", "12 tarjetas". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
