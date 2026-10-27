import { CardState, type Card, type CardScheduling } from '@domain/models/card.model';
import { ratingCountKey, type RatingCounts } from '@domain/models/daily-stats.model';
import type { GradeRecord } from '@domain/models/grade-record';
import type { Rating } from '@domain/models/rating';
import type { SchedulingPreview } from '@domain/ports/scheduling.port';
import { isReadyCard } from '@services/queue/ready-cards';
import { studyDayAt, type StudyDay } from '@services/study-day/study-day';

import { suggestRatingByLatency } from './suggest-rating';

// Núcleo PURO de la sesión de repaso: un estado inmutable y funciones de transición que reciben
// el instante. Sin Angular, sin almacén: la sesión se prueba entera con fechas fijas.
//
// La unidad es la APARICIÓN, no la tarjeta: una tarjeta que vuelve al final de la sesión es una
// aparición nueva, con sus relojes y su calificación en vuelo propios; cada guardado se confirma
// o se rechaza por separado.

/** El `preview` del puerto de programación (inyectado para que el núcleo siga puro). */
export type PreviewFn = (
  scheduling: CardScheduling,
  now: Date,
) => Record<Rating, SchedulingPreview>;

export interface Appearance {
  readonly id: string;
  readonly card: Card;
}

/** Una calificación guardándose: lo necesario para deshacerla si el almacén la rechaza. */
export interface InFlightGrade {
  readonly cardBefore: Card;
  readonly rating: Rating;
  /** La aparición que volvió al final con la tarjeta calificada (`null` si salió). */
  readonly requeuedAppearanceId: string | null;
}

/** Por qué no se guardó una nota: un fallo pasajero (vuelve a calificarse) o la tarjeta se borró. */
export type GradeAlertKind = 'failed' | 'gone';

export interface SessionState {
  /** `accessLost`: el servidor negó el permiso; la sesión se cerró y nada la reabre. */
  readonly status: 'active' | 'finished' | 'accessLost';
  /** La aparición actual es `queue[0]`. */
  readonly queue: readonly Appearance[];
  /** Tarjetas distintas con que arrancó la sesión. */
  readonly distinctCount: number;
  /** Fijado al arrancar: una sesión no cruza al día siguiente. */
  readonly day: StudyDay;
  /** Tarjetas que ya salieron de la sesión (no vuelven hoy). */
  readonly exitedCardIds: ReadonlySet<string>;
  readonly revealed: boolean;
  /** Cuándo se mostró el anverso de la aparición actual (ms). */
  readonly shownAt: number;
  readonly suggested: Rating | null;
  readonly previews: Record<Rating, SchedulingPreview> | null;
  /** Calificaciones de la sesión (no tarjetas). */
  readonly ratingCounts: RatingCounts;
  /** Tarjetas calificadas "Otra vez" o "Difícil", en orden y sin repetir tarjeta. */
  readonly difficult: readonly {
    readonly cardId: string;
    readonly appearanceId: string;
    readonly card: Card;
  }[];
  /** Calificaciones cuyo guardado no se confirmó todavía, por aparición. */
  readonly inFlight: ReadonlyMap<string, InFlightGrade>;
  /** Tarjetas cuyo guardado se rechazó (la pantalla pone el texto del aviso según su tipo). */
  readonly alerts: readonly {
    readonly cardId: string;
    readonly front: string;
    readonly kind: GradeAlertKind;
  }[];
  /** Rechazos que llegaron con el cierre ya visible: esas tarjetas siguen pendientes. */
  readonly rejectedAfterFinish: number;
  readonly nextAppearance: number;
}

export interface GradeResult {
  readonly state: SessionState;
  /** Lo que hay que guardar; `null` si la calificación se ignoró. */
  readonly record: GradeRecord | null;
}

export interface StartSessionInput {
  readonly cards: readonly Card[];
  readonly now: Date;
  readonly preview: PreviewFn;
  readonly timezone: string;
  readonly dayStartHour: number;
}

export function startSession(input: StartSessionInput): SessionState {
  const queue = input.cards.map((card, index) => ({ id: appearanceIdFor(index + 1), card }));
  return {
    status: queue.length > 0 ? 'active' : 'finished',
    queue,
    distinctCount: new Set(input.cards.map((card) => card.id)).size,
    day: studyDayAt(input.now, input.timezone, input.dayStartHour),
    exitedCardIds: new Set(),
    revealed: false,
    shownAt: input.now.getTime(),
    suggested: null,
    previews: queue[0] ? input.preview(queue[0].card.scheduling, input.now) : null,
    ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 },
    difficult: [],
    inFlight: new Map(),
    alerts: [],
    rejectedAfterFinish: 0,
    nextAppearance: queue.length + 1,
  };
}

