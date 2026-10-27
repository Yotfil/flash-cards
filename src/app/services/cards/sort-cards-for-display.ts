import type { Card } from '@domain/models/card.model';

import { normalizeCardText } from './normalize-card-text';

/**
 * Orden del listado: anverso y luego reverso normalizados (así la misma palabra queda junta y
 * una repetida queda al lado de su igual), a igualdad la más antigua primero y, si aún empatan,
 * el texto tal cual. No muta la lista.
 */
export function sortCardsForDisplay(cards: readonly Card[]): Card[] {
  return [...cards].sort(compareCardsForDisplay);
}

/** La comparación del listado, para quien ordena con ese mismo criterio (la cola, al desempatar). */
export function compareCardsForDisplay(a: Card, b: Card): number {
  return (
    compareText(a.front, b.front) ||
    compareText(a.back, b.back) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    compareExactly(a.front, b.front) ||
    compareExactly(a.back, b.back)
  );
}

function compareText(a: string, b: string): number {
  return normalizeCardText(a).localeCompare(normalizeCardText(b), 'es');
}

/**
 * El último desempate, para que el orden no dependa de cómo devuelve las tarjetas el almacén
 * (las importadas a la vez comparten fecha). Por unidades de código y no con `localeCompare`,
 * que da 0 entre textos distintos que se leen igual.
 */
function compareExactly(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
