import { type Card, CardState } from '@domain/models';
import { generateQuiz } from './generate-quiz';

function buildCard(id: string, front: string, back: string, cardType?: 'cloze'): Card {
  return {
    id,
    bookId: 'b',
    chapterId: 'c',
    noteId: id,
    direction: 'forward',
    ...(cardType ? { cardType } : {}),
    front,
    back,
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduling: {
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
    },
  };
}

// Aleatoriedad fija para tests deterministas.
const noShuffle = (): number => 0;

const sixCards: Card[] = [
  buildCard('1', 'one', 'uno'),
  buildCard('2', 'two', 'dos'),
  buildCard('3', 'three', 'tres'),
  buildCard('4', 'four', 'cuatro'),
  buildCard('5', 'five', 'cinco'),
  buildCard('6', 'six', 'seis'),
];

describe('generateQuiz', () => {
  it('sin tarjetas devuelve un quiz vacío', () => {
    expect(generateQuiz([], { random: noShuffle })).toEqual([]);
  });

  it('ignora las tarjetas cloze (sólo entran las básicas con anverso y reverso)', () => {
    const cards = [buildCard('c1', 'El {{gato}}', '', 'cloze'), buildCard('b1', 'sun', 'sol')];
    const quiz = generateQuiz(cards, { random: noShuffle });

    expect(quiz).toHaveLength(1);
    expect(quiz[0]?.cardId).toBe('b1');
  });

  it('alterna tipos: la opción múltiple lleva 4 opciones distintas con la respuesta incluida', () => {
    const quiz = generateQuiz(sixCards, { random: noShuffle });
    const backs = sixCards.map((card) => card.back);

    expect(quiz).toHaveLength(6);

    const multiple = quiz[0];
    expect(multiple?.type).toBe('multiple-choice');
    expect(multiple?.options).toHaveLength(4);
    expect(multiple?.options).toContain(multiple?.answer);
    expect(new Set(multiple?.options).size).toBe(4); // sin repetidos
    for (const option of multiple?.options ?? []) {
      expect(backs).toContain(option); // los distractores son reversos reales
    }

    const written = quiz[1];
    expect(written?.type).toBe('written');
    expect(written?.options).toEqual([]);
  });

  it('cae a "escribir" cuando no hay distractores suficientes', () => {
    const quiz = generateQuiz([buildCard('1', 'a', 'uno'), buildCard('2', 'b', 'dos')], {
      random: noShuffle,
    });

    expect(quiz.every((question) => question.type === 'written')).toBe(true);
  });

  it('respeta el tope de preguntas', () => {
    expect(generateQuiz(sixCards, { count: 3, random: noShuffle })).toHaveLength(3);
  });
});
