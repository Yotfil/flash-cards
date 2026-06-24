// Puerto del repositorio de libros: acceso a la colección `/users/{uid}/books` sin saber que
// detrás está Firestore. La implementación vive en `infrastructure/firestore`. Todas las
// operaciones reciben el `uid` del dueño: el aislamiento por usuario es del dominio, no un detalle
// del adaptador.

import type { Book, BookDraft } from '../models';

/**
 * Datos necesarios para crear un libro: lo que controla el usuario (`BookDraft`) más el `order`
 * que asigna el servicio. El `id`, `cardCount` y los timestamps los pone el repositorio.
 */
export type BookCreateInput = BookDraft & { order: number };

export abstract class BookRepository {
  /** Lista los libros del usuario ordenados por `order` ascendente. */
  abstract listByUser(uid: string): Promise<Book[]>;

  /** Crea un libro y devuelve el modelo resultante (con `id` y timestamps ya asignados). */
  abstract create(uid: string, input: BookCreateInput): Promise<Book>;

  /** Aplica cambios parciales a un libro existente. */
  abstract update(uid: string, bookId: string, changes: Partial<BookDraft>): Promise<void>;

  /** Borra un libro. */
  abstract delete(uid: string, bookId: string): Promise<void>;
}
