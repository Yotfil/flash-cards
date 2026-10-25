import { z } from 'zod';

import { hasCloze } from './cloze/parse-cloze';

/** Mensajes de validación de la tarjeta: los pinta el formulario (vía su copy). */
export const CARD_FORM_MESSAGES = {
  frontRequired: 'El anverso es obligatorio.',
  backRequired: 'El reverso es obligatorio.',
  clozeRequired: 'Escribe un texto con al menos un hueco marcado con {{…}}.',
  tooLong: 'Usa como máximo 2000 caracteres.',
} as const;

const copy = CARD_FORM_MESSAGES;
/** Máximo de anverso, reverso y ejemplo (formulario e importación). */
export const MAX_CARD_TEXT = 2000;
const MAX_TEXT = MAX_CARD_TEXT;

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
