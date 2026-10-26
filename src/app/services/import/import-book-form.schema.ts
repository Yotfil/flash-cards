import { z } from 'zod';

import { BOOK_FORM_MESSAGES, MAX_NAME_LENGTH } from '@services/books/book-form.schema';

// Formulario "Importar un libro": las reglas de "Nuevo libro", salvo que el nombre puede quedar
// vacío (el libro se llamará "Libro importado"). La materia es libre y opcional, como allí.
export const importBookFormSchema = z.object({
  name: z.string().trim().max(MAX_NAME_LENGTH, { error: BOOK_FORM_MESSAGES.nameTooLong }),
  subject: z.string().trim(),
});

export type ImportBookFormValue = z.input<typeof importBookFormSchema>;
