import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { CardCollectionChanges } from '@services/progress/card-collection-changes';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { BooksService } from './books.service';

function activeSession(defaultNewCardsPerDay = 20): SessionState {
  const user = aUser({ id: 'u1' });
  return {
    kind: 'active',
    user: { ...user, settings: { ...user.settings, defaultNewCardsPerDay } },
  };
}

function setup(state: SessionState = activeSession(), online = true) {
  const repository = new FakeBookRepository();
  const session = new FakeSessionService(state);
  const connectivity = new FakeConnectivity(online);
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: repository },
      { provide: SessionService, useValue: session },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: logger },
    ],
  });
  const service = TestBed.inject(BooksService);
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { service, repository, session, connectivity, logger, settle };
}

describe('BooksService · recurso', () => {
  it('reload() lee los libros del usuario de la sesión', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aBook({ id: 'b1', order: 1 }), aBook({ id: 'b2', order: 0 }));

    service.reload();
    await settle();

    expect(repository.listedUids).toEqual(['u1']);
    expect(service.books.status()).toBe('resolved');
    expect(service.books.value()?.map((book) => book.id)).toEqual(['b2', 'b1']);
  });

  it('si la lectura falla (un libro que la frontera rechaza), queda registrada', async () => {
    const { service, repository, logger, settle } = setup();
    const failure = new Error('Documento inválido en users/u1/books/b1');
    repository.failWith.listByUser = failure;

    service.reload();
    await settle();

    expect(service.books.status()).toBe('error');
    expect(logger.entries).toContainEqual({
      level: 'error',
      message: 'No se pudo leer la Biblioteca',
      cause: failure,
    });
  });

  it('una lectura fallida no se reutiliza: pedir la lista otra vez vuelve a leer', async () => {
    const { service, repository } = setup();
    repository.failWith.listByUser = new Error('offline');
    await expect(service.ensureLoaded()).rejects.toThrow('offline');

    delete repository.failWith.listByUser;
    repository.seed(aBook({ id: 'b1' }));

    expect((await service.ensureLoaded()).map((book) => book.id)).toEqual(['b1']);
  });

  it('si el repositorio falla, el recurso queda en error', async () => {
    const { service, repository, settle } = setup();
    repository.failWith.listByUser = new Error('offline');

    service.reload();
    await settle();

    expect(service.books.status()).toBe('error');
  });

  it('sin sesión falla con un error explícito y no lee nada', async () => {
    const { service, repository, settle } = setup({ kind: 'signedOut' });

    service.reload();
    await settle();

    expect(service.books.status()).toBe('error');
    expect(service.books.error()?.message).toBe('No hay una sesión activa.');
    expect(repository.calls.listByUser).toBe(0);
  });

  it('ensureLoaded() carga una sola vez y entrega la lista', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aBook({ id: 'b1' }));

    const first = await service.ensureLoaded();
    await settle();
    const second = await service.ensureLoaded();

    expect(first.map((book) => book.id)).toEqual(['b1']);
    expect(second.map((book) => book.id)).toEqual(['b1']);
    expect(repository.calls.listByUser).toBe(1);
  });

  it('findById: undefined mientras carga, null si no existe y el libro si existe', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aBook({ id: 'b1' }));

    expect(service.findById('b1')).toBeUndefined();
    service.reload();
    await settle();

    expect(service.findById('b1')?.id).toBe('b1');
    expect(service.findById('nadie')).toBeNull();
  });
});

/** Deja en espera las lecturas del servidor (las del dispositivo responden al instante). */
function holdServerReads(repository: FakeBookRepository): () => void {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const list = repository.listByUser.bind(repository);
  repository.listByUser = async (uid, source) => {
    if (source !== 'device') {
      await gate;
    }
    return list(uid, source);
  };
  return release;
}

