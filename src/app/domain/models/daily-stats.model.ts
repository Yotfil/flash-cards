import type { Rating } from './rating';

// Indicadores del día de estudio (`/users/{uid}/dailyStats/{YYYY-MM-DD}`). Hacen cumplir los topes
// diarios de cada libro, alimentan la racha y las estadísticas. El id del documento ES la fecha
// del día de estudio, así que leer "hoy" es directo. Mismo modelo que la 0.1.1 (datos compatibles).

/** Calificaciones del día por nombre legible. */
export interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface DailyStats {
  /** Igual a `date`. */
  id: string;
  /** "YYYY-MM-DD" del día de estudio, en la zona horaria del usuario. */
  date: string;
  /** Nuevas introducidas hoy por libro (clave = bookId): hace cumplir `newCardsPerDay`. */
  newCardsIntroduced: Record<string, number>;
  reviewsCompleted: number;
  /**
   * Repasos de tarjetas que no eran nuevas, por libro (clave = bookId): hace cumplir
   * `maxReviewsPerDay`, que solo aplica a las vencidas.
   */
  reviewsCompletedByBook: Record<string, number>;
  ratingCounts: RatingCounts;
}

const RATING_COUNT_KEYS = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' } as const satisfies Record<
  Rating,
  keyof RatingCounts
>;

/** El contador de `ratingCounts` que suma cada grado. */
export function ratingCountKey(rating: Rating): keyof RatingCounts {
  return RATING_COUNT_KEYS[rating];
}
