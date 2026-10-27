import { CardState, type Card, type CardScheduling } from '@domain/models/card.model';
import { RATINGS, type Rating } from '@domain/models/rating';
import type { SchedulingPreview } from '@domain/ports/scheduling.port';
import { aCard } from '@testing/fake-card-repository';

import {
  confirmSaved,
  grade,
  rejectSaved,
  progressPercent,
  remaining,
  reveal,
  startSession,
  type PreviewFn,
  type SessionState,
} from './review-session-state';

// Sábado 24 de octubre de 2026, 10:00 en Bogotá; el día de estudio acaba mañana a las 04:00.
const T0 = new Date('2026-10-24T15:00:00Z');
const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;
const at = (ms: number, from = T0) => new Date(from.getTime() + ms);
const SETTINGS = { timezone: 'America/Bogota', dayStartHour: 4 };

/** Un `preview` falso: cada grado vence `dueIn[grado]` ms después del instante. */
function previewWith(dueIn: Record<Rating, number>): PreviewFn {
  return (scheduling: CardScheduling, now: Date) =>
    Object.fromEntries(
      RATINGS.map((rating) => {
        const due = at(dueIn[rating], now);
        const preview: SchedulingPreview = {
          scheduling: {
            ...scheduling,
            due,
            state: rating === 1 ? CardState.Learning : CardState.Review,
            reps: scheduling.reps + 1,
            lastReview: now,
          },
          intervalDays: Math.floor(dueIn[rating] / DAY_MS),
          due,
          log: {
            state: scheduling.state,
            due: scheduling.due,
            stability: scheduling.stability,
            difficulty: scheduling.difficulty,
            elapsedDays: 0,
            lastElapsedDays: 0,
            scheduledDays: scheduling.scheduledDays,
          },
        };
        return [rating, preview];
      }),
    ) as Record<Rating, SchedulingPreview>;
}

const LEAVES = previewWith({ 1: 8 * DAY_MS, 2: 9 * DAY_MS, 3: 10 * DAY_MS, 4: 12 * DAY_MS });
const COMES_BACK = previewWith({
  1: MINUTE_MS,
  2: 6 * MINUTE_MS,
  3: 10 * MINUTE_MS,
  4: 8 * DAY_MS,
});

const A = aCard({ id: 'A', front: 'to give up' });
const B = aCard({ id: 'B', front: 'to look up' });
const C = aCard({ id: 'C', front: 'to put off' });

function start(cards: Card[] = [A, B, C], preview: PreviewFn = LEAVES, now = T0) {
  return startSession({ cards, now, preview, ...SETTINGS });
}

describe('review-session-state · arranque y revelar', () => {
  it('arranca con la lista en su orden, en cero y con la previsualización de la primera', () => {
    const calls: Date[] = [];
    const state = start([A, B, C], (scheduling, now) => {
      calls.push(now);
      return LEAVES(scheduling, now);
    });

    expect(state.queue.map((appearance) => appearance.card.id)).toEqual(['A', 'B', 'C']);
    expect(new Set(state.queue.map((appearance) => appearance.id)).size).toBe(3);
    expect(state.distinctCount).toBe(3);
    expect(state.ratingCounts).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
    expect(state.difficult).toEqual([]);
    expect(state.status).toBe('active');
    expect(state.revealed).toBe(false);
    expect(state.shownAt).toBe(T0.getTime());
    expect(calls).toEqual([T0]);
    expect(state.previews?.[3].due).toEqual(at(10 * DAY_MS));
  });

  it('fija el día de estudio al arrancar: de madrugada cuenta para el día anterior', () => {
    expect(start().day).toEqual({ id: '2026-10-24', endOfDay: END_OF_DAY });
    // 01:30 en Bogotá del domingo 25.
    expect(start([A], LEAVES, new Date('2026-10-25T06:30:00Z')).day.id).toBe('2026-10-24');
  });

  it('una sesión no cruza al día siguiente: lo calificado tras la hora de inicio va al día de la sesión', () => {
    // Empieza a las 03:55 en Bogotá del domingo 25 y califica a las 04:20.
    const dawn = start([A, B], LEAVES, new Date('2026-10-25T08:55:00Z'));

    const { record } = revealAndGrade(dawn, 3, new Date('2026-10-25T09:20:00Z'), LEAVES);

    expect(record?.dayId).toBe('2026-10-24');
  });

  it('revelar a los 3 s sugiere "Bien"; con la sugerencia apagada no sugiere nada', () => {
    const revealed = reveal(start(), at(3 * SECOND_MS), true);
    expect(revealed.revealed).toBe(true);
    expect(revealed.suggested).toBe(3);

    expect(reveal(start(), at(3 * SECOND_MS), false).suggested).toBeNull();
  });

  it('revelar dos veces no cambia nada', () => {
    const once = reveal(start(), at(3 * SECOND_MS), true);

    expect(reveal(once, at(9 * SECOND_MS), true)).toBe(once);
  });
});

