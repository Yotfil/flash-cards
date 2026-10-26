import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { ImportBookError, ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { CardsService } from '@services/cards/cards.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ImportService } from './import.service';
import { parseImportText } from './parse-import-text';

const T0 = new Date('2026-10-24T15:00:00Z');
const user = aUser();
const ACTIVE: SessionState = {
  kind: 'active',
  user: { ...user, settings: { ...user.settings, defaultNewCardsPerDay: 7 } },
};
const TEXT = ['# Uno', 'a | b :: ejemplo', 'c | d', '# Dos', 'El {{gato}} es negro'].join('\n');

function setup(state: SessionState = ACTIVE) {
  const imports = new FakeImportRepository();
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'b1', order: 0 }), aBook({ id: 'b2', order: 3 }));
  const cards = new FakeCardRepository();
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: ImportRepository, useValue: imports },
      { provide: BookRepository, useValue: books },
      { provide: CardRepository, useValue: cards },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: SessionService, useValue: new FakeSessionService(state) },
      { provide: Logger, useValue: logger },
    ],
  });
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { service: TestBed.inject(ImportService), imports, books, cards, logger, settle };
}

describe('ImportService · libro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('arma el libro con sus metadatos y las tarjetas nuevas, y lo añade a la Biblioteca', async () => {
    const { service, imports } = setup();
    const addLocal = vi.spyOn(TestBed.inject(BooksService), 'addLocal');

    const summary = await service.importBook({
      name: '  Phrasal Verbs  ',
      subject: '',
      text: TEXT,
    });

    const input = imports.lastInput;
    expect(input?.book).toEqual({
      name: 'Phrasal Verbs',
      subject: 'general',
      studyDirection: 'forward',
      newCardsPerDay: 7,
      maxReviewsPerDay: 200,
      order: 4,
      cardCount: 3,
    });
    expect(
      input?.chapters.map((chapter) => [chapter.name, chapter.order, chapter.cards.length]),
    ).toEqual([
      ['Uno', 0, 2],
      ['Dos', 1, 1],
    ]);
    const [first, second, cloze] = input?.chapters.flatMap((chapter) => chapter.cards) ?? [];
    expect(first?.example).toBe('ejemplo');
    expect(second && 'example' in second).toBe(false);
    expect(cloze?.cardType).toBe('cloze');
    expect(first?.noteId).not.toBe('');
    expect(first?.noteId).not.toBe(second?.noteId);
    expect(first?.scheduling).toEqual(initialCardScheduling(T0));
    expect(first?.direction).toBe('forward');
    expect(first?.suspended).toBe(false);
    expect(addLocal).toHaveBeenCalledWith(
      expect.objectContaining({ id: summary.bookId, name: 'Phrasal Verbs' }),
    );
    expect(summary).toEqual({ bookId: 'importado-1', chapterCount: 2, cardCount: 3 });
  });

  it('nombre en blanco: "Libro importado"; materia escrita: recortada', async () => {
    const { service, imports } = setup();

    await service.importBook({ name: '   ', subject: '  Francés  ', text: 'a | b' });

    expect(imports.lastInput?.book.name).toBe('Libro importado');
    expect(imports.lastInput?.book.subject).toBe('Francés');
  });

  it('sin sesión no escribe', async () => {
    const { service, imports } = setup({ kind: 'signedOut' });

    await expect(service.importBook({ name: 'X', subject: '', text: 'a | b' })).rejects.toThrow(
      'No hay una sesión activa.',
    );
    expect(imports.calls).toBe(0);
  });

  it('si la escritura falla, se registra y se relanza sin tocar la Biblioteca', async () => {
    const { service, imports, logger } = setup();
    const failure = new ImportBookError(450, true, new Error('permiso'));
    imports.failWith = failure;
    const addLocal = vi.spyOn(TestBed.inject(BooksService), 'addLocal');

    await expect(service.importBook({ name: 'X', subject: '', text: 'a | b' })).rejects.toBe(
      failure,
    );

    expect(addLocal).not.toHaveBeenCalled();
    expect(logger.entries.at(-1)?.cause).toBe(failure);
  });

  it('un fallo antes de escribir (la Biblioteca no cargó) queda registrado y reintentar sirve', async () => {
    const { service, imports, books, logger } = setup();
    const failure = new Error('Lectura de libros rechazada');
    books.failWith.listByUser = failure;

    await expect(service.importBook({ name: 'X', subject: '', text: 'a | b' })).rejects.toBe(
      failure,
    );
    expect(logger.entries).toContainEqual({
      level: 'error',
      message: 'No se pudo importar el libro',
      cause: failure,
    });

    // La causa era pasajera: el usuario pulsa otra vez "Importar 1".
    delete books.failWith.listByUser;
    await service.importBook({ name: 'X', subject: '', text: 'a | b' });
    expect(imports.calls).toBe(1);
  });

  it('si además falla deshacer lo escrito, el registro dice por qué', async () => {
    const { service, imports, logger } = setup();
    imports.failWith = new ImportBookError(
      450,
      false,
      new Error('permiso'),
      new Error('sin red al deshacer'),
    );

    await expect(
      service.importBook({ name: 'X', subject: '', text: 'a | b' }),
    ).rejects.toBeInstanceOf(ImportBookError);

    expect(logger.entries.at(-1)?.message).toBe(
      'No se pudo importar el libro (450 escrituras confirmadas, deshechas: false; al deshacer: Error: sin red al deshacer)',
    );
  });

  it('mientras importa recuerda qué libro es (para la página que vuelve) y al terminar lo olvida', async () => {
    const { service, imports } = setup();
    let release!: () => void;
    imports.gate = new Promise<void>((resolve) => (release = resolve));

    const done = service.importBook({ name: 'Inglés B2', subject: 'idiomas', text: 'a | b' });

    expect(service.bookImport()).toMatchObject({
      name: 'Inglés B2',
      subject: 'idiomas',
      text: 'a | b',
    });
    release();
    await done;
    expect(service.bookImport()).toBeNull();
  });

  it('si la importación falla, también la olvida', async () => {
    const { service, imports } = setup();
    imports.failWith = new ImportBookError(0, true, new Error('permiso'));

    await expect(
      service.importBook({ name: 'X', subject: '', text: 'a | b' }),
    ).rejects.toBeInstanceOf(ImportBookError);

    expect(service.bookImport()).toBeNull();
  });
});

