// Metadatos de un libro (`/users/{uid}/books/{bookId}`). El libro es la "fuente".
// Especificación §6.4.

/** Dirección de estudio del libro. "both" habilita tarjetas inversas (§6.10). */
export type StudyDirection = 'forward' | 'both';

export interface Book {
  id: string;
  name: string;
  /**
   * Materia. Materia-agnóstico (Principio 1): en el MVP solo se guarda como etiqueta; a
   * futuro adapta UI y moldes de práctica. Ej. "language-en", "medicine", "general".
   */
  subject: string;
  studyDirection: StudyDirection;
  /** Tope de tarjetas nuevas por día (la "tanda"). Default 20. */
  newCardsPerDay: number;
  /** Tope de repasos por día; 0 = sin tope. Default 200. */
  maxReviewsPerDay: number;
  /** Orden del libro en la biblioteca. */
  order: number;
  /** Conteo denormalizado de tarjetas; se actualiza en import/borrado masivo. */
  cardCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Campos que el usuario controla al crear o editar un libro. El `id`, `order`, `cardCount` y los
 * timestamps los gestiona el sistema (repositorio/servicio), no el formulario.
 */
export interface BookDraft {
  name: string;
  subject: string;
  studyDirection: StudyDirection;
  newCardsPerDay: number;
  maxReviewsPerDay: number;
}
