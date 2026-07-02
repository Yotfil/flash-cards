// Puerto de persistencia de una calificación. Calificar toca TRES documentos (el nuevo scheduling
// de la tarjeta, el registro append-only del historial y los contadores del día) y deben quedar
// juntos o no quedar: si se escribieran por separado, un fallo intermedio dejaría la tarjeta
// reprogramada sin historial ni estadísticas. El adaptador garantiza la atomicidad (writeBatch).

import type { CardScheduling } from '../models';
import type { ReviewStatInput } from './daily-stats.repository';
import type { ReviewLogInput } from './review-log.repository';

export interface GradePersistenceInput {
  cardId: string;
  /** Nuevo estado de programación de la tarjeta (resultado del scheduler). */
  scheduling: CardScheduling;
  /** Registro para el historial append-only (`reviewLogs`). */
  log: ReviewLogInput;
  /** Día de estudio (YYYY-MM-DD) cuyos contadores se incrementan. */
  dateId: string;
  /** Incrementos de los contadores del día (`dailyStats`). */
  stat: ReviewStatInput;
}

export abstract class GradePersistencePort {
  /** Persiste la calificación completa de forma atómica (todo o nada). */
  abstract persistGrade(uid: string, input: GradePersistenceInput): Promise<void>;
}
