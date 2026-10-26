import { normalizeCardText } from './normalize-card-text';

interface CardFaces {
  readonly front: string;
  readonly back: string;
}

/** Clave de comparación: anverso y reverso normalizados (el reverso distinto no es repetida). */
function duplicateKey(card: CardFaces): string {
  return `${normalizeCardText(card.front)}\u0000${normalizeCardText(card.back)}`;
}

/** Ids de todas las tarjetas que tienen al menos una igual (se marcan todas las del grupo). */
export function findDuplicateCardIds(cards: readonly (CardFaces & { id: string })[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const card of cards) {
    const key = duplicateKey(card);
    groups.set(key, [...(groups.get(key) ?? []), card.id]);
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
}

/** ¿El borrador repite una tarjeta existente? Misma regla que el listado. */
export function isDuplicateDraft(draft: CardFaces, cards: readonly CardFaces[]): boolean {
  const key = duplicateKey(draft);
  return cards.some((card) => duplicateKey(card) === key);
}
