// Adaptador del puerto SchedulingPort con ts-fsrs. ÚNICO punto del código que conoce la librería de
// repetición espaciada (contrato: "ts-fsrs entra como adaptador detrás de una interfaz"). Traduce
// entre el `Card` de ts-fsrs (snake_case) y nuestro `CardScheduling` (camelCase), y entre el `Rating`
// de ts-fsrs (1=Again … 4=Easy) y nuestro grado 1-4 (mismos valores numéricos).

import { Injectable } from '@angular/core';
import {
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  type State,
  createEmptyCard,
  fsrs,
} from 'ts-fsrs';

import { type RatingOutcome, SchedulingPort } from '@domain/ports';
import { type CardScheduling, CardState, type Rating } from '@domain/models';

const RATINGS: Rating[] = [1, 2, 3, 4];

@Injectable()
export class TsFsrsSchedulingAdapter extends SchedulingPort {
  // Parámetros por defecto de ts-fsrs (los personalizados por usuario son un feature futuro).
  private readonly scheduler: FSRS = fsrs();

  override createInitialScheduling(now: Date = new Date()): CardScheduling {
    return this.toScheduling(createEmptyCard(now));
  }

  override schedule(
    scheduling: CardScheduling,
    now: Date = new Date(),
  ): Record<Rating, RatingOutcome> {
    const recordLog = this.scheduler.repeat(this.toFsrsCard(scheduling), now);

    const outcomes = {} as Record<Rating, RatingOutcome>;
    for (const rating of RATINGS) {
      const item = recordLog[rating as unknown as Grade];
      outcomes[rating] = {
        scheduling: this.toScheduling(item.card),
        intervalDays: item.card.scheduled_days,
        log: {
          state: item.log.state.valueOf() as CardState,
          due: item.log.due,
          stability: item.log.stability,
          difficulty: item.log.difficulty,
          elapsedDays: item.log.elapsed_days,
          lastElapsedDays: item.log.last_elapsed_days,
          scheduledDays: item.log.scheduled_days,
        },
      };
    }
    return outcomes;
  }

  /** Nuestro `CardScheduling` → `Card` de ts-fsrs. */
  private toFsrsCard(scheduling: CardScheduling): FsrsCard {
    const card: FsrsCard = {
      due: scheduling.due,
      stability: scheduling.stability,
      difficulty: scheduling.difficulty,
      elapsed_days: scheduling.elapsedDays,
      scheduled_days: scheduling.scheduledDays,
      learning_steps: scheduling.learningSteps,
      reps: scheduling.reps,
      lapses: scheduling.lapses,
      state: scheduling.state.valueOf() as State,
    };
    if (scheduling.lastReview !== null) {
      card.last_review = scheduling.lastReview;
    }
    return card;
  }

  /** `Card` de ts-fsrs → nuestro `CardScheduling`. */
  private toScheduling(card: FsrsCard): CardScheduling {
    return {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      learningSteps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      // El `State` de ts-fsrs y nuestro `CardState` comparten valores numéricos (0..3).
      state: card.state.valueOf() as CardState,
      lastReview: card.last_review ?? null,
    };
  }
}