describe('BooksService · lo guardado en el dispositivo primero', () => {
  it('pinta al instante los libros guardados y después los del servidor, con una sola lectura', async () => {
    const { service, repository, settle } = setup();
    repository.seedOnDevice(aBook({ id: 'b1', order: 0 }));
    repository.seed(aBook({ id: 'b1', order: 0 }), aBook({ id: 'b2', order: 1 }));
    const release = holdServerReads(repository);

    service.reload();
    await settle();
    expect(service.books.hasValue()).toBe(true);
    expect(service.books.value()?.map((book) => book.id)).toEqual(['b1']);

    release();
    await settle();
    expect(service.books.value()?.map((book) => book.id)).toEqual(['b1', 'b2']);
    expect(repository.calls.listByUser).toBe(1);
  });

  it('sin nada guardado sigue cargando hasta que responde el servidor', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aBook({ id: 'b1' }));
    const release = holdServerReads(repository);

    service.reload();
    // Sin esperar a que la app quede estable: con el servidor en espera, el recurso no lo está.
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    expect(service.books.status()).toBe('loading');
    expect(service.books.hasValue()).toBe(false);

    release();
    await settle();
    expect(service.books.value()?.map((book) => book.id)).toEqual(['b1']);
  });

  it('si el servidor falla con lo guardado a la vista, la lista se queda y el fallo se registra una vez', async () => {
    const { service, repository, logger, settle } = setup();
    repository.seedOnDevice(aBook({ id: 'b1' }));
    const failure = new Error('unavailable');
    repository.failWith.listByUser = failure;

    service.reload();
    await settle();

    expect(service.books.status()).not.toBe('error');
    expect(service.books.value()?.map((book) => book.id)).toEqual(['b1']);
    expect(logger.entries).toEqual([
      { level: 'error', message: 'No se pudo leer la Biblioteca', cause: failure },
    ]);
  });

  it('loadFresh y ensureLoaded entregan la lectura del servidor, no lo guardado', async () => {
    const { service, repository } = setup();
    repository.seedOnDevice(aBook({ id: 'viejo' }));
    repository.seed(aBook({ id: 'b1' }));

    expect((await service.loadFresh()).map((book) => book.id)).toEqual(['b1']);
    expect((await service.ensureLoaded()).map((book) => book.id)).toEqual(['b1']);
    expect(repository.calls.listByUser).toBe(1);
  });
});

describe('BooksService · siguiente posición', () => {
  it('sin libros, el siguiente va en la posición 0; si no, después del último', async () => {
    const empty = setup();
    empty.service.reload();
    await empty.settle();
    expect(empty.service.nextOrder()).toBe(0);
    TestBed.resetTestingModule();

    const { service, repository, settle } = setup();
    repository.seed(aBook({ id: 'b1', order: 0 }), aBook({ id: 'b2', order: 5 }));
    service.reload();
    await settle();
    expect(service.nextOrder()).toBe(6);
  });
});

