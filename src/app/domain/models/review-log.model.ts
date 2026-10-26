import type { CardState } from './card.model';
import type { Rating } from './rating';

// Un repaso en el historial (`/users/{uid}/reviewLogs/{logId}`): inmutable, solo se añade. Guarda
// el grado elegido y los valores de programación de ANTES del repaso, como la 0.1.1 (datos
// compatibles). Nadie lo lee en 1.0.0; se captura desde el principio para el futuro.
export interface ReviewLog {
  id: string;
  cardId: string;
  bookId: string;
  rating: Rating;
  /** Estado de la tarjeta antes de este repaso. */
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  /** Instante de la calificación. */
  reviewedAt: Date;
  /** Duración del repaso de esta aparición: de mostrar el anverso al toque de calificar. */
  durationMs: number;
}

/** Lo que se escribe: todo menos el id, que pone el almacén. */
export type ReviewLogInput = Omit<ReviewLog, 'id'>;
