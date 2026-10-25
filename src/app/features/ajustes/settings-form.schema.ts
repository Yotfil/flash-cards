import { z } from 'zod';

import { boundedInteger } from '@shared/forms/bounded-integer.schema';

import { AJUSTES_COPY } from './ajustes.copy';

// El único campo de texto de Ajustes: el default global de tarjetas nuevas por día.
export const settingsFormSchema = z.object({
  defaultNewCardsPerDay: boundedInteger(0, 999, AJUSTES_COPY.study.newCardsInvalid),
});

export type SettingsFormValue = z.infer<typeof settingsFormSchema>;
