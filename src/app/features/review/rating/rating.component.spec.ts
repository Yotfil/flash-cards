import { TestBed } from '@angular/core/testing';

import { type CardScheduling, CardState, type Rating } from '@domain/models';
import type { RatingOutcome } from '@domain/ports';
import { RatingComponent } from './rating.component';

const SCHEDULING: CardScheduling = {
  due: new Date(),
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

function outcome(intervalDays: number): RatingOutcome {
  return {
    scheduling: SCHEDULING,
    intervalDays,
    log: {
      state: CardState.New,
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      lastElapsedDays: 0,
      scheduledDays: intervalDays,
    },
  };
}

describe('RatingComponent', () => {
  it('se crea', () => {
    const previews: Record<Rating, RatingOutcome> = {
      1: outcome(0),
      2: outcome(1),
      3: outcome(3),
      4: outcome(7),
    };
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('previews', previews);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
