// Un capítulo (`/users/{uid}/chapters/{chapterId}`): agrupa las tarjetas de un libro.
export interface Chapter {
  id: string;
  bookId: string;
  /** Puede venir vacío en capítulos de versiones anteriores ("Capítulo sin nombre" al pintar). */
  name: string;
  /** Posición dentro del libro; puede tener huecos tras borrar. */
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
