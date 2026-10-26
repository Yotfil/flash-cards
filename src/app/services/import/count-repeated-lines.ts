import type { CardContentDraft } from '@domain/models/card.model';
import { normalizeCardText } from '@services/cards/normalize-card-text';

interface CardFaces {
  readonly front: string;
  readonly back: string;
}

const key = (card: CardFaces) =>
  `${normalizeCardText(card.front)}\u0000${normalizeCardText(card.back)}`;

/**
 * Cuántas líneas válidas entrarán repetidas: las que tienen otra igual (mismo anverso y reverso
 * normalizados, como en el listado) dentro del texto o entre las tarjetas ya cargadas del
 * capítulo destino. No filtra nada: solo avisa en la previsualización.
 */
export function countRepeatedLines(
  drafts: readonly CardContentDraft[],
  existing: readonly CardFaces[],
): number {
  const existingKeys = new Set(existing.map(key));
  const draftKeys = drafts.map(key);
  const timesInText = new Map<string, number>();
  draftKeys.forEach((draftKey) => timesInText.set(draftKey, (timesInText.get(draftKey) ?? 0) + 1));
  return draftKeys.filter(
    (draftKey) => existingKeys.has(draftKey) || (timesInText.get(draftKey) ?? 0) > 1,
  ).length;
}
