import type { Chapter } from '@domain/models/chapter.model';
import { ChapterRepository } from '@domain/ports/chapter.repository';

type FailableMethod = 'listByBook' | 'create' | 'rename' | 'countCards' | 'deleteWithCards';

// Fake en memoria del repositorio de capítulos. `setCardCount` fija cuántas tarjetas "tiene" un
// capítulo (lo que cuentan y borran); `failWith` hace fallar un método; `calls` cuenta llamadas.
export class FakeChapterRepository extends ChapterRepository {
  readonly chapters = new Map<string, Chapter>();
  readonly cardCounts = new Map<string, number>();
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};
  readonly calls: Record<FailableMethod, number> = {
    listByBook: 0,
    create: 0,
    rename: 0,
    countCards: 0,
    deleteWithCards: 0,
  };
  readonly listedUids: string[] = [];
  private nextId = 1;

  seed(...chapters: Chapter[]): void {
    for (const chapter of chapters) {
      this.chapters.set(chapter.id, chapter);
    }
  }

  setCardCount(chapterId: string, count: number): void {
    this.cardCounts.set(chapterId, count);
  }

  async listByBook(uid: string, bookId: string): Promise<Chapter[]> {
    this.record('listByBook');
    this.listedUids.push(uid);
    return [...this.chapters.values()]
      .filter((chapter) => chapter.bookId === bookId)
      .sort((a, b) => a.order - b.order);
  }

  async create(
    _uid: string,
    chapter: { bookId: string; name: string; order: number },
  ): Promise<Chapter> {
    this.record('create');
    const now = new Date();
    const created: Chapter = {
      id: `ch${this.nextId++}`,
      ...chapter,
      createdAt: now,
      updatedAt: now,
    };
    this.chapters.set(created.id, created);
    return created;
  }

  async rename(_uid: string, chapterId: string, name: string): Promise<void> {
    this.record('rename');
    const chapter = this.chapters.get(chapterId);
    if (chapter) {
      this.chapters.set(chapterId, { ...chapter, name, updatedAt: new Date() });
    }
  }

  async countCards(_uid: string, chapterId: string): Promise<number> {
    this.record('countCards');
    return this.cardCounts.get(chapterId) ?? 0;
  }

  async deleteWithCards(_uid: string, _bookId: string, chapterId: string): Promise<number> {
    this.record('deleteWithCards');
    const deleted = this.cardCounts.get(chapterId) ?? 0;
    this.chapters.delete(chapterId);
    this.cardCounts.delete(chapterId);
    return deleted;
  }

  private record(method: FailableMethod): void {
    this.calls[method]++;
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

/** Capítulo de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function aChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    bookId: 'b1',
    name: 'Básicos',
    order: 0,
    createdAt: new Date('2026-06-15T10:00:00.000Z'),
    updatedAt: new Date('2026-06-15T10:00:00.000Z'),
    ...overrides,
  };
}
