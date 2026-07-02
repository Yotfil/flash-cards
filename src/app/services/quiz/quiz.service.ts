// Orquesta una sesión de práctica (mini-quiz). Carga las tarjetas de un capítulo, genera el quiz con
// la lógica pura y lleva el progreso/puntaje por signals. Es práctica APARTE: no toca el scheduling
// FSRS ni escribe reviewLogs/dailyStats. No conoce Firestore (usa el puerto CardRepository).

import { Injectable, computed, inject, signal } from '@angular/core';

import { CardRepository } from '@domain/ports';
import type { User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { requireSessionUser } from '@services/session';
import { type QuizQuestion, generateQuiz } from './generate-quiz';
import { isWrittenAnswerCorrect } from './written-answer';

export type QuizStatus = 'idle' | 'active' | 'finished';

/** Largo de un mini-quiz: corto a propósito (es práctica ligera, no una sesión completa). */
export const DEFAULT_QUIZ_LENGTH = 10;

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly cardRepository = inject(CardRepository);
  private readonly authService = inject(AuthService);

  private readonly statusSignal = signal<QuizStatus>('idle');
  private readonly questionsSignal = signal<QuizQuestion[]>([]);
  private readonly indexSignal = signal(0);
  private readonly answeredSignal = signal(false);
  private readonly lastCorrectSignal = signal<boolean | null>(null);
  private readonly lastAnswerSignal = signal<string | null>(null);
  private readonly correctCountSignal = signal(0);
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly answered = this.answeredSignal.asReadonly();
  readonly lastCorrect = this.lastCorrectSignal.asReadonly();
  readonly lastAnswer = this.lastAnswerSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();
  readonly current = computed<QuizQuestion | null>(
    () => this.questionsSignal()[this.indexSignal()] ?? null,
  );
  readonly total = computed(() => this.questionsSignal().length);
  readonly position = computed(() => Math.min(this.indexSignal() + 1, this.total()));
  readonly summary = computed(() => ({ correct: this.correctCountSignal(), total: this.total() }));

  /** Arranca un quiz con las tarjetas del capítulo. Devuelve cuántas preguntas hay (0 = no entrar). */
  async startChapter(chapterId: string): Promise<number> {
    this.errorMessageSignal.set(null);
    let questions: QuizQuestion[];
    try {
      const cards = await this.cardRepository.listByChapter(this.requireUser().id, chapterId);
      questions = generateQuiz(cards, { count: DEFAULT_QUIZ_LENGTH });
    } catch (error) {
      console.error('No se pudieron cargar las tarjetas para practicar', error);
      this.errorMessageSignal.set('No se pudieron cargar las tarjetas.');
      return 0;
    }
    if (questions.length === 0) {
      return 0;
    }
    this.questionsSignal.set(questions);
    this.indexSignal.set(0);
    this.correctCountSignal.set(0);
    this.resetAnswer();
    this.statusSignal.set('active');
    return questions.length;
  }

  /** Responde la pregunta de opción múltiple actual con la opción elegida. */
  answerMultiple(option: string): void {
    const question = this.current();
    if (question === null || this.answeredSignal()) {
      return;
    }
    this.record(option === question.answer, option);
  }

  /** Responde la pregunta de escribir actual con lo tecleado (comparación tolerante). */
  answerWritten(input: string): void {
    const question = this.current();
    if (question === null || this.answeredSignal()) {
      return;
    }
    this.record(isWrittenAnswerCorrect(input, question.answer), input.trim());
  }

  /** Avanza a la siguiente pregunta; al terminar deja la sesión en `finished`. */
  next(): void {
    if (!this.answeredSignal()) {
      return;
    }
    const nextIndex = this.indexSignal() + 1;
    if (nextIndex >= this.total()) {
      this.statusSignal.set('finished');
      return;
    }
    this.indexSignal.set(nextIndex);
    this.resetAnswer();
  }

  private record(correct: boolean, answer: string): void {
    this.answeredSignal.set(true);
    this.lastCorrectSignal.set(correct);
    this.lastAnswerSignal.set(answer);
    if (correct) {
      this.correctCountSignal.update((value) => value + 1);
    }
  }

  private resetAnswer(): void {
    this.answeredSignal.set(false);
    this.lastCorrectSignal.set(null);
    this.lastAnswerSignal.set(null);
  }

  private requireUser(): User {
    return requireSessionUser(this.authService.currentUser());
  }
}
