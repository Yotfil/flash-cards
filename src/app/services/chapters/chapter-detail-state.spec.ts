import { aBook } from '@testing/fake-book-repository';
import { aChapter } from '@testing/fake-chapter-repository';

import { resolveChapterDetail } from './chapter-detail-state';

const book = aBook({ id: 'b1' });
const chapter = aChapter({ id: 'c1', bookId: 'b1' });
const ready = { booksStatus: 'resolved', book, chaptersStatus: 'resolved', chapter } as const;

describe('resolveChapterDetail', () => {
  it('el error de libros va primero', () => {
    expect(
      resolveChapterDetail({ ...ready, booksStatus: 'error', chaptersStatus: 'error' }),
    ).toEqual({
      kind: 'error',
      failed: 'books',
    });
  });

  it('con el libro sin resolver está cargando', () => {
    expect(resolveChapterDetail({ ...ready, booksStatus: 'loading', book: undefined })).toEqual({
      kind: 'loading',
    });
  });

  it('con el libro inexistente, falta el libro (aunque fallen los capítulos)', () => {
    expect(resolveChapterDetail({ ...ready, book: null, chaptersStatus: 'error' })).toEqual({
      kind: 'bookMissing',
    });
  });

  it('con el libro y error de capítulos, el fallo es de capítulos', () => {
    expect(resolveChapterDetail({ ...ready, chaptersStatus: 'error', chapter: undefined })).toEqual(
      {
        kind: 'error',
        failed: 'chapters',
      },
    );
  });

  it('con el capítulo sin resolver está cargando', () => {
    expect(
      resolveChapterDetail({ ...ready, chaptersStatus: 'loading', chapter: undefined }),
    ).toEqual({
      kind: 'loading',
    });
  });

  it('con el capítulo inexistente, falta el capítulo y se conoce el libro', () => {
    expect(resolveChapterDetail({ ...ready, chapter: null })).toEqual({
      kind: 'chapterMissing',
      book,
    });
  });

  it('con ambos, listo', () => {
    expect(resolveChapterDetail(ready)).toEqual({ kind: 'ready', book, chapter });
  });
});
