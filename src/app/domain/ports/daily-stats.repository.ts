// Puerto de los contadores del día (`/users/{uid}/dailyStats/{YYYY-MM-DD}`). Doble función:
// alimenta las estadísticas y, vía `newCardsIntroduced`, hace cumplir el tope de nuevas/día (la cola
// de F1.6 lo leerá). El id del documento ES la fecha del día de estudio.

import type { Rating } from '../models';

export interface ReviewStatInput {
  rating: Rating;
  /** Libro de la tarjeta repasada (para `newCardsIntroduced` por libro). */
  bookId: string;
  /** True si la tarjeta estaba en estado New antes de este repaso (cuenta como nueva introducida). */
  wasNew: boolean;
}

export abstract class DailyStatsRepository {
  /** Registra un repaso del día: incrementa `reviewsCompleted`, `ratingCounts` y, si es nueva,
   *  `newCardsIntroduced[bookId]`. */
  abstract recordReview(uid: string, dateId: string, input: ReviewStatInput): Promise<void>;
}
