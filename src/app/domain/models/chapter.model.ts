// El capítulo (`/users/{uid}/chapters/{chapterId}`). Especificación §6.5.

export interface Chapter {
  id: string;
  bookId: string;
  name: string;
  /** Orden dentro del libro (orden de aparición en el import). */
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Campos que el usuario controla al crear o renombrar un capítulo. El `id`, `bookId`, `order` y los
 * timestamps los gestiona el sistema (repositorio/servicio), no el formulario.
 */
export interface ChapterDraft {
  name: string;
}
