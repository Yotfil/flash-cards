// Puerto del repositorio de tarjetas: acceso a la colección plana `/users/{uid}/cards` sin saber
// que detrás está Firestore. Las tarjetas son planas (campos `bookId`/`chapterId`) porque la cola
// diaria necesita consultarlas todas de una vez (spec §4). La implementación vive en
// `infrastructure/firestore`.

import type { Card, CardContentDraft, CardScheduling } from '../models';

/**
 * Datos necesarios para crear una tarjeta: el documento completo salvo lo que pone el repositorio
 * (`id` y timestamps). El servicio arma el resto (relaciones, `scheduling` inicial, `suspended`).
 */
export type CardCreateInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;

export abstract class CardRepository {
  /** Lista las tarjetas de un capítulo ordenadas por antigüedad (orden de creación). */
  abstract listByChapter(uid: string, chapterId: string): Promise<Card[]>;

  /** Lista todas las tarjetas de un libro (para estudiar el libro completo). */
  abstract listByBook(uid: string, bookId: string): Promise<Card[]>;

  /** Lista las tarjetas con `scheduling.due ≤ endOfDay` (candidatas de la cola diaria: vencidas y
   *  nuevas, ya que las nuevas tienen `due` en el pasado). */
  abstract listDue(uid: string, endOfDay: Date): Promise<Card[]>;

  /** Crea una tarjeta y devuelve el modelo resultante (con `id` y timestamps ya asignados). */
  abstract create(uid: string, input: CardCreateInput): Promise<Card>;

  /** Crea muchas tarjetas de una vez (importación). Devuelve las tarjetas creadas. */
  abstract createMany(uid: string, inputs: CardCreateInput[]): Promise<Card[]>;

  /** Aplica cambios de contenido (anverso/reverso) a una tarjeta existente. */
  abstract update(uid: string, cardId: string, changes: Partial<CardContentDraft>): Promise<void>;

  /** Reescribe el bloque de programación de una tarjeta (tras calificarla). */
  abstract updateScheduling(uid: string, cardId: string, scheduling: CardScheduling): Promise<void>;

  /** Borra una tarjeta. */
  abstract delete(uid: string, cardId: string): Promise<void>;
}
