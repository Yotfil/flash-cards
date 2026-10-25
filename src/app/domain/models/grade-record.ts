import type { CardScheduling } from './card.model';
import type { Rating } from './rating';
import type { ReviewLogInput } from './review-log.model';

/**
 * Todo lo que una calificación guarda de una vez (todo o nada): la nueva programación de la
 * tarjeta, el registro del historial y lo que suma a los indicadores de su día de estudio.
 */
export interface GradeRecord {
  cardId: string;
  bookId: string;
  scheduling: CardScheduling;
  log: ReviewLogInput;
  /** Día de estudio al que se acredita el repaso ("YYYY-MM-DD"). */
  dayId: string;
  /** Una nueva introducida cuenta para la tanda de nuevas; una que no lo era, para el tope de repasos. */
  stat: { rating: Rating; wasNew: boolean };
}
