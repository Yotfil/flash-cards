import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { BookRepository, type BookCreateInput } from '@domain/ports';
import type { Book, BookDraft, User } from '@domain/models';
import { AuthService } from './auth.service';
import { BooksService } from './books.service';

/** Repositorio de libros falso: guarda en memoria y registra la última creación, para verificar la
 *  lógica del servicio (asignación de `order`, estado) sin tocar Firestore. */
class FakeBookRepository extends BookRepository {
  books: Book[] = [];
  lastCreateInput: BookCreateInput | null = null;
  shouldFail = false;

  override async listByUser(): Promise<Book[]> {
    if (this.shouldFail) {
      throw new Error('falla de red simulada');
    }
    return [...this.books];
  }

  override async create(_uid: string, input: BookCreateInput): Promise<Book> {
    this.lastCreateInput = input;
    const book: Book = {
      id: `book-${this.books.length + 1}`,
      ...input,
      cardCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.books.push(book);
    return book;
  }

  override async update(): Promise<void> {
    // No usado en estas pruebas; el servicio sólo se ejercita en load/create.
  }

  override async delete(): Promise<void> {
    // No usado en estas pruebas.
  }
}

function buildBook(partial: Partial<Book>): Book {
  return {
    id: 'b',
    name: 'Libro',
    subject: 'general',
    studyDirection: 'forward',
    newCardsPerDay: 20,
    maxReviewsPerDay: 200,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

const SAMPLE_DRAFT: BookDraft = {
  name: 'Vocabulario',
  subject: 'language-en',
  studyDirection: 'both',
  newCardsPerDay: 15,
  maxReviewsPerDay: 100,
};

describe('BooksService', () => {
  let repository: FakeBookRepository;

  function configure(uid: string | null): BooksService {
    repository = new FakeBookRepository();
    const fakeAuth = { currentUser: signal<User | null>(uid ? buildUser(uid) : null) };
    TestBed.configureTestingModule({
      providers: [
        BooksService,
        { provide: BookRepository, useValue: repository },
        { provide: AuthService, useValue: fakeAuth },
      ],
    });
    return TestBed.inject(BooksService);
  }

  function buildUser(uid: string): User {
    return {
      id: uid,
      displayName: 'Test',
      email: 't@e.com',
      createdAt: new Date(),
      settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system' },
      isSearchable: false,
    };
  }

  it('carga los libros y pasa a "ready"', async () => {
    const service = configure('u1');
    repository.books = [buildBook({ id: 'x', order: 0 })];

    await service.load();

    expect(service.status()).toBe('ready');
    expect(service.books()).toHaveLength(1);
  });

  it('asigna order = máximo actual + 1 al crear', async () => {
    const service = configure('u1');
    repository.books = [buildBook({ id: 'a', order: 0 }), buildBook({ id: 'b', order: 5 })];
    await service.load();

    await service.create(SAMPLE_DRAFT);

    expect(repository.lastCreateInput?.order).toBe(6);
    expect(service.books()).toHaveLength(3);
  });

  it('asigna order = 0 al crear el primer libro', async () => {
    const service = configure('u1');
    await service.load();

    await service.create(SAMPLE_DRAFT);

    expect(repository.lastCreateInput?.order).toBe(0);
  });

  it('deja el estado en "error" si la carga falla', async () => {
    const service = configure('u1');
    repository.shouldFail = true;

    await service.load();

    expect(service.status()).toBe('error');
    expect(service.errorMessage()).not.toBeNull();
  });
});
