// Puerto de importación: escribe de una vez un libro completo (libro + capítulos + tarjetas) de
// forma consistente. Es una operación de escritura multi-colección que debe quedar atómica, por eso
// tiene su propio puerto en vez de encadenar los repos sueltos. La implementación (Firestore) usa un
// batch. El servicio arma el contenido; el repositorio asigna ids y relaciones.

import type { Book, CardDirection, CardScheduling, CardType } from '../models';

/** Una tarjeta a importar, sin ids ni relaciones (el repositorio les pone `bookId`/`chapterId`). */
export interface ImportCardInput {
  noteId: string;
  direction: CardDirection;
  cardType: CardType;
  front: string;
  back: string;
  scheduling: CardScheduling;
  suspended: boolean;
}

export interface ImportChapterInput {
  name: string;
  order: number;
  cards: ImportCardInput[];
}

export interface ImportBookInput {
  /** Metadatos del libro a crear (sin `id` ni timestamps, que pone el repositorio). */
  book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;
  chapters: ImportChapterInput[];
}

export abstract class ImportRepository {
  /** Crea el libro con sus capítulos y tarjetas. Devuelve el id del libro creado. */
  abstract importBook(uid: string, input: ImportBookInput): Promise<string>;
}
