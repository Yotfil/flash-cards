import { z } from 'zod';

// Esquema del formulario de acceso: el mismo para los dos modos porque el nombre es opcional.
// Signal Forms lo usa como validador (`validateStandardSchema`), así no hay reglas duplicadas.
export const authFormSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  displayName: z.string(),
});

export type AuthFormValue = z.infer<typeof authFormSchema>;
