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