/** Revela la aparición actual; con la sugerencia activa, propone un grado por la latencia. */
export function reveal(state: SessionState, now: Date, autoGrade: boolean): SessionState {
  if (state.status !== 'active' || state.revealed) {
    return state;
  }
  return {
    ...state,
    revealed: true,
    suggested: autoGrade ? suggestRatingByLatency(now.getTime() - state.shownAt) : null,
  };
}

/**
 * Califica la aparición actual en `now`: la programación se calcula en ese instante (no en el de
 * la previsualización). Si la tarjeta sigue lista para hoy vuelve al final como una aparición
 * nueva; si no, sale. Se ignora si la aparición no está revelada o si la sesión terminó: así un
 * doble toque durante el cambio de tarjeta no califica la siguiente.
 */
export function grade(
  state: SessionState,
  rating: Rating,
  now: Date,
  preview: PreviewFn,
): GradeResult {
  const current = state.queue[0];
  if (state.status !== 'active' || !state.revealed || !current) {
    return { state, record: null };
  }
  const outcome = preview(current.card.scheduling, now)[rating];
  const cardAfter: Card = { ...current.card, scheduling: outcome.scheduling };
  const record = gradeRecord(state, current.card, rating, outcome, now);

  const stillReady = isReadyCard(cardAfter, state.day.endOfDay);
  const requeued = stillReady
    ? { id: appearanceIdFor(state.nextAppearance), card: cardAfter }
    : null;
  const queue = requeued ? [...state.queue.slice(1), requeued] : state.queue.slice(1);
  const exitedCardIds = stillReady
    ? state.exitedCardIds
    : new Set([...state.exitedCardIds, current.card.id]);
  const inFlight = new Map(state.inFlight).set(current.id, {
    cardBefore: current.card,
    rating,
    requeuedAppearanceId: requeued?.id ?? null,
  });

  const next: SessionState = {
    ...state,
    queue,
    exitedCardIds,
    ratingCounts: countRating(state.ratingCounts, rating, 1),
    difficult: addDifficult(state.difficult, current, rating),
    inFlight,
    nextAppearance: state.nextAppearance + (requeued ? 1 : 0),
  };
  return { state: showNext(next, now, preview), record };
}

/** El almacén confirmó el guardado: deja de estar en vuelo y, si la tarjeta tenía un aviso, se quita. */
export function confirmSaved(state: SessionState, appearanceId: string): SessionState {
  const entry = state.inFlight.get(appearanceId);
  if (!entry || state.status === 'accessLost') {
    return state;
  }
  const inFlight = new Map(state.inFlight);
  inFlight.delete(appearanceId);
  const alerts = state.alerts.filter((alert) => alert.cardId !== entry.cardBefore.id);
  return { ...state, inFlight, alerts };
}

/**
 * El almacén rechazó el guardado por un fallo pasajero (que no dejó nada a medias): se deshace lo
 * que esa calificación contó y la tarjeta vuelve al final con su programación anterior, sin
 * revelar, con un aviso. Con el cierre ya visible no se reabre la sesión: solo se cuenta.
 */
export function rejectSaved(
  state: SessionState,
  appearanceId: string,
  now: Date,
  preview: PreviewFn,
): SessionState {
  const entry = state.inFlight.get(appearanceId);
  if (!entry || state.status === 'accessLost') {
    return state;
  }
  const undone = undoGrade(state, appearanceId, entry);
  if (state.status === 'finished') {
    return { ...undone, rejectedAfterFinish: state.rejectedAfterFinish + 1 };
  }

  const card = entry.cardBefore;
  const exitedCardIds = new Set(state.exitedCardIds);
  exitedCardIds.delete(card.id);
  const returned: SessionState = {
    ...undone,
    exitedCardIds,
    alerts: [...state.alerts, { cardId: card.id, front: card.front, kind: 'failed' }],
  };

  const requeuedIndex = state.queue.findIndex(
    (appearance) => appearance.id === entry.requeuedAppearanceId,
  );
  if (requeuedIndex === 0) {
    // Es la que se está mostrando: sigue en pantalla, pero con su programación anterior.
    const queue = [{ id: state.queue[0]?.id ?? '', card }, ...state.queue.slice(1)];
    return { ...returned, queue, previews: preview(card.scheduling, now) };
  }
  const queue = [
    ...state.queue.filter((appearance) => appearance.id !== entry.requeuedAppearanceId),
    { id: appearanceIdFor(state.nextAppearance), card },
  ];
  return { ...returned, queue, nextAppearance: state.nextAppearance + 1 };
}