/** Revela y califica la aparición actual en `now`. */
function revealAndGrade(state: SessionState, rating: Rating, now: Date, preview: PreviewFn) {
  return grade(reveal(state, now, false), rating, now, preview);
}

describe('review-session-state · calificar y reencolar', () => {
  it('sin revelar no califica', () => {
    const state = start();

    const result = grade(state, 3, at(8 * SECOND_MS), LEAVES);

    expect(result.state).toBe(state);
    expect(result.record).toBeNull();
  });

  it('calificar arma el registro con el instante del toque y la duración de la aparición', () => {
    const graded = at(8 * SECOND_MS);

    const { record } = revealAndGrade(start([A, B, C], COMES_BACK), 3, graded, COMES_BACK);

    expect(record?.cardId).toBe('A');
    expect(record?.scheduling.due).toEqual(at(10 * MINUTE_MS, graded));
    expect(record?.scheduling.lastReview).toEqual(graded);
    expect(record?.log.state).toBe(A.scheduling.state);
    expect(record?.log.rating).toBe(3);
    expect(record?.log.reviewedAt).toEqual(graded);
    expect(record?.log.durationMs).toBe(8000);
    expect(record?.dayId).toBe('2026-10-24');
    expect(record?.stat).toEqual({ rating: 3, wasNew: A.scheduling.state === CardState.New });
  });

  it('si sigue lista para hoy vuelve al final como una aparición nueva', () => {
    const before = start([A, B, C], COMES_BACK);

    const { state } = revealAndGrade(before, 3, at(8 * SECOND_MS), COMES_BACK);

    expect(state.queue.map((appearance) => appearance.card.id)).toEqual(['B', 'C', 'A']);
    expect(state.queue[2]?.id).not.toBe(before.queue[0]?.id);
    expect(state.queue[2]?.card.scheduling.due).toEqual(at(10 * MINUTE_MS, at(8 * SECOND_MS)));
    expect(state.exitedCardIds.size).toBe(0);
    expect(state.ratingCounts.good).toBe(1);
    expect(state.revealed).toBe(false);
    expect(state.shownAt).toBe(at(8 * SECOND_MS).getTime());
  });

  it('si ya no está lista hoy, sale de la sesión', () => {
    const { state } = revealAndGrade(start(), 4, at(8 * SECOND_MS), LEAVES);

    expect(state.queue.map((appearance) => appearance.card.id)).toEqual(['B', 'C']);
    expect([...state.exitedCardIds]).toEqual(['A']);
  });

  it('vencer diez minutos antes del fin del día la devuelve; diez después, no', () => {
    const tenMinutes = previewWith({
      1: 10 * MINUTE_MS,
      2: 10 * MINUTE_MS,
      3: 10 * MINUTE_MS,
      4: 10 * MINUTE_MS,
    });

    const late = revealAndGrade(start([A, B]), 3, at(-20 * MINUTE_MS, END_OF_DAY), tenMinutes);
    expect(late.state.queue.map((appearance) => appearance.card.id)).toEqual(['B', 'A']);

    // 03:55: el nuevo vencimiento (04:05) cae pasado el fin del día de estudio.
    const dawn = revealAndGrade(start([A, B]), 3, at(-5 * MINUTE_MS, END_OF_DAY), tenMinutes);
    expect(dawn.state.queue.map((appearance) => appearance.card.id)).toEqual(['B']);
  });

  it('la última que sale termina la sesión y deja de previsualizar', () => {
    const { state } = revealAndGrade(start([A]), 3, at(8 * SECOND_MS), LEAVES);

    expect(state.status).toBe('finished');
    expect(state.previews).toBeNull();
    expect(state.suggested).toBeNull();
  });

  it('un segundo toque justo después no califica la siguiente sin revelar; terminada, nada', () => {
    const { state: afterFirst } = revealAndGrade(start(), 3, at(8 * SECOND_MS), LEAVES);
    expect(grade(afterFirst, 3, at(8 * SECOND_MS + 10), LEAVES).state).toBe(afterFirst);

    const { state: finished } = revealAndGrade(start([A]), 3, at(SECOND_MS), LEAVES);
    expect(grade(finished, 4, at(2 * SECOND_MS), LEAVES).record).toBeNull();
  });

  it('cada aparición mide su propia duración', () => {
    const first = revealAndGrade(start([A], COMES_BACK), 1, at(9 * SECOND_MS), COMES_BACK);
    const shownAgain = at(9 * SECOND_MS);

    const second = revealAndGrade(first.state, 3, at(1500, shownAgain), COMES_BACK);

    expect(first.record?.log.durationMs).toBe(9000);
    expect(second.record?.log.durationMs).toBe(1500);
  });
});

