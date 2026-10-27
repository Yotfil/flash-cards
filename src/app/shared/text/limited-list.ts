/**
 * Cuántos elementos pinta, como mucho, una lista que puede crecer sin control (las líneas que se
 * omitirán de un archivo equivocado, las tarjetas que no volverán igual). Pintar miles de filas
 * congela la pantalla en un móvil; el conteo total se sigue diciendo exacto.
 */
export const LISTED_AT_MOST = 100;

/** Los primeros `max` elementos y cuántos quedan sin mostrar. No muta la lista. */
export function limitList<T>(
  items: readonly T[],
  max = LISTED_AT_MOST,
): { shown: readonly T[]; hiddenCount: number } {
  return { shown: items.slice(0, max), hiddenCount: Math.max(items.length - max, 0) };
}

/** La última línea de una lista recortada: "y 19900 más". */
export function andMore(count: number): string {
  return `y ${count} más`;
}
