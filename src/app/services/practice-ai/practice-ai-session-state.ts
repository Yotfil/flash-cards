import type { PracticeItem } from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';

// El estado de una práctica de paquete, sin Angular: cada ítem del día una vez, en orden barajado.
// Sin programación ni reencolado por nota: la calificación solo decide si el ítem vuelve mañana.
// La única vuelta es la de una nota que el servidor rechazó (como en el repaso).
export interface PracticeAiSessionState {
  readonly packageId: string;
  readonly dayId: string;
  readonly queue: readonly PracticeItem[];
  readonly index: number;
  readonly revealed: boolean;
  /** La última nota de cada ítem en esta práctica. */
  readonly grades: Readonly<Record<string, Rating>>;
  readonly status: 'active' | 'finished';
  /** Notas rechazadas cuando ya no quedaba práctica donde repetirlas. */
  readonly rejectedAfterFinish: number;
}

export function startPracticeSession(
  prepared: { packageId: string; dayId: string; items: readonly PracticeItem[] },
  random: () => number = Math.random,
): PracticeAiSessionState {
  return {
    packageId: prepared.packageId,
    dayId: prepared.dayId,
    queue: shuffle(prepared.items, random),
    index: 0,
    revealed: false,
    grades: {},
    status: prepared.items.length === 0 ? 'finished' : 'active',
    rejectedAfterFinish: 0,
  };
}

export function reveal(state: PracticeAiSessionState): PracticeAiSessionState {
  return state.status !== 'active' || state.revealed ? state : { ...state, revealed: true };
}

/** Califica el ítem revelado y pasa al siguiente; desde el último, termina. */
export function gradeCurrent(
  state: PracticeAiSessionState,
  rating: Rating,
): PracticeAiSessionState {
  const item = state.queue[state.index];
  if (state.status !== 'active' || !state.revealed || !item) {
    return state;
  }
  const grades = { ...state.grades, [item.id]: rating };
  const isLast = state.index === state.queue.length - 1;
  return isLast
    ? { ...state, grades, revealed: false, status: 'finished' }
    : { ...state, grades, revealed: false, index: state.index + 1 };
}

/**
 * El servidor rechazó la nota de un ítem: vuelve al final para calificarlo otra vez. Si la
 * práctica ya terminó, solo se cuenta (el cierre lo avisa).
 */
export function requeueRejected(
  state: PracticeAiSessionState,
  itemId: string,
): PracticeAiSessionState {
  const item = state.queue.find((candidate) => candidate.id === itemId);
  if (!item) {
    return state;
  }
  if (state.status === 'finished') {
    return { ...state, rejectedAfterFinish: state.rejectedAfterFinish + 1 };
  }
  const grades = { ...state.grades };
  delete grades[itemId];
  return { ...state, grades, queue: [...state.queue, item] };
}

/** Calificados sobre el total de la cola (al calificar el último llega a 1). */
export function progress(state: PracticeAiSessionState): number {
  if (state.queue.length === 0) {
    return 1;
  }
  return state.status === 'finished' ? 1 : state.index / state.queue.length;
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