describe('ImportService · capítulo y previsualización', () => {
  const drafts = parseImportText('a | b :: ej\nc | d', 'X').package.chapters[0]?.cards ?? [];

  it('agregar crea las tarjetas con su ejemplo; reemplazar las sustituye; sin tarjetas, nada', async () => {
    const { service, cards, settle } = setup();
    cards.seed(aCard({ id: 'k1', chapterId: 'c1' }));
    TestBed.inject(CardsService).openChapter('c1');
    await settle();
    const createMany = vi.spyOn(cards, 'createMany');
    const replace = vi.spyOn(cards, 'replaceInChapter');

    await service.importIntoChapter('b1', 'c1', drafts, 'append');
    expect(createMany.mock.calls[0]?.[1].map((card) => card.example)).toEqual(['ej', undefined]);

    await service.importIntoChapter('b1', 'c1', drafts, 'replace');
    expect(replace).toHaveBeenCalledTimes(1);

    await service.importIntoChapter('b1', 'c1', [], 'append');
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('la previsualización del libro no mira otras tarjetas; la del capítulo sí', () => {
    const { service } = setup();
    const text = 'to give up | rendirse\nx | y';
    const existing = [aCard({ front: 'to give up', back: 'rendirse' })];

    expect(service.previewForBook(text, 'Libro').repeatedCount).toBe(0);
    expect(service.previewForChapter(text, 'Cap', existing).repeatedCount).toBe(1);
    expect(service.previewForChapter(text, 'Cap', existing).parse.validCardCount).toBe(2);
  });
});
