// Puerto de programación (scheduling): la frontera ÚNICA tras la que vive el algoritmo de
// repetición espaciada. El dominio pide "dame el estado inicial de una tarjeta nueva" sin saber que
// detrás está ts-fsrs. La implementación vive en `infrastructure/scheduling`. En F1.5 (repaso) este
// puerto se amplía con el método que califica una tarjeta y devuelve su nuevo estado.

import type { CardScheduling } from '../models';

export abstract class SchedulingPort {
  /** Estado de programación de una tarjeta recién creada (estado New, vencimiento inmediato). */
  abstract createInitialScheduling(now?: Date): CardScheduling;
}
