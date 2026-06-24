// Puerto del historial de repasos (`/users/{uid}/reviewLogs`), append-only: sólo se añaden registros,
// nunca se modifican (las reglas de Firestore lo exigen). Es el insumo del optimizador FSRS y la
// analítica futuros.

import type { ReviewLog } from '../models';

/** Un registro de repaso a guardar (sin `id`: lo asigna Firestore). */
export type ReviewLogInput = Omit<ReviewLog, 'id'>;

export abstract class ReviewLogRepository {
  /** Añade un registro de repaso. */
  abstract append(uid: string, log: ReviewLogInput): Promise<void>;
}
