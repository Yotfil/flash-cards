import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { Book } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { SessionService } from '@services/session/session.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakePracticePackageRepository } from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { BibliotecaPageComponent } from './biblioteca-page.component';

@Component({ template: '' })
class BlankPageComponent {}

async function open(
  options: { books?: Book[]; online?: boolean; holdList?: boolean; failList?: boolean } = {},
) {
  const repository = new FakeBookRepository();
  repository.seed(...(options.books ?? []));
  if (options.failList) {
    repository.failWith.listByUser = new Error('offline');
  }
  let releaseList: () => void = () => undefined;
  if (options.holdList) {
    const gate = new Promise<void>((resolve) => (releaseList = resolve));
    const list = repository.listByUser.bind(repository);
    // Solo el servidor espera: lo guardado en el dispositivo responde al instante.
    repository.listByUser = async (uid, source) => {
      if (source !== 'device') {
        await gate;
      }
      return list(uid, source);
    };
  }
  const connectivity = new FakeConnectivity(options.online ?? true);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca', component: BibliotecaPageComponent },
        { path: 'biblioteca/:bookId', component: BlankPageComponent },
        { path: 'importar', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: repository },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
      { provide: PracticePackageRepository, useValue: new FakePracticePackageRepository() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/biblioteca');
  // `waitForStable` falso cuando la prueba retiene la lectura: la app no se estabiliza hasta soltarla.
  const update = async (waitForStable = true) => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    if (waitForStable) {
      await TestBed.inject(ApplicationRef).whenStable();
    }
    harness.detectChanges();
  };
  await update(!options.holdList);
  const page = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(page().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const names = () =>
    Array.from(page().querySelectorAll('app-book-card [data-open] .font-bold')).map((name) =>
      name.textContent?.trim(),
    );
  return {
    harness,
    repository,
    connectivity,
    update,
    page,
    button,
    names,
    releaseList,
    router: TestBed.inject(Router),
  };
}

describe('BibliotecaPageComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('al abrir lee los libros y, mientras tanto, muestra el esqueleto sin acciones', async () => {
    const { page, button, repository, releaseList, update } = await open({
      books: [aBook()],
      holdList: true,
    });

    expect(page().querySelector('app-skeleton')).not.toBeNull();
    expect(button('Nuevo libro')).toBeUndefined();
    expect(button('Importar libro')).toBeUndefined();

    releaseList();
    await update();
    expect(repository.calls.listByUser).toBe(1);
    expect(page().querySelector('app-skeleton')).toBeNull();
  });

  it('si la lectura falla lo dice (nunca como vacía) y Reintentar vuelve a leer', async () => {
    const { page, button, update, repository } = await open({ failList: true });

    expect(page().textContent).toContain('No pudimos cargar tus libros');
    expect(page().textContent).not.toContain('Aún no tienes libros');

    delete repository.failWith.listByUser;
    button('Reintentar')?.click();
    await update();

    expect(repository.calls.listByUser).toBe(2);
    expect(page().textContent).toContain('Aún no tienes libros');
  });

  it('vacía: invita a crear o importar, sin acciones en la cabecera', async () => {
    const { page, button } = await open({ books: [] });

    expect(page().textContent).toContain('Aún no tienes libros');
    expect(button('Crear libro')).toBeDefined();
    expect(button('Importar libro')).toBeDefined();
    expect(button('Nuevo libro')).toBeUndefined();
  });

  it('con libros: cabecera con Importar libro y Nuevo libro y las tarjetas en orden', async () => {
    const { names, button } = await open({
      books: [
        aBook({ id: 'b2', name: 'Química', order: 1 }),
        aBook({ id: 'b1', name: 'Inglés', order: 0 }),
      ],
    });

    expect(button('Importar libro')).toBeDefined();
    expect(button('Nuevo libro')).toBeDefined();
    expect(names()).toEqual(['Inglés', 'Química']);
  });

  it('tocar un libro abre su detalle e "Importar libro" lleva a /importar', async () => {
    const first = await open({ books: [aBook({ id: 'b1' })] });
    first.page().querySelector<HTMLButtonElement>('[data-open]')?.click();
    await first.update();
    expect(first.router.url).toBe('/biblioteca/b1');

    await first.harness.navigateByUrl('/biblioteca');
    await first.update();
    first.button('Importar libro')?.click();
    await first.update();
    expect(first.router.url).toBe('/importar');
  });

  it('"Nuevo libro" abre el diálogo y el libro creado aparece al final', async () => {
    const { button, update, names } = await open({ books: [aBook({ id: 'b1', name: 'Inglés' })] });

    button('Nuevo libro')?.click();
    await update();
    typeInto('#book-name', 'Química');
    await update();
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(names()).toEqual(['Inglés', 'Química']);
  });

  it('borrar pide confirmación con los conteos y el libro sale solo al confirmar', async () => {
    const { page, update, names, repository } = await open({
      books: [aBook({ id: 'b1', name: 'Inglés' })],
    });
    repository.contents.set('b1', { chapters: 3, cards: 40 });

    page().querySelector<HTMLButtonElement>('[aria-label="Borrar Inglés"]')?.click();
    await update();
    expect(openDialog().textContent).toContain(
      'Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva.',
    );
    expect(names()).toEqual(['Inglés']);

    dialogButton('Borrar')?.click();
    await update();
    expect(repository.calls.deleteWithContents).toBe(1);
    expect(names()).toEqual([]);
  });

  it('si el conteo falla la confirmación se abre igual, sin números', async () => {
    const { page, update, repository } = await open({
      books: [aBook({ id: 'b1', name: 'Inglés' })],
    });
    repository.failWith.countContents = new Error('offline');

    page().querySelector<HTMLButtonElement>('[aria-label="Borrar Inglés"]')?.click();
    await update();

    expect(openDialog().textContent).toContain(
      'También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva.',
    );
  });

  it('sin red no pide los conteos y usa el texto sin números', async () => {
    const { page, update, repository } = await open({
      books: [aBook({ id: 'b1', name: 'Inglés' })],
      online: false,
    });

    page().querySelector<HTMLButtonElement>('[aria-label="Borrar Inglés"]')?.click();
    await update();

    expect(repository.calls.countContents).toBe(0);
    expect(openDialog().textContent).toContain('También se borrarán sus capítulos y tarjetas.');
  });

  it('la sección "Práctica con IA" va debajo de los libros, y también debajo del vacío', async () => {
    const withBooks = await open({ books: [aBook()] });
    const list = withBooks.page().querySelector('app-book-card');
    const section = withBooks.page().querySelector('app-practice-packages-section');
    expect(section?.querySelector('h2')?.textContent?.trim()).toBe('Práctica con IA');
    expect(list?.compareDocumentPosition(section as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    TestBed.resetTestingModule();

    const empty = await open({ books: [] });
    const invitation = empty.page().querySelector('app-empty-state');
    const emptySection = empty.page().querySelector('app-practice-packages-section');
    expect(invitation?.compareDocumentPosition(emptySection as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
