import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

import type { ReviewLogInput } from '@domain/models/review-log.model';

import { firestoreTimestamp } from '../document-boundary';

// Documento `users/{uid}/reviewLogs/{logId}`: inmutable (las reglas niegan editarlo o borrarlo).
// Hoy solo se escribe; el esquema existe para la prueba de ida y vuelta y para quien lo lea en el
// futuro. `durationMs` es opcional al leer: registros viejos de la 0.1.1 pueden no tenerlo.
export const reviewLogSchema = z.object({
  cardId: z.string(),
  bookId: z.string(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  state: z.number().int().min(0).max(3),
  due: firestoreTimestamp,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  lastElapsedDays: z.number(),
  scheduledDays: z.number(),
  reviewedAt: firestoreTimestamp,
  durationMs: z.number().optional(),
});

/** El registro tal como se guarda: las fechas como `Timestamp`. */
export function reviewLogToDocument(log: ReviewLogInput): Record<string, unknown> {
  return {
    ...log,
    due: Timestamp.fromDate(log.due),
    reviewedAt: Timestamp.fromDate(log.reviewedAt),
  };
}