describe('BooksService · mutaciones', () => {
  async function loaded(books = [aBook({ id: 'b1', order: 0 }), aBook({ id: 'b2', order: 5 })]) {
    const context = setup(activeSession(7));
    context.repository.seed(...books);
    context.service.reload();
    await context.settle();
    return context;
  }

  it('crear siembra nuevas del perfil, 200 repasos, anverso→reverso y "general"', async () => {
    const { service, repository } = await loaded([]);

    const book = await service.create({ name: '  Francés  ', subject: '   ' });

    expect(book).toMatchObject({
      name: 'Francés',
      subject: 'general',
      newCardsPerDay: 7,
      maxReviewsPerDay: 200,
      studyDirection: 'forward',
      order: 0,
      cardCount: 0,
    });
    expect(repository.calls.create).toBe(1);
    expect(service.books.value()?.map((item) => item.name)).toEqual(['Francés']);
  });

  it('el libro nuevo va después del de mayor orden y al final de la lista, sin releer', async () => {
    const { service, repository } = await loaded();

    const book = await service.create({ name: 'Química', subject: 'ciencias' });

    expect(book.order).toBe(6);
    expect(book.subject).toBe('ciencias');
    expect(
      service.books
        .value()
        ?.map((item) => item.id)
        .at(-1),
    ).toBe(book.id);
    expect(repository.calls.listByUser).toBe(1);
  });

  it('editar cambia nombre y materia y conserva topes y dirección', async () => {
    const legacy = aBook({
      id: 'b1',
      studyDirection: 'both',
      newCardsPerDay: 12,
      maxReviewsPerDay: 150,
    });
    const { service, repository } = await loaded([legacy]);

    const updated = await service.update('b1', { name: 'Inglés B2', subject: '' });

    expect(updated).toMatchObject({
      name: 'Inglés B2',
      subject: 'general',
      studyDirection: 'both',
      newCardsPerDay: 12,
      maxReviewsPerDay: 150,
    });
    expect(repository.books.get('b1')?.studyDirection).toBe('both');
    expect(service.findById('b1')?.name).toBe('Inglés B2');
  });

  it('los ajustes por libro cambian solo los topes', async () => {
    const { service, repository } = await loaded([aBook({ id: 'b1', name: 'Inglés' })]);

    await service.update('b1', { newCardsPerDay: 5, maxReviewsPerDay: 150 });

    expect(repository.books.get('b1')).toMatchObject({
      name: 'Inglés',
      newCardsPerDay: 5,
      maxReviewsPerDay: 150,
    });
    expect(service.findById('b1')?.newCardsPerDay).toBe(5);
  });

  it('borrar un libro avisa que la colección cambió, también si falla', async () => {
    const { service, repository } = await loaded();
    const changes = TestBed.inject(CardCollectionChanges);

    repository.failWith.deleteWithContents = new Error('offline');
    await expect(service.remove('b1')).rejects.toThrow('offline');
    delete repository.failWith.deleteWithContents;
    await service.remove('b1');

    expect(changes.version()).toBe(2);
  });

  it('borrar quita el libro de la lista solo tras el éxito', async () => {
    const { service, repository } = await loaded();
    repository.failWith.deleteWithContents = new Error('offline');

    await expect(service.remove('b1')).rejects.toThrow('offline');
    expect(service.findById('b1')).not.toBeNull();

    delete repository.failWith.deleteWithContents;
    await service.remove('b1');
    expect(repository.calls.deleteWithContents).toBe(2);
    expect(service.findById('b1')).toBeNull();
  });

  it('changeCardCount refleja el nuevo total sin releer', async () => {
    const { service } = await loaded([aBook({ id: 'b1', cardCount: 10 })]);

    service.changeCardCount('b1', 3);

    expect(service.findById('b1')?.cardCount).toBe(13);
  });

  it('addLocal no hace nada si la lista no está cargada', () => {
    const { service } = setup();

    service.addLocal(aBook({ id: 'b9' }));

    expect(service.books.hasValue()).toBe(false);
  });

  it('addLocal añade al final de la lista cargada', async () => {
    const { service } = await loaded();

    service.addLocal(aBook({ id: 'b9', order: 6 }));

    expect(service.books.value()?.map((book) => book.id)).toEqual(['b1', 'b2', 'b9']);
  });
});

describe('BooksService · totales y conteos', () => {
  it('totalsFor cuenta las tarjetas por estado del libro y sigue al id', async () => {
    const { service, repository, settle } = setup();
    repository.stateTotals.set('b1', { newCards: 20, learning: 4, review: 12 });
    repository.stateTotals.set('b2', { newCards: 1, learning: 0, review: 0 });
    const bookId = signal<string | undefined>('b1');

    const totals = TestBed.runInInjectionContext(() => service.totalsFor(bookId));
    await settle();
    expect(totals.value()).toEqual({ newCards: 20, learning: 4, review: 12 });

    bookId.set('b2');
    await settle();
    expect(totals.value()).toEqual({ newCards: 1, learning: 0, review: 0 });
  });

  it('sin red no pide los totales y al volver la red los pide', async () => {
    const { service, repository, connectivity, settle } = setup(activeSession(), false);
    repository.stateTotals.set('b1', { newCards: 3, learning: 2, review: 1 });

    const totals = TestBed.runInInjectionContext(() => service.totalsFor(signal('b1')));
    await settle();
    expect(repository.calls.countCardsByState).toBe(0);
    expect(totals.value()).toBeUndefined();

    connectivity.setOnline(true);
    await settle();
    expect(repository.calls.countCardsByState).toBe(1);
    expect(totals.value()).toEqual({ newCards: 3, learning: 2, review: 1 });
  });

  it('countContents pregunta al repositorio con el uid de la sesión', async () => {
    const { service, repository } = setup();
    repository.contents.set('b1', { chapters: 3, cards: 40 });

    expect(await service.countContents('b1')).toEqual({ chapters: 3, cards: 40 });
  });
});
