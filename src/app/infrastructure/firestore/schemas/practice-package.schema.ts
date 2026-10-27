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
const practicePackageFieldsSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  status: z.enum(['open', 'completed']),
  items: z.record(z.string(), z.unknown()),
  itemOrder: z.array(z.string()),
  todaySet: z.object({ dayId: z.string(), itemIds: z.array(z.string()) }).optional(),
  createdAt: firestoreTimestamp,
  completedAt: firestoreTimestamp.optional(),
});

/** Lo que hace falta leer para decidir si caben más ítems o si un ítem sigue en el paquete. */
export const packageItemOrderSchema = practicePackageFieldsSchema.pick({
  capacity: true,
  itemOrder: true,
  status: true,
});

type StoredItem = z.output<typeof practiceItemSchema> & { readonly id: string };

// Los ítems del paquete son los que lista `itemOrder`: solo esos se validan. Una entrada que no
// figura ahí es el resto de un ítem borrado que otro dispositivo, con la lista vieja, calificó o
// editó por su ruta; se aparta en `strayItemIds` (quien lee lo registra) en vez de invalidar el
// paquete entero. Una entrada listada que no cumple la forma sí es un documento inválido.
export const practicePackageDocumentSchema = practicePackageFieldsSchema.transform(
  (document, context) => {
    const listed = new Set(document.itemOrder);
    const items: Record<string, StoredItem> = {};
    const strayItemIds: string[] = [];
    for (const [id, stored] of Object.entries(document.items)) {
      if (!listed.has(id)) {
        strayItemIds.push(id);
        continue;
      }
      const item = practiceItemSchema.safeParse(stored);
      if (!item.success) {
        for (const issue of item.error.issues) {
          context.addIssue({ ...issue, path: ['items', id, ...issue.path] });
        }
        continue;
      }
      items[id] = { id, ...item.data };
    }
    return { ...document, items, strayItemIds };
  },
);

export type PracticePackageDocument = z.output<typeof practicePackageDocumentSchema>;
