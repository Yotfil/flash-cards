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
