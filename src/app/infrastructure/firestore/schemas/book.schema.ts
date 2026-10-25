import { z } from 'zod';

import { firestoreTimestamp } from '../document-boundary';

// Forma del documento `users/{uid}/books/{bookId}` (sin `id`: es la clave). `both` sigue siendo
// válido al leer: existe en libros de versiones anteriores. `cardCount` falta en libros antiguos.
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

export type BookDocument = z.output<typeof bookDocumentSchema>;
