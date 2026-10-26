import type { Card } from '@domain/models/card.model';
import { aCard } from '@testing/fake-card-repository';
import { seededRandom } from '@testing/seeded-random';

import { generateQuiz } from './generate-quiz';

const cards = (count: number, prefix = 'k'): Card[] =>
  Array.from({ length: count }, (_, index) =>
    aCard({
      id: `${prefix}${index}`,
      front: `front ${prefix}${index}`,
      back: `back ${prefix}${index}`,
    }),
  );

describe('generateQuiz', () => {
  it('un capítulo grande da 10 preguntas; uno pequeño, todas las que tiene', () => {
    expect(generateQuiz(cards(15), { random: seededRandom(1) })).toHaveLength(10);
    expect(generateQuiz(cards(2), { random: seededRandom(1) })).toHaveLength(2);
  });

  it('con 6 respuestas distintas alterna opción múltiple y escribir, empezando por opción múltiple', () => {
    const quiz = generateQuiz(cards(6), { random: seededRandom(2) });

    expect(quiz.map((question) => question.type)).toEqual([
      'multiple-choice',
      'written',
      'multiple-choice',
      'written',
      'multiple-choice',
      'written',
    ]);
  });

  it('sin 3 distractores, la opción múltiple cae a escribir', () => {
    expect(generateQuiz(cards(2), { random: seededRandom(3) }).map((q) => q.type)).toEqual([
      'written',
      'written',
    ]);
    expect(
      generateQuiz(cards(3), { random: seededRandom(3) }).every((q) => q.type === 'written'),
    ).toBe(true);
  });

  it('cada pregunta lleva el anverso, la respuesta y su tarjeta; opción múltiple con 4 opciones únicas del capítulo', () => {
    const source = cards(8);
    const backs = new Set(source.map((card) => card.back));
    const quiz = generateQuiz(source, { random: seededRandom(4) });

    for (const question of quiz) {
      const card = source.find((candidate) => candidate.id === question.cardId);
      expect(question.prompt).toBe(card?.front);
      expect(question.answer).toBe(card?.back);
    }
    const choices = quiz.filter((question) => question.type === 'multiple-choice');
    expect(choices.length).toBeGreaterThan(0);
    for (const question of choices) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options).toContain(question.answer);
      expect(question.options?.every((option) => backs.has(option))).toBe(true);
    }
    expect(quiz.filter((question) => question.type === 'written').every((q) => !q.options)).toBe(
      true,
    );
  });

  it('"casa" y "CASA" son la misma respuesta al elegir distractores', () => {
    const source = ['casa', 'CASA', 'perro', 'gato'].map((back, index) =>
      aCard({ id: `c${index}`, front: `f${index}`, back }),
    );
    // Tres respuestas distintas: nunca hay 3 distractores.
    expect(
      generateQuiz(source, { random: seededRandom(5) }).every((q) => q.type === 'written'),
    ).toBe(true);

    const withSun = [...source, aCard({ id: 'c4', front: 'f4', back: 'sol' })];
    for (let seed = 1; seed <= 20; seed++) {
      for (const question of generateQuiz(withSun, { random: seededRandom(seed) })) {
        const lowered = (question.options ?? []).map((option) => option.toLowerCase());
        expect(lowered.filter((option) => option === 'casa').length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('los distractores salen de todo el capítulo, también de las tarjetas que no entraron', () => {
    const source = cards(15);
    const quiz = generateQuiz(source, { random: seededRandom(6) });
    const inQuiz = new Set(quiz.map((question) => question.answer));
    const distractors = quiz.flatMap((question) =>
      (question.options ?? []).filter((option) => option !== question.answer),
    );

    expect(distractors.some((option) => !inQuiz.has(option))).toBe(true);
  });

  it('el pool de distractores puede ser más amplio que las tarjetas (todo el libro)', () => {
    const chapter = cards(2, 'c');
    const book = [...chapter, ...cards(6, 'b')];
    const quiz = generateQuiz(chapter, { pool: book, random: seededRandom(7) });

    expect(quiz[0]?.type).toBe('multiple-choice');
    expect(quiz[0]?.options?.some((option) => option.startsWith('back b'))).toBe(true);
  });

  it('dos prácticas con distinto azar salen en distinto orden; cada pregunta con su id', () => {
    const source = cards(10);
    const first = generateQuiz(source, { random: seededRandom(8) }).map((q) => q.cardId);
    const second = generateQuiz(source, { random: seededRandom(9) }).map((q) => q.cardId);

    expect(first).not.toEqual(second);
    const ids = generateQuiz(source, { random: seededRandom(8) }).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
