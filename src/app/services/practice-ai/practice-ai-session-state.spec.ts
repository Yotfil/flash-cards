import { anItem } from '@testing/fake-practice-package-repository';
import { seededRandom } from '@testing/seeded-random';

import {
  gradeCurrent,
  progress,
  requeueRejected,
  reveal,
  startPracticeSession,
  type PracticeAiSessionState,
} from './practice-ai-session-state';

const ITEMS = ['a', 'b', 'c', 'd', 'e'].map((id) => anItem({ id, front: `front ${id}` }));
const start = (seed = 1) =>
  startPracticeSession({ packageId: 'p1', dayId: '2026-10-25', items: ITEMS }, seededRandom(seed));
const current = (state: PracticeAiSessionState) => state.queue[state.index];

describe('practice-ai-session-state', () => {
  it('baraja los ítems y cada uno aparece una vez', () => {
    const state = start();

    expect(state.queue.map((item) => item.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(state.queue.map((item) => item.id)).not.toEqual(start(2).queue.map((item) => item.id));
    expect(state).toEqual(expect.objectContaining({ index: 0, revealed: false, status: 'active' }));
  });

  it('sin revelar no se califica; revelar es idempotente', () => {
    const state = start();

    expect(gradeCurrent(state, 3)).toBe(state);
    const revealed = reveal(state);
    expect(revealed.revealed).toBe(true);
    expect(reveal(revealed)).toBe(revealed);
  });

  it('calificar registra la nota del ítem y pasa al siguiente sin revelar; la última termina', () => {
    let state = reveal(start());
    const first = current(state);

    state = gradeCurrent(state, 2);
    expect(state.grades[first?.id ?? '']).toBe(2);
    expect(state.index).toBe(1);
    expect(state.revealed).toBe(false);
    expect(progress(state)).toBe(0.2);

    for (let index = 1; index < 5; index++) {
      state = gradeCurrent(reveal(state), 4);
    }
    expect(state.status).toBe('finished');
    expect(progress(state)).toBe(1);
    expect(gradeCurrent(reveal(state), 1)).toEqual(state);
  });

  it('una nota rechazada devuelve el ítem al final; terminada la práctica, solo se cuenta', () => {
    let state = gradeCurrent(reveal(start()), 1);
    const rejected = state.queue[0]?.id ?? '';

    state = requeueRejected(state, rejected);
    expect(state.queue.at(-1)?.id).toBe(rejected);
    expect(state.queue).toHaveLength(6);
    expect(state.grades[rejected]).toBeUndefined();

    for (let index = 1; index < 6; index++) {
      state = gradeCurrent(reveal(state), 3);
    }
    expect(state.status).toBe('finished');
    const late = requeueRejected(state, 'c');
    expect(late.rejectedAfterFinish).toBe(1);
    expect(late.queue).toHaveLength(6);
  });
});
