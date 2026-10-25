import type { Card } from '@domain/models/card.model';

/**
 * Las tarjetas que se pueden practicar: básicas con anverso y reverso. Las cloze quedan fuera (no
 * tienen un reverso que preguntar); las suspendidas entran, porque practicar no las programa.
 */
export function selectEligibleCards(cards: readonly Card[]): Card[] {
  return cards.filter(
    (card) => card.cardType !== 'cloze' && card.front.trim() !== '' && card.back.trim() !== '',
  );
}
