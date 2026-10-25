import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { SessionService } from '@services/session/session.service';
import { BooksService } from '@services/books/books.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ChaptersService } from './chapters.service';

function setup(state: SessionState = { kind: 'active', user: aUser({ id: 'u1' }) }, online = true) {
  const repository = new FakeChapterRepository();
  const books = new FakeBookRepository();
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      { provide: ChapterRepository, useValue: repository },
      { provide: BookRepository, useValue: books },
      { provide: SessionService, useValue: new FakeSessionService(state) },
      { provide: ConnectivityPort, useValue: connectivity },
    ],
  });
  const service = TestBed.inject(ChaptersService);
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { service, repository, books, connectivity, settle };
}

describe('ChaptersService · recurso', () => {
  it('openBook lee los capítulos con el uid de la sesión y, repetido, vuelve a leer', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aChapter({ id: 'c1', bookId: 'b1' }));

    service.openBook('b1');
    await settle();
    service.openBook('b1');
    await settle();

    expect(repository.listedUids).toEqual(['u1', 'u1']);
    expect(service.chapters.value()?.map((chapter) => chapter.id)).toEqual(['c1']);
  });

  it('ensureLoaded no vuelve a leer el mismo libro, pero sí otro', async () => {
    const { service, repository, settle } = setup();

    service.openBook('b1');
    await settle();
    service.ensureLoaded('b1');
    await settle();
    expect(repository.calls.listByBook).toBe(1);

    service.ensureLoaded('b2');
    await settle();
    expect(repository.calls.listByBook).toBe(2);
  });

  it('si el repositorio falla, el recurso queda en error', async () => {
    const { service, repository, settle } = setup();
    repository.failWith.listByBook = new Error('offline');

    service.openBook('b1');
    await settle();

    expect(service.chapters.status()).toBe('error');
  });

  it('sin sesión falla con un error explícito y no lee nada', async () => {
    const { service, repository, settle } = setup({ kind: 'signedOut' });

    service.openBook('b1');
    await settle();

    expect(service.chapters.error()?.message).toBe('No hay una sesión activa.');
    expect(repository.calls.listByBook).toBe(0);
  });

  it('chapterById: undefined sin valor, null si no existe y el capítulo si existe', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aChapter({ id: 'c1', bookId: 'b1' }));
    const chapterId = signal('c1');
    const chapter = TestBed.runInInjectionContext(() => service.chapterById(chapterId));

    expect(chapter()).toBeUndefined();
    service.openBook('b1');
    await settle();
    expect(chapter()?.id).toBe('c1');

    chapterId.set('nadie');
    expect(chapter()).toBeNull();
  });
});

describe('ChaptersService · mutaciones', () => {
  async function opened(
    chapters = [aChapter({ id: 'c0', order: 0 }), aChapter({ id: 'c3', order: 3 })],
  ) {
    const context = setup();
    context.repository.seed(...chapters);
    context.service.openBook('b1');
    await context.settle();
    return context;
  }

  it('el primer capítulo va en la posición 0 del libro abierto', async () => {
    const { service } = await opened([]);

    const chapter = await service.create('Uno');

    expect(chapter).toMatchObject({ bookId: 'b1', name: 'Uno', order: 0 });
  });

  it('el nuevo va después del de mayor orden, recortado y al final, sin releer', async () => {
    const { service, repository } = await opened();

    const chapter = await service.create('  Phrasal verbs  ');

    expect(chapter).toMatchObject({ name: 'Phrasal verbs', order: 4 });
    expect(
      service.chapters
        .value()
        ?.map((item) => item.id)
        .at(-1),
    ).toBe(chapter.id);
    expect(repository.calls.listByBook).toBe(1);
  });

  it('sin sesión crear lanza sin tocar el repositorio', async () => {
    const { service, repository, settle } = setup({ kind: 'signedOut' });
    service.openBook('b1');
    await settle();

    await expect(service.create('Uno')).rejects.toThrow('No hay una sesión activa.');
    expect(repository.calls.create).toBe(0);
  });

  it('renombrar conserva la posición y refleja el nombre', async () => {
    const { service } = await opened();

    const renamed = await service.rename('c3', '  Verbos  ');

    expect(renamed).toMatchObject({ id: 'c3', name: 'Verbos', order: 3 });
    expect(service.chapters.value()?.find((chapter) => chapter.id === 'c3')?.name).toBe('Verbos');
  });

  it('borrar quita el capítulo tras el éxito, descuenta sus tarjetas del libro y devuelve cuántas', async () => {
    const { service, repository, books, settle } = await opened();
    books.seed(aBook({ id: 'b1', cardCount: 100 }));
    const booksService = TestBed.inject(BooksService);
    booksService.reload();
    await settle();
    repository.setCardCount('c3', 42);

    const deleted = await service.remove('c3');

    expect(deleted).toBe(42);
    expect(repository.calls.deleteWithCards).toBe(1);
    expect(service.chapters.value()?.map((chapter) => chapter.id)).toEqual(['c0']);
    expect(booksService.findById('b1')?.cardCount).toBe(58);
  });

  it('si el borrado falla relanza y la lista no cambia', async () => {
    const { service, repository } = await opened();
    repository.failWith.deleteWithCards = new Error('offline');

    await expect(service.remove('c3')).rejects.toThrow('offline');
    expect(service.chapters.value()?.map((chapter) => chapter.id)).toEqual(['c0', 'c3']);
  });

  it('tras borrar uno del medio, el siguiente va después del mayor', async () => {
    const { service } = await opened([
      aChapter({ id: 'a', order: 0 }),
      aChapter({ id: 'b', order: 1 }),
      aChapter({ id: 'c', order: 2 }),
    ]);

    await service.remove('b');
    const chapter = await service.create('Nuevo');

    expect(chapter.order).toBe(3);
  });
});

describe('ChaptersService · conteos', () => {
  it('countCards pregunta al repositorio', async () => {
    const { service, repository } = setup();
    repository.setCardCount('c1', 42);

    expect(await service.countCards('c1')).toBe(42);
  });

  it('cardCountFor con red cuenta las tarjetas del capítulo', async () => {
    const { service, repository, settle } = setup();
    repository.setCardCount('c1', 1);

    const count = TestBed.runInInjectionContext(() => service.cardCountFor(signal('c1')));
    await settle();

    expect(count.value()).toBe(1);
  });

  it('sin red no cuenta y, al volver la red, pide', async () => {
    const { service, repository, connectivity, settle } = setup(
      { kind: 'active', user: aUser({ id: 'u1' }) },
      false,
    );
    repository.setCardCount('c1', 42);

    const count = TestBed.runInInjectionContext(() => service.cardCountFor(signal('c1')));
    await settle();
    expect(repository.calls.countCards).toBe(0);
    expect(count.value()).toBeUndefined();

    connectivity.setOnline(true);
    await settle();
    expect(repository.calls.countCards).toBe(1);
    expect(count.value()).toBe(42);
  });
});
