// Validación en la frontera del contador del día (`users/{uid}/dailyStats/{YYYY-MM-DD}`). Los
// conteos se escriben de forma dispersa (incrementos), así que las claves ausentes se completan a 0.

import { z } from 'zod';

export const dailyStatsDocumentSchema = z.object({
  date: z.string(),
  reviewsCompleted: z.number().default(0),
  ratingCounts: z
    .object({
      again: z.number().default(0),
      hard: z.number().default(0),
      good: z.number().default(0),
      easy: z.number().default(0),
    })
    .default({ again: 0, hard: 0, good: 0, easy: 0 }),
  newCardsIntroduced: z.record(z.string(), z.number()).default({}),
});

export type DailyStatsDocument = z.infer<typeof dailyStatsDocumentSchema>;
