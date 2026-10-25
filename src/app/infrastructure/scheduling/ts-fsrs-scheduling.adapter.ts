import {
  Rating as FsrsRating,
  State,
  fsrs,
  type Card as FsrsCard,
  type RecordLogItem,
} from 'ts-fsrs';

import { CardState, type CardScheduling } from '@domain/models/card.model';
import type { Rating } from '@domain/models/rating';
import { SchedulingPort, type SchedulingPreview } from '@domain/ports/scheduling.port';

// Adaptador de ts-fsrs al puerto de programación. Sin Angular (no inyecta nada): sus pruebas son
// funciones puras con fechas fijas. Usa los parámetros por defecto de la librería, que vigila
// `tests/static/ts-fsrs-defaults.spec.ts`.
export class TsFsrsSchedulingAdapter extends SchedulingPort {
  private readonly scheduler = fsrs();

  preview(scheduling: CardScheduling, now: Date): Record<Rating, SchedulingPreview> {
    const outcomes = this.scheduler.repeat(toFsrsCard(scheduling), now);
    return {
      1: toPreview(outcomes[FsrsRating.Again]),
      2: toPreview(outcomes[FsrsRating.Hard]),
      3: toPreview(outcomes[FsrsRating.Good]),
      4: toPreview(outcomes[FsrsRating.Easy]),
    };
  }
}

function toPreview({ card, log }: RecordLogItem): SchedulingPreview {
  return {
    scheduling: toCardScheduling(card),
    intervalDays: card.scheduled_days,
    due: card.due,
    log: {
      state: TO_CARD_STATE[log.state],
      due: log.due,
      stability: log.stability,
      difficulty: log.difficulty,
      // ts-fsrs anuncia que la 6.0 retira estos dos campos del historial: si deja de darlos, se
      // calculan aquí desde `lastReview` y el instante; el dominio no cambia.
      elapsedDays: log.elapsed_days,
      lastElapsedDays: log.last_elapsed_days,
      scheduledDays: log.scheduled_days,
    },
  };
}

// Traducción entre el bloque de programación del dominio (camelCase, `lastReview: null`) y la
// tarjeta de ts-fsrs (snake_case, `last_review` ausente). Los estados valen lo mismo en ambos
// lados, pero son enums distintos: se traducen por tabla para no depender de esa coincidencia.
const TO_CARD_STATE: Record<State, CardState> = {
  [State.New]: CardState.New,
  [State.Learning]: CardState.Learning,
  [State.Review]: CardState.Review,
  [State.Relearning]: CardState.Relearning,
};

const TO_FSRS_STATE: Record<CardState, State> = {
  [CardState.New]: State.New,
  [CardState.Learning]: State.Learning,
  [CardState.Review]: State.Review,
  [CardState.Relearning]: State.Relearning,
};

export function toCardScheduling(card: FsrsCard): CardScheduling {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: TO_CARD_STATE[card.state],
    lastReview: card.last_review ?? null,
  };
}

export function toFsrsCard(scheduling: CardScheduling): FsrsCard {
  const card: FsrsCard = {
    due: scheduling.due,
    stability: scheduling.stability,
    difficulty: scheduling.difficulty,
    elapsed_days: scheduling.elapsedDays,
    scheduled_days: scheduling.scheduledDays,
    learning_steps: scheduling.learningSteps,
    reps: scheduling.reps,
    lapses: scheduling.lapses,
    state: TO_FSRS_STATE[scheduling.state],
  };
  if (scheduling.lastReview) {
    card.last_review = scheduling.lastReview;
  }
  return card;
}
