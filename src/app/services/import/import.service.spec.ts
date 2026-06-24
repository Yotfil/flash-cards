import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ImportRepository, SchedulingPort, type ImportBookInput } from '@domain/ports';
import { type Book, type CardScheduling, CardState, type User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { BooksService } from '@services/books.service';
import { ImportService } from './import.service';
import type { ParseResult } from './flashcard-parser';

const SCHEDULING: CardScheduling = {
  due: new Date('2026-06-23T00:00:00Z'),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: CardState.New,
  lastReview: null,
};

class FakeImportRepository extends ImportRepository {
  lastInput: ImportBookInput | null = null;
  override async importBook(_uid: string, input: ImportBookInput): Promise<string> {
    this.lastInput = input;
    return 'book-new';
  }
}

class FakeSchedulingPort extends SchedulingPort {
  override createInitialScheduling(): CardScheduling {
    return { ...SCHEDULING };
  }

  override schedule(): never {
    throw new Error('no usado en estas pruebas');
  }
}

class FakeBooksService {
  added: Book[] = [];
  ensureLoadedCalls = 0;
  async ensureLoaded(): Promise<void> {
    this.ensureLoadedCalls++;
  }
  nextBookOrder(): number {
    return 2;
  }
  addLocal(book: Book): void {
    this.added.push(book);
  }
}

const PARSE_RESULT: ParseResult = {
  chapters: [
    {
      name: 'Cap 1',
      cards: [
        { front: 'a', back: '1' },
        { front: 'b', back: '2' },
      ],
    },
    { name: 'Cap 2', cards: [{ front: 'c', back: '3' }] },
  ],
  errors: [],
  validCardCount: 3,
};

describe('ImportService', () => {
  let repository: FakeImportRepository;
  let books: FakeBooksService;

  function configure(): ImportService {
    repository = new FakeImportRepository();
    books = new FakeBooksService();
    const user: User = {
      id: 'u1',
      displayName: 'Test',
      email: 't@e.com',
      createdAt: new Date(),
      settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system' },
      isSearchable: false,
    };
    TestBed.configureTestingModule({
      providers: [
        ImportService,
        { provide: ImportRepository, useValue: repository },
        { provide: SchedulingPort, useClass: FakeSchedulingPort },
        { provide: BooksService, useValue: books },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(user) } },
      ],
    });
    return TestBed.inject(ImportService);
  }

  it('arma el libro con order de BooksService, subject por defecto y cardCount = total', async () => {
    const service = configure();

    const summary = await service.importBook('  Phrasal Verbs  ', PARSE_RESULT);

    expect(books.ensureLoadedCalls).toBe(1);
    expect(repository.lastInput?.book).toMatchObject({
      name: 'Phrasal Verbs',
      subject: 'general',
      studyDirection: 'forward',
      order: 2,
      cardCount: 3,
    });
    expect(summary).toEqual({ bookId: 'book-new', chapterCount: 2, cardCount: 3 });
  });

  it('mapea capítulos con order por índice y tarjetas forward con scheduling inicial', async () => {
    const service = configure();

    await service.importBook('L', PARSE_RESULT);

    const chapters = repository.lastInput?.chapters ?? [];
    expect(chapters.map((chapter) => chapter.order)).toEqual([0, 1]);
    expect(chapters[0]?.cards).toHaveLength(2);
    const firstCard = chapters[0]?.cards[0];
    expect(firstCard?.direction).toBe('forward');
    expect(firstCard?.suspended).toBe(false);
    expect(firstCard?.scheduling.state).toBe(CardState.New);
    expect(firstCard?.noteId).toBeTruthy();
  });

  it('añade el libro creado a la lista local de BooksService', async () => {
    const service = configure();

    await service.importBook('Mi libro', PARSE_RESULT);

    expect(books.added).toHaveLength(1);
    expect(books.added[0]).toMatchObject({ id: 'book-new', name: 'Mi libro', cardCount: 3 });
  });

  it('usa un nombre por defecto si el nombre va vacío', async () => {
    const service = configure();

    await service.importBook('   ', PARSE_RESULT);

    expect(repository.lastInput?.book.name).toBe('Libro importado');
  });
});
