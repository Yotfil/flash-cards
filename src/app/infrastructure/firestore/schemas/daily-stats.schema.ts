import { z } from 'zod';

// Contadores dispersos: los indicadores se escriben con incrementos y `merge`, así que un documento
// solo trae lo que algún repaso tocó (y los de la 0.1.1 temprana no tienen repasos por libro). Lo
// ausente cuenta cero. Los valores por defecto son funciones para no compartir el mismo objeto.
const countsByBook = z.record(z.string(), z.number()).default(() => ({}));
const count = z.number().default(0);

const ratingCountsSchema = z
  .object({ again: count, hard: count, good: count, easy: count })
  .default(() => ({ again: 0, hard: 0, good: 0, easy: 0 }));

// Forma del documento `users/{uid}/dailyStats/{YYYY-MM-DD}` (sin `id`: es la clave y vale `date`).
export const dailyStatsDocumentSchema = z.object({
  date: z.string(),
  newCardsIntroduced: countsByBook,
  reviewsCompleted: count,
  reviewsCompletedByBook: countsByBook,
  ratingCounts: ratingCountsSchema,
});

export type DailyStatsDocument = z.output<typeof dailyStatsDocumentSchema>;
