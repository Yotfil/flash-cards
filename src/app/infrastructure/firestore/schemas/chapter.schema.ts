// Validación en la frontera (contrato CLAUDE.md): un documento de capítulo que llega de Firestore
// es EXTERNO y se valida con Zod ANTES de convertirlo en un modelo del dominio. Si no cumple,
// `parse` lanza y el repositorio falla de forma explícita (nunca devolvemos un `Chapter` a medias).

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

/** Un Timestamp de Firestore que se transforma a `Date` del dominio. */
const firestoreTimestamp = z.instanceof(Timestamp).transform((value) => value.toDate());

/**
 * Forma del documento `users/{uid}/chapters/{chapterId}` tal como vive en Firestore (sin `id`: ese
 * es la clave del documento). Tras validar, el repositorio le añade el `id`.
 */
export const chapterDocumentSchema = z.object({
  bookId: z.string(),
  name: z.string(),
  order: z.number(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export type ChapterDocument = z.infer<typeof chapterDocumentSchema>;
