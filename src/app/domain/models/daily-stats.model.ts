// Contador del día (`/users/{uid}/dailyStats/{YYYY-MM-DD}`). Especificación §6.8.
// Doble función: hace cumplir el tope de nuevas por día y alimenta las estadísticas básicas.
// El id del documento ES la fecha, así que leer/escribir "hoy" es directo.

/** Conteo de calificaciones del día, por nombre legible. */
export interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface DailyStats {
  /** Igual a `date`: "2026-06-21" en la zona horaria del usuario. */
  id: string;
  date: string;
  /** Nuevas introducidas hoy por libro (clave = bookId), para hacer cumplir newCardsPerDay. */
  newCardsIntroduced: Record<string, number>;
  reviewsCompleted: number;
  /**
   * Repasos REALES completados hoy por libro (clave = bookId), para hacer cumplir maxReviewsPerDay.
   * Cuenta sólo tarjetas que NO estaban en estado New (la introducción de una nueva va en
   * `newCardsIntroduced`), igual que el tope sólo aplica a las vencidas.
   */
  reviewsCompletedByBook: Record<string, number>;
  ratingCounts: RatingCounts;
}
