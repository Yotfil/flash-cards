import { z } from 'zod';

import { firestoreTimestamp } from '../document-boundary';

// Bloque de programación (espeja ts-fsrs). `learningSteps` falta en tarjetas anteriores al repaso
// con ts-fsrs v5 y se lee como 0; `lastReview` es `null` si nunca se repasó.
const cardSchedulingSchema = z.object({
  due: firestoreTimestamp,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number().default(0),
  reps: z.number(),
  lapses: z.number(),
  state: z.number().int().min(0).max(3),
  lastReview: z.union([firestoreTimestamp, z.null()]),
});

// Forma del documento `users/{uid}/cards/{cardId}` (sin `id`: es la clave). Compatible con todas
// las versiones anteriores: tipo ausente = básica, suspensión ausente = activa, campos futuros
// (pronunciación, audio, notas, etiquetas) se leen y se conservan aunque la app no los edite.
export const cardDocumentSchema = z.object({
  bookId: z.string(),
  chapterId: z.string(),
  noteId: z.string(),
  direction: z.enum(['forward', 'reverse']),
  cardType: z.enum(['basic', 'cloze']).optional(),
  front: z.string(),
  back: z.string(),
  example: z.string().optional(),
  pronunciation: z.string().optional(),
  audioUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scheduling: cardSchedulingSchema,
  suspended: z.boolean().default(false),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export type CardDocument = z.output<typeof cardDocumentSchema>;
