import type { QuizQuestion } from './generate-quiz';
import { isWrittenAnswerCorrect } from './written-answer';

export interface PracticeAnswer {
  readonly chosen: string;
  readonly correct: boolean;
}

// El estado de una práctica, sin Angular: cada función devuelve un estado nuevo (o el mismo, si la
// acción no aplica), así una señal detecta el cambio y las reglas se prueban sin pantalla.
export interface PracticeState {
  readonly questions: readonly QuizQuestion[];
  readonly index: number;
  /** Por id de pregunta: lo elegido o escrito y si acertó. */
  readonly answers: ReadonlyMap<string, PracticeAnswer>;
  readonly status: 'active' | 'finished';
}

export function startPractice(questions: readonly QuizQuestion[]): PracticeState {
  return { questions, index: 0, answers: new Map(), status: 'active' };
}

export function currentQuestion(state: PracticeState): QuizQuestion | undefined {
  return state.questions[state.index];
}

export function currentAnswer(state: PracticeState): PracticeAnswer | undefined {
  const question = currentQuestion(state);
  return question ? state.answers.get(question.id) : undefined;
}

/**
 * Responde la pregunta actual una sola vez: opción múltiple por igualdad exacta con la respuesta,
 * escribir con la comparación tolerante. Respondida o terminada la práctica, no cambia nada.
 */
export function answerCurrent(state: PracticeState, chosen: string): PracticeState {
  const question = currentQuestion(state);
  if (state.status === 'finished' || !question || state.answers.has(question.id)) {
    return state;
  }
  const correct =
    question.type === 'multiple-choice'
      ? chosen === question.answer
      : isWrittenAnswerCorrect(chosen, question.answer);
  const answers = new Map(state.answers).set(question.id, { chosen, correct });
  return { ...state, answers };
}

/** Pasa a la siguiente solo si la actual está respondida; desde la última, termina. */
export function advance(state: PracticeState): PracticeState {
  if (state.status === 'finished' || !currentAnswer(state)) {
    return state;
  }
  return isLast(state) ? { ...state, status: 'finished' } : { ...state, index: state.index + 1 };
}

export function isLast(state: PracticeState): boolean {
  return state.index === state.questions.length - 1;
}

/** Respondidas sobre el total: al responder la última llega a 1. */
export function progress(state: PracticeState): number {
  return state.questions.length === 0 ? 0 : state.answers.size / state.questions.length;
}

export function score(state: PracticeState): number {
  return [...state.answers.values()].filter((answer) => answer.correct).length;
}
