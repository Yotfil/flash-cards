import { CardState, type CardScheduling } from './card.model';

/**
 * Programación de una tarjeta recién creada: nueva, lista para estudiarse de inmediato y sin
 * historia. Es un registro inicial, no un algoritmo; `programacion-espaciada` comprueba que coincide
 * con la tarjeta vacía de ts-fsrs.
 */
export function initialCardScheduling(now: Date): CardScheduling {
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: null,
  };
}
