import type { Rating } from '@domain/models/rating';
import { pluralize } from '@shared/text/pluralize';

// Textos de la sesión de repaso, centralizados (ADR 0002: copy por feature).

export const REPASO_COPY = {
  exit: 'Salir',
  progress: 'Progreso de la sesión',
  showAnswer: 'Mostrar respuesta',
  question: '¿Qué tan bien la recordaste?',
  suggested: 'sugerido',
  ratingLabels: { 1: 'Otra vez', 2: 'Difícil', 3: 'Bien', 4: 'Fácil' } satisfies Record<
    Rating,
    string
  >,
  summaryTitle: 'Sesión terminada',
  summaryNote: 'Las que más te costaron volverán antes.',
  backToToday: 'Volver a Hoy',
  ratingCountsLabel: 'Calificaciones de la sesión',
} as const;

/** "Quedan 5" / "Queda 1": apariciones que faltan, contando las que volvieron. */
export function remainingLabel(count: number): string {
  return count === 1 ? 'Queda 1' : `Quedan ${count}`;
}

/** "Repasaste 20 tarjetas.": tarjetas distintas de la sesión. */
export function reviewedCardsLabel(count: number): string {
  return `Repasaste ${pluralize(count, 'tarjeta', 'tarjetas')}.`;
}

/** Aviso accesible cuando el almacén rechaza una calificación ya hecha. */
export function rejectedGradeMessage(front: string): string {
  return `No se guardó tu calificación de «${front}». Vuelve a calificarla.`;
}

/** En el cierre, cuántas calificaciones no se guardaron. */
export function rejectedAfterFinishLabel(count: number): string {
  return count === 1
    ? '1 calificación no se guardó. Esa tarjeta sigue pendiente.'
    : `${count} calificaciones no se guardaron. Esas tarjetas siguen pendientes.`;
}

/** Etiqueta accesible de una opción: "Bien, vuelve en 3 días (sugerido)". */
export function ratingAriaLabel(label: string, interval: string, suggested: boolean): string {
  return `${label}, vuelve en ${interval}${suggested ? ' (sugerido)' : ''}`;
}
