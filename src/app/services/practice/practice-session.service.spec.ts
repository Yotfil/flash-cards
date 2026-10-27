import { TestBed } from '@angular/core/testing';

import type { QuizQuestion } from './generate-quiz';
import type { PreparedPractice } from './practice-handoff.service';
import { PracticeSessionService } from './practice-session.service';

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    cardId: 'k1',
    type: 'multiple-choice',
    prompt: 'to give up',
    answer: 'rendirse',
    acceptedAnswers: ['rendirse'],
    options: ['rendirse', 'a', 'b', 'c'],
  },
  {
    id: 'q2',
    cardId: 'k2',
    type: 'written',
    prompt: 'to look up',
    answer: 'buscar',
    acceptedAnswers: ['buscar'],
  },
];
const PREPARED: PreparedPractice = {
  questions: QUESTIONS,
  origin: { kind: 'chapter', bookId: 'b1', chapterId: 'c1' },
};

describe('PracticeSessionService', () => {
  // Sin proveedores: si dependiera de un repositorio, ni siquiera se podría crear.
  const service = () => TestBed.inject(PracticeSessionService);

  it('start fija la primera pregunta, el origen y los contadores', () => {
    const session = service();
    session.start(PREPARED);

    expect(session.current()?.id).toBe('q1');
    expect(session.origin()).toEqual(PREPARED.origin);
    expect(session.position()).toBe(1);
    expect(session.total()).toBe(2);
    expect(session.progress()).toBe(0);
    expect(session.score()).toBe(0);
    expect(session.finished()).toBe(false);
    expect(session.feedback()).toBeNull();
  });

  it('responder da el feedback; avanzar pasa a la siguiente y desde la última termina', () => {
    const session = service();
    session.start(PREPARED);

    session.answer('a');
    expect(session.feedback()).toEqual({
      correct: false,
      answer: 'rendirse',
      chosen: 'a',
      correctAnswers: ['rendirse'],
    });
    expect(session.progress()).toBe(0.5);
    expect(session.isLast()).toBe(false);

    session.advance();
    expect(session.position()).toBe(2);
    expect(session.isLast()).toBe(true);
    session.answer(' BUSCAR ');
    expect(session.feedback()?.correct).toBe(true);
    session.advance();

    expect(session.finished()).toBe(true);
    expect(session.score()).toBe(1);
    expect(session.progress()).toBe(1);
  });

  it('al fallar, escribir nombra todas las acepciones y opción múltiple solo la mostrada', () => {
    const session = service();
    session.start({
      ...PREPARED,
      questions: [
        {
          id: 'q1',
          cardId: 'k1',
          type: 'multiple-choice',
          prompt: 'bank',
          answer: 'banco',
          acceptedAnswers: ['banco', 'orilla'],
          options: ['banco', 'a', 'b', 'c'],
        },
        {
          id: 'q2',
          cardId: 'k2',
          type: 'written',
          prompt: 'bank',
          answer: 'banco',
          acceptedAnswers: ['banco', 'orilla'],
        },
      ],
    });

    session.answer('a');
    expect(session.feedback()?.correctAnswers).toEqual(['banco']);
    session.advance();
    session.answer('río');
    expect(session.feedback()?.correctAnswers).toEqual(['banco', 'orilla']);
  });

  it('una práctica nueva empieza de cero; reset lo vacía todo', () => {
    const session = service();
    session.start(PREPARED);
    session.answer('rendirse');
    session.advance();

    session.start(PREPARED);
    expect(session.position()).toBe(1);
    expect(session.score()).toBe(0);

    session.reset();
    expect(session.current()).toBeUndefined();
    expect(session.origin()).toBeNull();
    expect(session.total()).toBe(0);
  });
});
