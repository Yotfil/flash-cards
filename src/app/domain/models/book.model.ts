// Un libro (`/users/{uid}/books/{bookId}`): la fuente de un tema, con sus capítulos y tarjetas.

/**
 * Dirección de estudio. Al crear siempre es `forward`; `both` solo existe en libros de versiones
 * anteriores y se conserva al editar (el estudio en ambos sentidos no está implementado).
 */
export type StudyDirection = 'forward' | 'both';

export interface Book {
  id: string;
  name: string;
  /** Materia como etiqueta libre (materia-agnóstico): "general" si se deja vacía. */
  subject: string;
  studyDirection: StudyDirection;
  /** Tanda de tarjetas nuevas por día. */
  newCardsPerDay: number;
  /** Tope de repasos por día; 0 = sin tope. */
  maxReviewsPerDay: number;
  /** Posición en la Biblioteca. */
  order: number;
  /** Conteo de tarjetas mantenido al crear o borrar tarjetas; ausente en libros antiguos. */
  cardCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Lo que el usuario y el sistema deciden de un libro; id, contador y fechas los pone el almacén. */
export interface BookDraft {
  name: string;
  subject: string;
  studyDirection: StudyDirection;
  newCardsPerDay: number;
  maxReviewsPerDay: number;
}

/** Cuánto contenido se borraría con el libro. */
export interface BookContents {
  chapters: number;
  cards: number;
}

/** Tarjetas del libro por estado: nuevas, en aprendizaje (incluye reaprendiendo) y dominadas. */
export interface CardStateTotals {
  newCards: number;
  learning: number;
  review: number;
}
