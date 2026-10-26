import type { Card } from '@domain/models/card.model';
import { normalizeCardText } from '@services/cards/normalize-card-text';

export type QuizQuestionType = 'multiple-choice' | 'written';

export interface QuizQuestion {
  /** Único dentro de la práctica (la pregunta escrita vacía su campo al cambiar). */
  readonly id: string;
  readonly cardId: string;
  readonly type: QuizQuestionType;
  /** Lo que se pregunta: el anverso. */
  readonly prompt: string;
  /** La respuesta correcta: el reverso. */
  readonly answer: string;
  /** Solo en opción múltiple: la respuesta y tres distractores, barajados. */
  readonly options?: readonly string[];
}

export interface GenerateQuizOptions {
  /** De dónde salen los distractores (por defecto, las mismas tarjetas). */
  readonly pool?: readonly Card[];
  /** Fuente de azar, inyectable para pruebas deterministas. */
  readonly random?: () => number;
  readonly maxQuestions?: number;
}

const MAX_QUESTIONS = 10;
const DISTRACTORS = 3;

/**
 * Un mini-quiz con las tarjetas elegibles: barajadas, hasta 10. Las posiciones impares (1.ª, 3.ª…)
 * son de opción múltiple y las pares de escribir; si no hay 3 distractores, cae a escribir, que
 * siempre es posible. Los distractores son reversos distintos del pool (dos reversos iguales tras
 * normalizar cuentan como uno).
 */
export function generateQuiz(
  cards: readonly Card[],
  options: GenerateQuizOptions = {},
): QuizQuestion[] {
  const random = options.random ?? Math.random;
  const answers = distinctAnswers(options.pool ?? cards);
  return shuffle(cards, random)
    .slice(0, options.maxQuestions ?? MAX_QUESTIONS)
    .map((card, index) => {
      const base = {
        id: `${index + 1}-${card.id}`,
        cardId: card.id,
        prompt: card.front,
        answer: card.back,
      };
      const distractors = pickDistractors(answers, card.back, random);
      const isOddPosition = index % 2 === 0;
      if (isOddPosition && distractors.length === DISTRACTORS) {
        return {
          ...base,
          type: 'multiple-choice' as const,
          options: shuffle([card.back, ...distractors], random),
        };
      }
      return { ...base, type: 'written' as const };
    });
}

/** Reversos distintos tras normalizar; de cada grupo se queda el texto de la primera aparición. */
function distinctAnswers(cards: readonly Card[]): string[] {
  const seen = new Set<string>();
  const answers: string[] = [];
  for (const card of cards) {
    const key = normalizeCardText(card.back);
    if (key !== '' && !seen.has(key)) {
      seen.add(key);
      answers.push(card.back);
    }
  }
  return answers;
}

function pickDistractors(answers: readonly string[], correct: string, random: () => number) {
  const correctKey = normalizeCardText(correct);
  const candidates = answers.filter((answer) => normalizeCardText(answer) !== correctKey);
  return shuffle(candidates, random).slice(0, DISTRACTORS);
}

/** Fisher-Yates sobre una copia. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
  }
  return copy;
}
