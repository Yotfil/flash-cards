// La tarjeta (`/users/{uid}/cards/{cardId}`): contenido y programación en un mismo documento.

/** Dirección de la tarjeta. Solo `forward` en 1.0.0; `reverse` queda para el estudio bidireccional. */
export type CardDirection = 'forward' | 'reverse';

/**
 * `basic` = anverso / reverso. `cloze` = rellenar el hueco: `front` es el texto con `{{…}}` y `back`
 * queda vacío. Ausente en el documento = `basic` (tarjetas anteriores al tipo).
 */
export type CardType = 'basic' | 'cloze';

/** Estado de la programación espaciada. Espeja el `State` de ts-fsrs por valor. */
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/** Bloque de programación: espeja la `Card` de ts-fsrs. */
export interface CardScheduling {
  /** Cuándo vuelve a tocar. */
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  /** Pasos de aprendizaje pendientes (ts-fsrs v5). */
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: Date | null;
}

export interface Card {
  id: string;
  bookId: string;
  chapterId: string;
  /** Agrupa tarjetas hermanas (bidireccional, futuro). Hoy cada tarjeta tiene el suyo. */
  noteId: string;
  direction: CardDirection;

  /** Ausente = básica. */
  cardType?: CardType;
  front: string;
  back: string;
  /** Frase de ejemplo: se ve al revelar. Opcional. */
  example?: string;
  // Campos futuros (esquema listo, UI después): se leen y se conservan, no se editan.
  pronunciation?: string;
  audioUrl?: string;
  notes?: string;
  tags?: string[];

  scheduling: CardScheduling;
  /** Apartada del repaso a mano; sigue contando en el libro y el capítulo. */
  suspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Lo que el formulario decide de una tarjeta. */
export interface CardContentDraft {
  cardType: CardType;
  front: string;
  back: string;
  /** Vacío o ausente = sin ejemplo. */
  example?: string;
}

/** Cambios de contenido al editar. `example: null` borra el ejemplo; ausente no lo toca. */
export interface CardContentChanges {
  front?: string;
  back?: string;
  example?: string | null;
}

/** Lo que se guarda al crear: todo menos lo que pone el almacén (id y fechas). */
export type NewCard = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
