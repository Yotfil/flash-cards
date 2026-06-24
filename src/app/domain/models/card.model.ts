// La tarjeta (`/users/{uid}/cards/{cardId}`): el corazón del modelo. Contenido y
// programación conviven en un mismo documento, en bloques distintos. Especificación §6.6.

/**
 * Dirección de una tarjeta concreta. Dos tarjetas hermanas con el mismo `noteId` y distinta
 * dirección dan el estudio bidireccional (§6.10).
 */
export type CardDirection = 'forward' | 'reverse';

/** Estado FSRS de la tarjeta. Espeja el enum `State` de ts-fsrs. */
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/**
 * Bloque de programación: ESPEJA el objeto `Card` de ts-fsrs (§6.6). El adaptador de
 * scheduling lo entrega casi tal cual a la librería y reescribe el resultado del repaso.
 */
export interface CardScheduling {
  /** Cuándo vuelve a tocar; mueve toda la cola diaria. */
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: Date | null;
}

export interface Card {
  id: string;

  // --- Relaciones ---
  bookId: string;
  chapterId: string;
  /** Agrupa tarjetas que comparten contenido (para bidireccional). */
  noteId: string;
  direction: CardDirection;

  // --- Contenido (lo que se ve) ---
  front: string;
  back: string;
  // Opcionales: Principio 2 (esquema listo / UI después). El MVP solo pinta front/back.
  /** Fonética/IPA (UI futura). */
  pronunciation?: string;
  /** Frase de ejemplo (muy útil en vocabulario). */
  example?: string;
  /** Audio, probablemente TTS al vuelo (UI futura). */
  audioUrl?: string;
  /** Mnemónico/notas (UI futura). */
  notes?: string;
  /** Etiquetas para filtrado futuro. */
  tags?: string[];

  // --- Programación ---
  scheduling: CardScheduling;

  /** Apartada del repaso manualmente. Default false. */
  suspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contenido que el usuario edita en el formulario del MVP. Principio 2: el modelo tiene más campos
 * (pronunciation, example, …) pero la UI del MVP sólo expone anverso/reverso.
 */
export interface CardContentDraft {
  front: string;
  back: string;
}
