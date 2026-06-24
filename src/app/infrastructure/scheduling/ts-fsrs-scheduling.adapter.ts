// Adaptador del puerto SchedulingPort con ts-fsrs. ÚNICO punto del código que conoce la librería de
// repetición espaciada (contrato: "ts-fsrs entra como adaptador detrás de una interfaz"). Traduce
// entre el `Card` de ts-fsrs (snake_case) y nuestro `CardScheduling` (camelCase).

import { Injectable } from '@angular/core';
import { createEmptyCard } from 'ts-fsrs';

import { SchedulingPort } from '@domain/ports';
import { type CardScheduling, CardState } from '@domain/models';

@Injectable()
export class TsFsrsSchedulingAdapter extends SchedulingPort {
  override createInitialScheduling(now: Date = new Date()): CardScheduling {
    const emptyCard = createEmptyCard(now);
    return {
      due: emptyCard.due,
      stability: emptyCard.stability,
      difficulty: emptyCard.difficulty,
      elapsedDays: emptyCard.elapsed_days,
      scheduledDays: emptyCard.scheduled_days,
      reps: emptyCard.reps,
      lapses: emptyCard.lapses,
      // El `State` de ts-fsrs y nuestro `CardState` comparten valores numéricos (0..3) pero son
      // enums distintos; se coacciona por su valor numérico.
      state: emptyCard.state.valueOf() as CardState,
      lastReview: emptyCard.last_review ?? null,
    };
  }
}
