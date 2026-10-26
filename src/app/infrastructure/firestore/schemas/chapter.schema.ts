import { z } from 'zod';

import { firestoreTimestamp } from '../document-boundary';

// Forma del documento `users/{uid}/chapters/{chapterId}` (sin `id`: es la clave). El nombre puede
// venir vacío en capítulos de versiones anteriores.
export const chapterDocumentSchema = z.object({
  bookId: z.string().min(1),
  name: z.string(),
  order: z.number(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});
