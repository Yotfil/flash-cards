import type { CardScheduling, CardState } from '../models/card.model';
import type { Rating } from '../models/rating';

/** Valores previos del repaso que se guardan en el historial junto al grado elegido. */
export interface SchedulingLogValues {
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
}

/** Lo que pasaría si la tarjeta se califica con un grado en un instante dado. */
export interface SchedulingPreview {
  /** El nuevo bloque de programación completo, con último repaso igual al instante recibido. */
  scheduling: CardScheduling;
  /** Días enteros programados: 0 mientras la tarjeta vence en minutos (aprendizaje). */
  intervalDays: number;
  /** Vencimiento exacto, para mostrar minutos y horas. */
  due: Date;
  log: SchedulingLogValues;
}

// Frontera única con el algoritmo de programación (ts-fsrs entra como adaptador). Una sola
// operación pura: los cuatro resultados posibles. `now` es obligatorio para que quien llama decida
// el instante: al mostrar la tarjeta (previsualización informativa) o al calificar (lo que se
// guarda). El estado inicial no está aquí: vive en el dominio (`initialCardScheduling`).
export abstract class SchedulingPort {
  abstract preview(scheduling: CardScheduling, now: Date): Record<Rating, SchedulingPreview>;
}
