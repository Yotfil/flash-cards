import type { Rating } from '@domain/models/rating';

/** Hasta aquí, recordar fue instantáneo: "Fácil". */
export const INSTANT_RECALL_MS = 1500;
/** Hasta aquí, recordar fue normal: "Bien". Más tarde, "Difícil". */
export const NORMAL_RECALL_MS = 7000;

/**
 * Sugerencia de calificación por la latencia de recuerdo (de mostrar el anverso a revelar). Solo
 * resalta una opción; decide el usuario. Nunca sugiere "Otra vez": no recordar no se mide con
 * tiempo.
 */
export function suggestRatingByLatency(latencyMs: number): Rating {
  if (latencyMs <= INSTANT_RECALL_MS) {
    return 4;
  }
  return latencyMs <= NORMAL_RECALL_MS ? 3 : 2;
}
