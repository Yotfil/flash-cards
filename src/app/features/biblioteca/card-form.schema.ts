import { z } from 'zod';

import { hasCloze } from '@services/cards/cloze/parse-cloze';

import { BIBLIOTECA_COPY } from './biblioteca.copy';

const copy = BIBLIOTECA_COPY.cardForm;
const MAX_TEXT = 2000;

/** Texto obligatorio, recortado y con tope (el mismo patrón que el nombre del libro). */
function requiredText(message: string) {
  return z.string().trim().min(1, { error: message }).max(MAX_TEXT, { error: copy.tooLong });
}

const example = z.string().trim().max(MAX_TEXT, { error: copy.tooLong });

// Formulario de tarjeta, distinto por tipo: la básica exige anverso y reverso; la cloze exige un
// texto con al menos un hueco y no tiene reverso. El ejemplo es opcional en ambas.
export const cardFormSchema = z.discriminatedUnion('cardType', [
  z.object({
    cardType: z.literal('basic'),
    front: requiredText(copy.frontRequired),
    back: requiredText(copy.backRequired),
    example,
  }),
  z.object({
    cardType: z.literal('cloze'),
    front: z
      .string()
      .trim()
      .max(MAX_TEXT, { error: copy.tooLong })
      .refine(hasCloze, { error: copy.clozeRequired }),
    back: z.string(),
    example,
  }),
]);

export type CardFormValue = z.input<typeof cardFormSchema>;
