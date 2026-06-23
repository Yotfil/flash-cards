// Historial de repasos (`/users/{uid}/reviewLogs/{logId}`), append-only. Especificación §6.7.
// Nunca se modifica tras escribirse; solo crece. Es el insumo del optimizador de FSRS
// (parámetros personalizados, futuro) y de toda la analítica.

import type { CardState } from './card.model';

/** Calificación emitida por los 4 cerebros. 1=Again, 2=Hard, 3=Good, 4=Easy. */
export type Rating = 1 | 2 | 3 | 4;

export interface ReviewLog {
  id: string;
  cardId: string;
  /** Denormalizado, para analítica por libro sin "joins". */
  bookId: string;
  rating: Rating;
  /** Estado ANTES del repaso. */
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  /** Momento exacto del repaso. */
  reviewedAt: Date;
  /**
   * Tiempo de respuesta. Se captura DESDE el MVP aunque todavía no se use: es la semilla
   * del auto-grading futuro (calificar por velocidad de respuesta).
   */
  durationMs?: number;
}
