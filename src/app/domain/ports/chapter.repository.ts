// Puerto del repositorio de capítulos: acceso a la colección `/users/{uid}/chapters` sin saber que
// detrás está Firestore. Los capítulos son documentos planos con un campo `bookId` (spec §6); se
// consultan siempre en el contexto de su libro. La implementación vive en `infrastructure/firestore`.

import type { Chapter, ChapterDraft } from '../models';

/**
 * Datos necesarios para crear un capítulo: el `bookId` del libro al que pertenece, lo que controla
 * el usuario (`name`) y el `order` que asigna el servicio. El `id` y los timestamps los pone el
 * repositorio.
 */
export interface ChapterCreateInput {
  bookId: string;
  name: string;
  order: number;
}

export abstract class ChapterRepository {
  /** Lista los capítulos de un libro ordenados por `order` ascendente. */
  abstract listByBook(uid: string, bookId: string): Promise<Chapter[]>;

  /** Crea un capítulo y devuelve el modelo resultante (con `id` y timestamps ya asignados). */
  abstract create(uid: string, input: ChapterCreateInput): Promise<Chapter>;

  /** Aplica cambios parciales (renombrar) a un capítulo existente. */
  abstract update(uid: string, chapterId: string, changes: Partial<ChapterDraft>): Promise<void>;

  /** Borra un capítulo. */
  abstract delete(uid: string, chapterId: string): Promise<void>;
}
