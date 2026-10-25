import { z } from 'zod';

import { DEFAULT_NEW_CARDS_PER_DAY } from '@domain/models/study-defaults';
import { THEME_PREFERENCES } from '@domain/models/theme-preference';

import { firestoreTimestamp } from '../document-boundary';

// Forma del documento `users/{uid}` tal como vive en Firestore (sin `id`: es la clave). Los dos
// ajustes añadidos después del lanzamiento se completan al leer perfiles antiguos.
const userSettingsSchema = z.object({
  timezone: z.string(),
  dayStartHour: z.number(),
  theme: z.enum(THEME_PREFERENCES),
  defaultNewCardsPerDay: z.number().default(DEFAULT_NEW_CARDS_PER_DAY),
  autoGradeByTime: z.boolean().default(true),
});

export const userDocumentSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  createdAt: firestoreTimestamp,
  settings: userSettingsSchema,
  handle: z.string().optional(),
  photoURL: z.string().optional(),
  isSearchable: z.boolean(),
});

export type UserDocument = z.output<typeof userDocumentSchema>;
