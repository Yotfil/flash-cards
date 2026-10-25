import { z } from 'zod';

import { firestoreTimestamp } from '../document-boundary';

const rating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const practiceItemSchema = z.object({
  cardType: z.enum(['basic', 'cloze']),
  front: z.string(),
  back: z.string(),
  example: z.string().optional(),
  lastGrade: rating.optional(),
  lastPracticedDayId: z.string().optional(),
  addedAt: firestoreTimestamp,
});

// Forma del documento `users/{uid}/practicePackages/{packageId}` (sin `id`: es la clave). Los
// ítems van dentro como mapa por id (así una calificación actualiza solo su ruta); el id de cada
// ítem se copia desde su clave al leer.
export const practicePackageDocumentSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  status: z.enum(['open', 'completed']),
  items: z
    .record(z.string(), practiceItemSchema)
    .transform((items) =>
      Object.fromEntries(Object.entries(items).map(([id, item]) => [id, { id, ...item }])),
    ),
  itemOrder: z.array(z.string()),
  todaySet: z.object({ dayId: z.string(), itemIds: z.array(z.string()) }).optional(),
  createdAt: firestoreTimestamp,
  completedAt: firestoreTimestamp.optional(),
});

export type PracticePackageDocument = z.output<typeof practicePackageDocumentSchema>;
