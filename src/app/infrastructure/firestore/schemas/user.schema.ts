// Validación en la frontera (contrato CLAUDE.md): los datos que llegan de Firestore son
// EXTERNOS y se validan con Zod ANTES de convertirlos en un modelo del dominio. Si el
// documento no cumple, `parse` lanza y el repositorio falla de forma explícita (nunca
// devolvemos un `User` a medio formar).

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

/** Un Timestamp de Firestore que se transforma a `Date` del dominio. */
const firestoreTimestamp = z.instanceof(Timestamp).transform((value) => value.toDate());

const userSettingsSchema = z.object({
  timezone: z.string(),
  dayStartHour: z.number(),
  theme: z.enum(['light', 'dark', 'system']),
});

/**
 * Forma del documento `users/{uid}` tal como vive en Firestore (sin `id`: ese es la clave
 * del documento). Tras validar, el repositorio le añade el `id`.
 */
export const userDocumentSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  createdAt: firestoreTimestamp,
  settings: userSettingsSchema,
  handle: z.string().optional(),
  photoURL: z.string().optional(),
  isSearchable: z.boolean(),
});

export type UserDocument = z.infer<typeof userDocumentSchema>;
