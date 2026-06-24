// Validación en la frontera (contrato CLAUDE.md): un documento de tarjeta que llega de Firestore es
// EXTERNO y se valida con Zod ANTES de convertirlo en un modelo del dominio. Si no cumple, `parse`
// lanza y el repositorio falla de forma explícita (nunca devolvemos un `Card` a medias).

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

/** Un Timestamp de Firestore que se transforma a `Date` del dominio. */
const firestoreTimestamp = z.instanceof(Timestamp).transform((value) => value.toDate());

/** Bloque de programación (espeja ts-fsrs). `lastReview` puede ser null si nunca se ha repasado. */
const cardSchedulingSchema = z.object({
  due: firestoreTimestamp,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number().int().min(0).max(3),
  lastReview: z.union([firestoreTimestamp, z.null()]),
});

/**
 * Forma del documento `users/{uid}/cards/{cardId}` tal como vive en Firestore (sin `id`: ese es la
 * clave del documento). Tras validar, el repositorio le añade el `id`.
 */
export const cardDocumentSchema = z.object({
  bookId: z.string(),
  chapterId: z.string(),
  noteId: z.string(),
  direction: z.enum(['forward', 'reverse']),
  front: z.string(),
  back: z.string(),
  pronunciation: z.string().optional(),
  example: z.string().optional(),
  audioUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scheduling: cardSchedulingSchema,
  suspended: z.boolean(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export type CardDocument = z.infer<typeof cardDocumentSchema>;
