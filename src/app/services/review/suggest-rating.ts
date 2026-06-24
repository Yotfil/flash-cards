// Sugerencia de calificación por velocidad de recuerdo (Fase 2, espec. §12: el tiempo de respuesta
// "se usa para sugerir o asistir la calificación"). Puro y testeable. NO automatiza: sólo propone un
// grado que el usuario confirma o cambia. Nunca propone "Again" (1): un fallo lo declara el usuario,
// porque el tiempo no sabe si acertaste.

import type { Rating } from '@domain/models';

/**
 * Umbrales (ms) de la latencia de recuerdo (desde que se muestra el anverso hasta que se revela la
 * respuesta). Heurística conservadora y tunable; el paso de "confirmar" es la red de seguridad:
 * - hasta {@link VERY_FAST_RECALL_MS}: recuerdo instantáneo → Fácil (4).
 * - hasta {@link SLOW_RECALL_MS}: recuerdo normal → Bien (3).
 * - por encima: costó → Difícil (2).
 */
export const VERY_FAST_RECALL_MS = 1500;
export const SLOW_RECALL_MS = 7000;

/** Sugiere un grado 2-4 según la latencia de recuerdo. Nunca 1 (Again). */
export function suggestRatingByLatency(latencyMs: number): Rating {
  if (latencyMs <= VERY_FAST_RECALL_MS) {
    return 4;
  }
  if (latencyMs <= SLOW_RECALL_MS) {
    return 3;
  }
  return 2;
}
