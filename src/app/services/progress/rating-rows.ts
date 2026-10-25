import { ratingCountKey, type DailyStats } from '@domain/models/daily-stats.model';
import { RATINGS, type Rating } from '@domain/models/rating';

/** Una fila de "Calificaciones de hoy": el grado, cuántas veces se eligió y su parte del total. */
export interface RatingRow {
  readonly rating: Rating;
  readonly count: number;
  /** De 0 a 1 sobre las repasadas hoy (0 si no hubo repasos). */
  readonly share: number;
}

/**
 * Siempre las cuatro filas en orden fijo, aunque el contador del día no exista o le falten grados:
 * lo ausente cuenta como 0. La etiqueta de cada grado la pone la pantalla.
 */
export function ratingRows(stats: DailyStats | null): RatingRow[] {
  const total = stats?.reviewsCompleted ?? 0;
  return RATINGS.map((rating) => {
    const count = stats?.ratingCounts[ratingCountKey(rating)] ?? 0;
    return { rating, count, share: total > 0 ? count / total : 0 };
  });
}
