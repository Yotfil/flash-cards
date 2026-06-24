// Generación de un mini-quiz a partir de las tarjetas de un capítulo. Pura y testeable (el "cerebro"
// del modo Practicar). Sin IA: arma preguntas con lógica local. Es una modalidad de práctica aparte;
// NO toca la programación FSRS ni los reviewLogs.
//
// Tipos de pregunta: opción múltiple (anverso → la respuesta correcta + distractores de otras
// tarjetas) y escribir (teclear la respuesta). Sólo entran tarjetas básicas con anverso y reverso;
// las cloze se omiten por ahora.

import type { Card } from '@domain/models';
import { normalizeAnswer } from './written-answer';

export type QuizQuestionType = 'multiple-choice' | 'written';

export interface QuizQuestion {
  cardId: string;
  type: QuizQuestionType;
  /** Lo que se muestra (el anverso de la tarjeta). */
  prompt: string;
  /** Respuesta correcta (el reverso). */
  answer: string;
  /** Opciones barajadas (incluye la respuesta) en opción múltiple; vacío en escribir. */
  options: string[];
}

export interface GenerateQuizOptions {
  /** Máximo de preguntas; por defecto, todas las elegibles. */
  count?: number;
  /** Fuente de aleatoriedad, inyectable para tests deterministas. */
  random?: () => number;
}

const DISTRACTORS_PER_QUESTION = 3;

/** Baraja una copia del arreglo (Fisher-Yates) con la fuente de aleatoriedad dada. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** Respuestas distintas (por texto normalizado), conservando el texto original de la primera. */
function uniqueAnswers(answers: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const answer of answers) {
    const key = normalizeAnswer(answer);
    if (key !== '' && !seen.has(key)) {
      seen.add(key);
      result.push(answer);
    }
  }
  return result;
}

/** Toma hasta `n` distractores distintos de la respuesta correcta, barajados. */
function pickDistractors(
  distinctAnswers: string[],
  correct: string,
  n: number,
  random: () => number,
): string[] {
  const correctKey = normalizeAnswer(correct);
  const candidates = distinctAnswers.filter((answer) => normalizeAnswer(answer) !== correctKey);
  return shuffle(candidates, random).slice(0, n);
}

/**
 * Arma el quiz. Mezcla los dos tipos alternando por posición; si una pregunta no tiene suficientes
 * distractores para opción múltiple, cae a "escribir" (que siempre es posible).
 */
export function generateQuiz(cards: Card[], options: GenerateQuizOptions = {}): QuizQuestion[] {
  const random = options.random ?? Math.random;
  const eligible = cards.filter(
    (card) => card.cardType !== 'cloze' && card.front.trim() !== '' && card.back.trim() !== '',
  );
  if (eligible.length === 0) {
    return [];
  }

  const distinctAnswers = uniqueAnswers(eligible.map((card) => card.back.trim()));
  const ordered = shuffle(eligible, random);
  const limited =
    options.count !== undefined ? ordered.slice(0, Math.max(0, options.count)) : ordered;

  return limited.map((card, index) => {
    const answer = card.back.trim();
    const prompt = card.front.trim();
    const distractors = pickDistractors(distinctAnswers, answer, DISTRACTORS_PER_QUESTION, random);
    const canMultiple = distractors.length === DISTRACTORS_PER_QUESTION;
    // Alterna para mezclar tipos; la opción múltiple sólo si hay distractores suficientes.
    if (index % 2 === 0 && canMultiple) {
      return {
        cardId: card.id,
        type: 'multiple-choice',
        prompt,
        answer,
        options: shuffle([answer, ...distractors], random),
      };
    }
    return { cardId: card.id, type: 'written', prompt, answer, options: [] };
  });
}
