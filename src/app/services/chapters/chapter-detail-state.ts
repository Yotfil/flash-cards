import type { Book } from '@domain/models/book.model';
import type { Chapter } from '@domain/models/chapter.model';

export interface ChapterDetailInput {
  /** Estado del recurso de libros (`'error'` si falló la lectura). */
  readonly booksStatus: string;
  /** `undefined` mientras no se sabe, `null` si no existe. */
  readonly book: Book | null | undefined;
  readonly chaptersStatus: string;
  readonly chapter: Chapter | null | undefined;
}

export type ChapterDetailState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly failed: 'books' | 'chapters' }
  | { readonly kind: 'bookMissing' }
  | { readonly kind: 'chapterMissing'; readonly book: Book }
  | { readonly kind: 'ready'; readonly book: Book; readonly chapter: Chapter };

/**
 * Qué pinta el detalle de un capítulo a partir de dos recursos (libros y capítulos). La precedencia
 * importa: primero el libro (su error, su carga, su ausencia) y solo después el capítulo.
 */
export function resolveChapterDetail(input: ChapterDetailInput): ChapterDetailState {
  if (input.booksStatus === 'error') {
    return { kind: 'error', failed: 'books' };
  }
  if (input.book === undefined) {
    return { kind: 'loading' };
  }
  if (input.book === null) {
    return { kind: 'bookMissing' };
  }
  if (input.chaptersStatus === 'error') {
    return { kind: 'error', failed: 'chapters' };
  }
  if (input.chapter === undefined) {
    return { kind: 'loading' };
  }
  if (input.chapter === null) {
    return { kind: 'chapterMissing', book: input.book };
  }
  return { kind: 'ready', book: input.book, chapter: input.chapter };
}
