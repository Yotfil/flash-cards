// Puerto de programación (scheduling): la frontera ÚNICA tras la que vive el algoritmo de
// repetición espaciada. El dominio pide estado inicial y resultados de calificación sin saber que
// detrás está ts-fsrs. La implementación vive en `infrastructure/scheduling`.

import type { CardScheduling, CardState, Rating } from '../models';

/**
 * Datos del repaso tal como los calcula el algoritmo, para guardarlos en `reviewLogs`. Reflejan el
 * estado/valores en el momento de calificar (espejo del log de ts-fsrs).
 */
export interface SchedulingLog {
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
}

/** Resultado de calificar con un grado concreto: nuevo estado, log y el intervalo (días) al próximo due. */
export interface RatingOutcome {
  scheduling: CardScheduling;
  log: SchedulingLog;
  intervalDays: number;
}

export abstract class SchedulingPort {
  /** Estado de programación de una tarjeta recién creada (estado New, vencimiento inmediato). */
  abstract createInitialScheduling(now?: Date): CardScheduling;

  /**
   * Calcula, para los cuatro grados (1=Again … 4=Easy), el resultado de calificar la tarjeta. La UI
   * usa los intervalos para la previsualización y, al elegir un grado, persiste su `scheduling`/`log`.
   */
  abstract schedule(scheduling: CardScheduling, now?: Date): Record<Rating, RatingOutcome>;
}
