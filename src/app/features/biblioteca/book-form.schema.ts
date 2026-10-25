import { z } from 'zod';

import { BIBLIOTECA_COPY } from './biblioteca.copy';

// Identidad del libro: nombre obligatorio y materia libre (vacía → "general" al guardar). Sin
// dirección de estudio: al crear siempre es "anverso → reverso" y al editar se conserva.
export const bookFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: BIBLIOTECA_COPY.bookForm.nameRequired })
    .max(120, { error: BIBLIOTECA_COPY.bookForm.nameTooLong }),
  subject: z.string().trim(),
});

export type BookFormValue = z.input<typeof bookFormSchema>;