/**
 * El almacén rechazó el guardado porque la tarjeta ya no existe (se borró en otro dispositivo):
 * reencolarla no serviría. Se deshace lo que esa nota contó, la tarjeta sale de la sesión con todas
 * sus apariciones (cuenta como salida en la barra) y queda su aviso. Si era la que se mostraba,
 * entra la siguiente (o el cierre). Con el cierre ya visible solo se deshace: no queda pendiente.
 */
export function dropGoneCard(
  state: SessionState,
  appearanceId: string,
  now: Date,
  preview: PreviewFn,
): SessionState {
  const entry = state.inFlight.get(appearanceId);
  if (!entry || state.status === 'accessLost') {
    return state;
  }
  const undone = undoGrade(state, appearanceId, entry);
  if (state.status === 'finished') {
    return undone;
  }
  const card = entry.cardBefore;
  const wasShowing = state.queue[0]?.card.id === card.id;
  const dropped: SessionState = {
    ...undone,
    queue: state.queue.filter((appearance) => appearance.card.id !== card.id),
    exitedCardIds: new Set([...state.exitedCardIds, card.id]),
    alerts: [
      ...state.alerts.filter((alert) => alert.cardId !== card.id),
      { cardId: card.id, front: card.front, kind: 'gone' },
    ],
  };
  return wasShowing ? showNext(dropped, now, preview) : dropped;
}

/**
 * El servidor negó el permiso (le retiraron el acceso): ninguna nota más se guardaría. La sesión
 * se cierra, también con el cierre visible, y los resultados que lleguen después no la reabren.
 */
export function closeForLostAccess(state: SessionState): SessionState {
  return { ...state, status: 'accessLost', revealed: false, suggested: null, previews: null };
}

/** Apariciones que faltan, contando las que volvieron al final. */
export function remaining(state: SessionState): number {
  return state.queue.length;
}

/** Porcentaje de tarjetas que ya salieron de la sesión sobre las distintas con que arrancó. */
export function progressPercent(state: SessionState): number {
  return state.distinctCount === 0
    ? 0
    : Math.round((state.exitedCardIds.size / state.distinctCount) * 100);
}

function gradeRecord(
  state: SessionState,
  card: Card,
  rating: Rating,
  outcome: SchedulingPreview,
  now: Date,
): GradeRecord {
  return {
    cardId: card.id,
    bookId: card.bookId,
    scheduling: outcome.scheduling,
    dayId: state.day.id,
    stat: { rating, wasNew: card.scheduling.state === CardState.New },
    log: {
      cardId: card.id,
      bookId: card.bookId,
      rating,
      ...outcome.log,
      reviewedAt: now,
      durationMs: now.getTime() - state.shownAt,
    },
  };
}

/** Prepara la siguiente aparición (sin revelar, relojes a cero) o cierra la sesión. */
function showNext(state: SessionState, now: Date, preview: PreviewFn): SessionState {
  const next = state.queue[0];
  return {
    ...state,
    status: next ? 'active' : 'finished',
    revealed: false,
    suggested: null,
    shownAt: now.getTime(),
    previews: next ? preview(next.card.scheduling, now) : null,
  };
}

/** Quita una nota rechazada de lo que contó: en vuelo, desglose y difíciles. */
function undoGrade(state: SessionState, appearanceId: string, entry: InFlightGrade): SessionState {
  const inFlight = new Map(state.inFlight);
  inFlight.delete(appearanceId);
  return {
    ...state,
    inFlight,
    ratingCounts: countRating(state.ratingCounts, entry.rating, -1),
    difficult: state.difficult.filter((difficult) => difficult.appearanceId !== appearanceId),
  };
}

function countRating(counts: RatingCounts, rating: Rating, delta: number): RatingCounts {
  const key = ratingCountKey(rating);
  return { ...counts, [key]: counts[key] + delta };
}

function addDifficult(
  difficult: SessionState['difficult'],
  appearance: Appearance,
  rating: Rating,
): SessionState['difficult'] {
  const alreadyThere = difficult.some((entry) => entry.cardId === appearance.card.id);
  return rating <= 2 && !alreadyThere
    ? [
        ...difficult,
        { cardId: appearance.card.id, appearanceId: appearance.id, card: appearance.card },
      ]
    : difficult;
}

function appearanceIdFor(sequence: number): string {
  return `aparicion-${sequence}`;
}
