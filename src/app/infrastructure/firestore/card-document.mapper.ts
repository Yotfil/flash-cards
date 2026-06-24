// Mapeo PURO de una tarjeta del dominio al documento Firestore (Dates → Timestamp, opcionales sólo
// si presentes). Vive aparte para que lo compartan el repositorio de tarjetas y el de importación,
// sin duplicar la conversión del bloque `scheduling`.

import { Timestamp } from 'firebase/firestore';

import type { CardScheduling } from '@domain/models';
import type { CardCreateInput } from '@domain/ports';

/** El bloque `scheduling` con las fechas convertidas a Timestamp para Firestore. */
export function schedulingToFirestore(scheduling: CardScheduling): Record<string, unknown> {
  return {
    due: Timestamp.fromDate(scheduling.due),
    stability: scheduling.stability,
    difficulty: scheduling.difficulty,
    elapsedDays: scheduling.elapsedDays,
    scheduledDays: scheduling.scheduledDays,
    learningSteps: scheduling.learningSteps,
    reps: scheduling.reps,
    lapses: scheduling.lapses,
    state: scheduling.state,
    lastReview: scheduling.lastReview === null ? null : Timestamp.fromDate(scheduling.lastReview),
  };
}

function assignOptional(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

/** Documento Firestore de una tarjeta. `now` se usa para `createdAt`/`updatedAt`. */
export function cardToFirestoreDocument(
  input: CardCreateInput,
  now: Date,
): Record<string, unknown> {
  const document: Record<string, unknown> = {
    bookId: input.bookId,
    chapterId: input.chapterId,
    noteId: input.noteId,
    direction: input.direction,
    front: input.front,
    back: input.back,
    scheduling: schedulingToFirestore(input.scheduling),
    suspended: input.suspended,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  // Firestore rechaza `undefined`: los opcionales de contenido sólo se incluyen si están presentes.
  assignOptional(document, 'pronunciation', input.pronunciation);
  assignOptional(document, 'example', input.example);
  assignOptional(document, 'audioUrl', input.audioUrl);
  assignOptional(document, 'notes', input.notes);
  assignOptional(document, 'tags', input.tags);
  return document;
}
