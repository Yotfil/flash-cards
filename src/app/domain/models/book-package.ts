import type { CardContentDraft } from './card.model';

// El contenido de un libro, separable de su progreso: nombre, materia, capítulos y tarjetas, sin
// ids, fechas ni programación. Es lo que produce la importación, lo que escribe su repositorio y
// lo que la exportación construye desde un libro guardado ("un archivo = un libro").
export interface BookPackage {
  name: string;
  subject: string;
  chapters: PackageChapter[];
}

export interface PackageChapter {
  name: string;
  cards: CardContentDraft[];
}
