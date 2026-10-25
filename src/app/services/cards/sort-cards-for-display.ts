import type { Card } from '@domain/models/card.model';

import { normalizeCardText } from './normalize-card-text';

/**
 * Orden del listado: anverso y luego reverso normalizados (así la misma palabra queda junta y
 * una repetida queda al lado de su igual) y, a igualdad, la más antigua primero. No muta la lista.
 */
export function sortCardsForDisplay(cards: readonly Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      compareText(a.front, b.front) ||
      compareText(a.back, b.back) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

function compareText(a: string, b: string): number {
  return normalizeCardText(a).localeCompare(normalizeCardText(b), 'es');
}
