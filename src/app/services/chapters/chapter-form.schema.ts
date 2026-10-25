import { z } from 'zod';

import { bookFormSchema } from '@services/books/book-form.schema';

// El capítulo solo tiene nombre, con la misma regla que el libro (recortado, obligatorio, 120).
export const chapterFormSchema = z.object({
  name: bookFormSchema.shape.name,
});

export type ChapterFormValue = z.input<typeof chapterFormSchema>;
