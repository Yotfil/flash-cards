import { z } from 'zod';

/** Mensajes de validación del libro: los pinta el formulario (vía su copy) y los usa la importación. */
export const BOOK_FORM_MESSAGES = {
  nameRequired: 'El nombre es obligatorio.',
  nameTooLong: 'Usa como máximo 120 caracteres.',
} as const;

/** Máximo del nombre de un libro o de un capítulo. */
export const MAX_NAME_LENGTH = 120;

// Identidad del libro: nombre obligatorio y materia libre (vacía → "general" al guardar). Sin
// dirección de estudio: al crear siempre es "anverso → reverso" y al editar se conserva.
export const bookFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: BOOK_FORM_MESSAGES.nameRequired })
    .max(MAX_NAME_LENGTH, { error: BOOK_FORM_MESSAGES.nameTooLong }),
  subject: z.string().trim(),
});

export type BookFormValue = z.input<typeof bookFormSchema>;
