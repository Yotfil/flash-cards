// Validación en la frontera (contrato CLAUDE.md): un documento de libro que llega de Firestore es
// EXTERNO y se valida con Zod ANTES de convertirlo en un modelo del dominio. Si no cumple, `parse`
// lanza y el repositorio falla de forma explícita (nunca devolvemos un `Book` a medio formar).

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

/** Un Timestamp de Firestore que se transforma a `Date` del dominio. */
const firestoreTimestamp = z.instanceof(Timestamp).transform((value) => value.toDate());

/**
 * Forma del documento `users/{uid}/books/{bookId}` tal como vive en Firestore (sin `id`: ese es la
 * clave del documento). Tras validar, el repositorio le añade el `id`.
 */
export const bookDocumentSchema = z.object({
  name: z.string(),
  subject: z.string(),
  studyDirection: z.enum(['forward', 'both']),
  newCardsPerDay: z.number(),
  maxReviewsPerDay: z.number(),
  order: z.number(),
  cardCount: z.number().optional(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export type BookDocument = z.infer<typeof bookDocumentSchema>;
