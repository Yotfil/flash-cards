import type { Card } from '@domain/models/card.model';
import { normalizeCardText } from '@services/cards/normalize-card-text';

export type QuizQuestionType = 'multiple-choice' | 'written';

export interface QuizQuestion {
  /** Único dentro de la práctica (la pregunta escrita vacía su campo al cambiar). */
  readonly id: string;
  /** La primera tarjeta del anverso (una pregunta puede reunir varias). */
  readonly cardId: string;
  readonly type: QuizQuestionType;
  /** Lo que se pregunta: el anverso. */
  readonly prompt: string;
  /** La respuesta que se muestra como correcta: en opción múltiple, la opción buena. */
  readonly answer: string;
  /** Todos los reversos del anverso: al escribir vale cualquiera. */
  readonly acceptedAnswers: readonly string[];
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

/** Las tarjetas de un mismo anverso normalizado: una sola pregunta con todos sus reversos. */
interface FrontGroup {
  readonly frontKey: string;
  readonly cardId: string;
  readonly prompt: string;
  /** Reversos distintos tras normalizar, con el texto de su primera aparición. */
  readonly answers: [string, ...string[]];
}

const MAX_QUESTIONS = 10;
const DISTRACTORS = 3;

/**
 * Un mini-quiz con las tarjetas elegibles: una pregunta por anverso (las acepciones de "bank" y
 * las tarjetas repetidas no se preguntan dos veces), barajadas, hasta 10. Las posiciones impares
 * (1.ª, 3.ª…) son de opción múltiple y las pares de escribir; si no hay 3 distractores, cae a
 * escribir, que siempre es posible. En opción múltiple sale una acepción al azar como correcta y
 * ningún otro reverso del mismo anverso sirve de distractor. Los distractores son reversos
 * distintos del pool (dos reversos iguales tras normalizar cuentan como uno).
 */
export function generateQuiz(
  cards: readonly Card[],
  options: GenerateQuizOptions = {},
): QuizQuestion[] {
  const random = options.random ?? Math.random;
  const pool = options.pool ?? cards;
  const poolAnswers = distinctAnswers(pool);
  return shuffle(groupByFront(cards), random)
    .slice(0, options.maxQuestions ?? MAX_QUESTIONS)
    .map((group, index) => {
      const base = {
        id: `${index + 1}-${group.cardId}`,
        cardId: group.cardId,
        prompt: group.prompt,
        acceptedAnswers: group.answers,
      };
      const distractors = pickDistractors(poolAnswers, sameFrontAnswerKeys(group, pool), random);
      const isOddPosition = index % 2 === 0;
      if (isOddPosition && distractors.length === DISTRACTORS) {
        const answer = pickOne(group.answers, random);
        return {
          ...base,
          type: 'multiple-choice' as const,
          answer,
          options: shuffle([answer, ...distractors], random),
        };
      }
      return { ...base, type: 'written' as const, answer: group.answers[0] };
    });
}

/** Agrupa por anverso normalizado, en el orden de la primera aparición de cada anverso. */
function groupByFront(cards: readonly Card[]): FrontGroup[] {
  const groups = new Map<string, FrontGroup>();
  for (const card of cards) {
    const frontKey = normalizeCardText(card.front);
    const group = groups.get(frontKey);
    if (!group) {
      groups.set(frontKey, { frontKey, cardId: card.id, prompt: card.front, answers: [card.back] });
    } else if (!group.answers.some((answer) => sameText(answer, card.back))) {
      group.answers.push(card.back);
    }
  }
  return [...groups.values()];
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

/** Los reversos que no pueden ser distractores: los del mismo anverso, también en el pool. */
function sameFrontAnswerKeys(group: FrontGroup, pool: readonly Card[]): Set<string> {
  const keys = new Set(group.answers.map(normalizeCardText));
  for (const card of pool) {
    if (normalizeCardText(card.front) === group.frontKey) {
      keys.add(normalizeCardText(card.back));
    }
  }
  return keys;
}

function pickDistractors(
  answers: readonly string[],
  excludedKeys: ReadonlySet<string>,
  random: () => number,
): string[] {
  const candidates = answers.filter((answer) => !excludedKeys.has(normalizeCardText(answer)));
  return shuffle(candidates, random).slice(0, DISTRACTORS);
}

function pickOne(items: readonly [string, ...string[]], random: () => number): string {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function sameText(a: string, b: string): boolean {
  return normalizeCardText(a) === normalizeCardText(b);
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
