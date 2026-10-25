import { z } from 'zod';

import { boundedInteger } from '@shared/forms/bounded-integer.schema';

import { PRACTICA_IA_COPY } from '../practica-ia/practica-ia.copy';

/** Los límites de "Ítems por paquete". */
export const MIN_PACKAGE_CAPACITY = 5;
export const MAX_PACKAGE_CAPACITY = 100;

// La sección "Práctica con IA" de Ajustes: la plantilla del prompt y los ítems por paquete.
export const practiceSettingsFormSchema = z.object({
  promptTemplate: z.string().trim().min(1, { error: PRACTICA_IA_COPY.templateEmpty }),
  practicePackageCapacity: boundedInteger(
    MIN_PACKAGE_CAPACITY,
    MAX_PACKAGE_CAPACITY,
    PRACTICA_IA_COPY.capacityRange,
  ),
});

export type PracticeSettingsFormValue = z.input<typeof practiceSettingsFormSchema>;