describe('review-session-state · difíciles y progreso', () => {
  const D = aCard({ id: 'D', front: 'to carry on' });
  const E = aCard({ id: 'E', front: 'to set up' });

  it('las difíciles son las calificadas 1 o 2, en orden', () => {
    let state = start([A, B, C, D]);
    for (const rating of [1, 3, 2, 4] as const) {
      state = revealAndGrade(state, rating, at(SECOND_MS), LEAVES).state;
    }

    expect(state.difficult.map((entry) => entry.cardId)).toEqual(['A', 'C']);
  });

  it('una tarjeta difícil dos veces cuenta una sola vez', () => {
    const first = revealAndGrade(start([A], COMES_BACK), 1, at(SECOND_MS), COMES_BACK).state;
    const second = revealAndGrade(first, 2, at(2 * SECOND_MS), COMES_BACK).state;

    expect(second.difficult.map((entry) => entry.cardId)).toEqual(['A']);
  });

  it('quedan las apariciones de la cola; la barra, las tarjetas que salieron sobre las distintas', () => {
    let state = start([A, B, C, D, E]);
    expect(remaining(state)).toBe(5);
    expect(progressPercent(state)).toBe(0);

    state = revealAndGrade(state, 4, at(SECOND_MS), LEAVES).state;
    state = revealAndGrade(state, 4, at(2 * SECOND_MS), LEAVES).state;
    expect(remaining(state)).toBe(3);
    expect(progressPercent(state)).toBe(40);
  });

  it('una que vuelve no avanza la barra ni descuenta del contador', () => {
    const { state } = revealAndGrade(
      start([A, B, C, D, E], COMES_BACK),
      3,
      at(SECOND_MS),
      COMES_BACK,
    );

    expect(remaining(state)).toBe(5);
    expect(progressPercent(state)).toBe(0);
  });
});

describe('review-session-state · confirmar y rechazar', () => {
  it('confirmar quita la calificación de las que están en vuelo', () => {
    const before = start();
    const { state } = revealAndGrade(before, 3, at(SECOND_MS), LEAVES);
    const graded = before.queue[0]?.id ?? '';

    expect(state.inFlight.has(graded)).toBe(true);
    expect(confirmSaved(state, graded).inFlight.has(graded)).toBe(false);
  });

  it('un rechazo de una que había vuelto: deshace el conteo, recupera la programación y avisa', () => {
    const before = start([A, B, C], COMES_BACK);
    const { state } = revealAndGrade(before, 3, at(SECOND_MS), COMES_BACK);

    const rejected = rejectSaved(state, before.queue[0]?.id ?? '', at(2 * SECOND_MS), COMES_BACK);

    expect(rejected.ratingCounts.good).toBe(0);
    expect(rejected.queue.map((appearance) => appearance.card.id)).toEqual(['B', 'C', 'A']);
    expect(rejected.queue.at(-1)?.card.scheduling).toEqual(A.scheduling);
    expect(rejected.alerts).toEqual([{ cardId: 'A', front: 'to give up' }]);
    expect(rejected.inFlight.size).toBe(0);
  });

  it('un rechazo de una que había salido: vuelve al final y la barra retrocede', () => {
    const before = start();
    const { state } = revealAndGrade(before, 4, at(SECOND_MS), LEAVES);
    expect(progressPercent(state)).toBe(33);

    const rejected = rejectSaved(state, before.queue[0]?.id ?? '', at(2 * SECOND_MS), LEAVES);

    expect(rejected.exitedCardIds.has('A')).toBe(false);
    expect(progressPercent(rejected)).toBe(0);
    expect(rejected.queue.map((appearance) => appearance.card.id)).toEqual(['B', 'C', 'A']);
    expect(rejected.queue.at(-1)?.card.scheduling).toEqual(A.scheduling);
  });

  it('una calificación "Otra vez" rechazada no cuenta entre las difíciles', () => {
    const before = start();
    const { state } = revealAndGrade(before, 1, at(SECOND_MS), LEAVES);
    expect(state.difficult).toHaveLength(1);

    expect(
      rejectSaved(state, before.queue[0]?.id ?? '', at(2 * SECOND_MS), LEAVES).difficult,
    ).toEqual([]);
  });

  it('un rechazo tras el cierre se cuenta y el cierre sigue', () => {
    const before = start([A]);
    const { state } = revealAndGrade(before, 3, at(SECOND_MS), LEAVES);
    expect(state.status).toBe('finished');

    const rejected = rejectSaved(state, before.queue[0]?.id ?? '', at(2 * SECOND_MS), LEAVES);

    expect(rejected.rejectedAfterFinish).toBe(1);
    expect(rejected.status).toBe('finished');
  });

  it('volver a calificar con éxito la tarjeta devuelta quita el aviso', () => {
    const before = start([A, B], LEAVES);
    const graded = revealAndGrade(before, 3, at(SECOND_MS), LEAVES).state;
    const rejected = rejectSaved(graded, before.queue[0]?.id ?? '', at(2 * SECOND_MS), LEAVES);
    expect(rejected.alerts).toHaveLength(1);

    const afterB = revealAndGrade(rejected, 4, at(3 * SECOND_MS), LEAVES).state;
    const retriedId = afterB.queue[0]?.id ?? '';
    const retried = revealAndGrade(afterB, 3, at(4 * SECOND_MS), LEAVES).state;

    expect(confirmSaved(retried, retriedId).alerts).toEqual([]);
  });
});
