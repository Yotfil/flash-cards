import type { QuizQuestion } from './generate-quiz';
import {
  advance,
  answerCurrent,
  currentAnswer,
  currentQuestion,
  isLast,
  progress,
  score,
  startPractice,
} from './practice-state';

const choice = (n: number): QuizQuestion => ({
  id: `q${n}`,
  cardId: `k${n}`,
  type: 'multiple-choice',
  prompt: `front ${n}`,
  answer: `back ${n}`,
  acceptedAnswers: [`back ${n}`],
  options: [`back ${n}`, 'x', 'y', 'z'],
});
const written = (n: number, answer = `back ${n}`): QuizQuestion => ({
  id: `q${n}`,
  cardId: `k${n}`,
  type: 'written',
  prompt: `front ${n}`,
  answer,
  acceptedAnswers: [answer],
});

describe('practice-state', () => {
  it('empieza en la primera pregunta, sin respuestas y activa', () => {
    const state = startPractice([choice(1), written(2)]);

    expect(currentQuestion(state)?.id).toBe('q1');
    expect(state.answers.size).toBe(0);
    expect(state.status).toBe('active');
    expect(score(state)).toBe(0);
  });

  it('opción múltiple se corrige por igualdad exacta', () => {
    const right = answerCurrent(startPractice([choice(1)]), 'back 1');
    const wrong = answerCurrent(startPractice([choice(1)]), 'x');
    const almost = answerCurrent(startPractice([choice(1)]), 'Back 1');

    expect(currentAnswer(right)).toEqual({ chosen: 'back 1', correct: true });
    expect(currentAnswer(wrong)).toEqual({ chosen: 'x', correct: false });
    expect(currentAnswer(almost)?.correct).toBe(false);
  });

  it('escribir se corrige con la comparación tolerante', () => {
    const state = startPractice([written(1, 'rendirse, darse por vencido')]);

    expect(currentAnswer(answerCurrent(state, '  Darse por vencido '))?.correct).toBe(true);
    expect(currentAnswer(answerCurrent(state, 'avanzar'))?.correct).toBe(false);
  });

  it('escribir vale cualquiera de las acepciones del anverso', () => {
    const bank: QuizQuestion = {
      ...written(1, 'banco'),
      prompt: 'bank',
      acceptedAnswers: ['banco', 'orilla'],
    };
    const state = startPractice([bank]);

    expect(currentAnswer(answerCurrent(state, 'orilla'))?.correct).toBe(true);
    expect(currentAnswer(answerCurrent(state, 'banco'))?.correct).toBe(true);
    expect(currentAnswer(answerCurrent(state, 'río'))?.correct).toBe(false);
  });

  it('una pregunta respondida no acepta otra respuesta ni cuenta doble', () => {
    const once = answerCurrent(startPractice([choice(1), choice(2)]), 'back 1');
    const twice = answerCurrent(once, 'x');

    expect(twice).toBe(once);
    expect(score(twice)).toBe(1);
  });

  it('no avanza sin responder; desde la última respondida, termina', () => {
    const start = startPractice([choice(1), written(2)]);

    expect(advance(start)).toBe(start);
    const second = advance(answerCurrent(start, 'x'));
    expect(currentQuestion(second)?.id).toBe('q2');
    expect(isLast(second)).toBe(true);

    const finished = advance(answerCurrent(second, 'back 2'));
    expect(finished.status).toBe('finished');
    expect(score(finished)).toBe(1);
  });

  it('terminada, nada cambia', () => {
    const finished = advance(answerCurrent(startPractice([choice(1)]), 'back 1'));

    expect(answerCurrent(finished, 'x')).toBe(finished);
    expect(advance(finished)).toBe(finished);
  });

  it('el progreso es respondidas sobre el total y llega a 1 al responder la última', () => {
    let state = startPractice(Array.from({ length: 10 }, (_, index) => written(index + 1)));
    for (let index = 0; index < 3; index++) {
      state = advance(answerCurrent(state, 'algo'));
    }

    expect(currentQuestion(state)?.id).toBe('q4');
    expect(progress(state)).toBe(0.3);
    state = answerCurrent(state, 'algo');
    expect(progress(state)).toBe(0.4);
    for (let index = 4; index < 10; index++) {
      state = answerCurrent(advance(state), 'algo');
    }
    expect(isLast(state)).toBe(true);
    expect(progress(state)).toBe(1);
  });
});
