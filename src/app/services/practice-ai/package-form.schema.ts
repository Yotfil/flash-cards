import { z } from 'zod';

import { bookFormSchema } from '@services/books/book-form.schema';

// El nombre de un paquete sigue la regla del de un libro: obligatorio tras recortar, hasta 120.
export const packageFormSchema = z.object({ name: bookFormSchema.shape.name });

export type PackageFormValue = z.input<typeof packageFormSchema>;
