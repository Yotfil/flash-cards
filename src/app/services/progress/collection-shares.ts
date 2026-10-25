import type { CardStateTotals } from '@domain/models/book.model';

export type CollectionGroup = 'new' | 'learning' | 'review';

export interface CollectionSegment {
  readonly key: CollectionGroup;
  readonly count: number;
  /** De 0 a 1 sobre el total de la colección (0 si no hay tarjetas). */
  readonly share: number;
}

export interface CollectionShares {
  readonly total: number;
  readonly segments: readonly CollectionSegment[];
}

/** El total y la parte de cada grupo, en el orden de la barra: nuevas, en aprendizaje, dominadas. */
export function collectionShares(counts: CardStateTotals): CollectionShares {
  const total = counts.newCards + counts.learning + counts.review;
  const segment = (key: CollectionGroup, count: number): CollectionSegment => ({
    key,
    count,
    share: total > 0 ? count / total : 0,
  });
  return {
    total,
    segments: [
      segment('new', counts.newCards),
      segment('learning', counts.learning),
      segment('review', counts.review),
    ],
  };
}
