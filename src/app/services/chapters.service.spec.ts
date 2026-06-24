import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ChapterRepository, type ChapterCreateInput } from '@domain/ports';
import type { Chapter, User } from '@domain/models';
import { AuthService } from './auth.service';
import { ChaptersService } from './chapters.service';

/** Repositorio de capítulos falso: guarda en memoria y registra la última creación, para verificar
 *  la lógica del servicio (asignación de `order`, estado) sin tocar Firestore. */
class FakeChapterRepository extends ChapterRepository {
  chapters: Chapter[] = [];
  lastCreateInput: ChapterCreateInput | null = null;
  shouldFail = false;

  override async listByBook(): Promise<Chapter[]> {
    if (this.shouldFail) {
      throw new Error('falla de red simulada');
    }
    return [...this.chapters];
  }

  override async create(_uid: string, input: ChapterCreateInput): Promise<Chapter> {
    this.lastCreateInput = input;
    const chapter: Chapter = {
      id: `chapter-${this.chapters.length + 1}`,
      bookId: input.bookId,
      name: input.name,
      order: input.order,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chapters.push(chapter);
    return chapter;
  }

  override async update(): Promise<void> {
    // No usado en estas pruebas.
  }

  override async delete(): Promise<void> {
    // No usado en estas pruebas.
  }
}

function buildChapter(partial: Partial<Chapter>): Chapter {
  return {
    id: 'c',
    bookId: 'book-1',
    name: 'Capítulo',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('ChaptersService', () => {
  let repository: FakeChapterRepository;

  function configure(uid: string | null): ChaptersService {
    repository = new FakeChapterRepository();
    const fakeAuth = { currentUser: signal<User | null>(uid ? buildUser(uid) : null) };
    TestBed.configureTestingModule({
      providers: [
        ChaptersService,
        { provide: ChapterRepository, useValue: repository },
        { provide: AuthService, useValue: fakeAuth },
      ],
    });
    return TestBed.inject(ChaptersService);
  }

  function buildUser(uid: string): User {
    return {
      id: uid,
      displayName: 'Test',
      email: 't@e.com',
      createdAt: new Date(),
      settings: {
        timezone: 'UTC',
        dayStartHour: 4,
        theme: 'system',
        defaultNewCardsPerDay: 20,
        autoGradeByTime: true,
      },
      isSearchable: false,
    };
  }

  it('carga los capítulos y pasa a "ready"', async () => {
    const service = configure('u1');
    repository.chapters = [buildChapter({ id: 'x', order: 0 })];

    await service.load('book-1');

    expect(service.status()).toBe('ready');
    expect(service.chapters()).toHaveLength(1);
  });

  it('asigna order = máximo actual + 1 al crear', async () => {
    const service = configure('u1');
    repository.chapters = [
      buildChapter({ id: 'a', order: 0 }),
      buildChapter({ id: 'b', order: 3 }),
    ];
    await service.load('book-1');

    await service.create('book-1', 'Nuevo');

    expect(repository.lastCreateInput?.order).toBe(4);
    expect(service.chapters()).toHaveLength(3);
  });

  it('asigna order = 0 al crear el primer capítulo', async () => {
    const service = configure('u1');
    await service.load('book-1');

    await service.create('book-1', 'Primero');

    expect(repository.lastCreateInput?.order).toBe(0);
  });

  it('deja el estado en "error" si la carga falla', async () => {
    const service = configure('u1');
    repository.shouldFail = true;

    await service.load('book-1');

    expect(service.status()).toBe('error');
    expect(service.errorMessage()).not.toBeNull();
  });
});
