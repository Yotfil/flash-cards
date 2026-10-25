import { z } from 'zod';

/**
 * Entero obligatorio entre `min` y `max`, con un único mensaje para cualquier fallo (vacío, con
 * decimales o fuera de rango): el usuario solo necesita saber qué escribir. Un campo numérico
 * vacío llega como `NaN` y también falla.
 */
export function boundedInteger(min: number, max: number, message: string) {
  return z
    .number({ error: message })
    .int({ error: message })
    .min(min, { error: message })
    .max(max, { error: message });
}
