import { Injectable, computed, signal } from '@angular/core';

import type { PracticeOrigin, PreparedPractice } from './practice-handoff.service';
import {
  advance,
  answerCurrent,
  currentAnswer,
  currentQuestion,
  isLast,
  progress,
  score,
  startPractice,
  type PracticeState,
} from './practice-state';

/** Lo que se ve tras responder: si acertó, la respuesta correcta y lo elegido o escrito. */
export interface PracticeFeedback {
  readonly correct: boolean;
  /** La opción buena (la que se resalta en opción múltiple). */
  readonly answer: string;
  readonly chosen: string;
  /** Lo que nombra el fallo: al escribir, todas las acepciones; en opción múltiple, la mostrada. */
  readonly correctAnswers: readonly string[];
}

// La práctica en curso, efímera: vive mientras la pantalla está abierta y no lee ni escribe nada
// (no tiene repositorios: practicar no toca la programación, el historial ni el día). Cada
// `start` empieza de cero.
@Injectable({ providedIn: 'root' })
export class PracticeSessionService {
  private readonly state = signal<PracticeState | null>(null);
  private readonly originSignal = signal<PracticeOrigin | null>(null);
  readonly origin = this.originSignal.asReadonly();

  readonly current = computed(() => {
    const state = this.state();
    return state ? currentQuestion(state) : undefined;
  });
  readonly position = computed(() => (this.state()?.index ?? -1) + 1);
  readonly total = computed(() => this.state()?.questions.length ?? 0);
  readonly progress = computed(() => {
    const state = this.state();
    return state ? progress(state) : 0;
  });
  readonly score = computed(() => {
    const state = this.state();
    return state ? score(state) : 0;
  });
  readonly isLast = computed(() => {
    const state = this.state();
    return state ? isLast(state) : false;
  });
  readonly finished = computed(() => this.state()?.status === 'finished');
  readonly feedback = computed<PracticeFeedback | null>(() => {
    const state = this.state();
    const question = this.current();
    const answer = state ? currentAnswer(state) : undefined;
    if (!question || !answer) {
      return null;
    }
    return {
      correct: answer.correct,
      answer: question.answer,
      chosen: answer.chosen,
      correctAnswers: question.type === 'written' ? question.acceptedAnswers : [question.answer],
    };
  });

  start(prepared: PreparedPractice): void {
    this.state.set(startPractice(prepared.questions));
    this.originSignal.set(prepared.origin);
  }

  answer(chosen: string): void {
    this.update((state) => answerCurrent(state, chosen));
  }

  advance(): void {
    this.update(advance);
  }

  reset(): void {
    this.state.set(null);
    this.originSignal.set(null);
  }

  private update(change: (state: PracticeState) => PracticeState): void {
    const state = this.state();
    if (state) {
      this.state.set(change(state));
    }
  }
}
