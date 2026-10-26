import { z } from 'zod';

import { boundedInteger } from '@shared/forms/bounded-integer.schema';

import { BIBLIOTECA_COPY } from './biblioteca.copy';

// Ajustes por libro: la tanda de nuevas y el tope de repasos (0 = sin tope).
export const bookSettingsFormSchema = z.object({
  newCardsPerDay: boundedInteger(0, 999, BIBLIOTECA_COPY.bookSettings.newCardsInvalid),
  maxReviewsPerDay: boundedInteger(0, 9999, BIBLIOTECA_COPY.bookSettings.maxReviewsInvalid),
});

export type BookSettingsFormValue = z.infer<typeof bookSettingsFormSchema>;
