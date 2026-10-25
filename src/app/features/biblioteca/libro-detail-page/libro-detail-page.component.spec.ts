import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { Book } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { allowDialogFocusInJsdom, openDialog, typeInto } from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { LibroDetailPageComponent } from './libro-detail-page.component';

@Component({ template: '' })
class BlankPageComponent {}

async function open(
  bookId: string,
  options: { books?: Book[]; online?: boolean; failList?: boolean; failTotals?: boolean } = {},
) {
  const repository = new FakeBookRepository();
  repository.seed(
    ...(options.books ?? [aBook({ id: 'b1', name: 'Inglés', subject: 'language-en' })]),
  );
  repository.stateTotals.set('b1', { newCards: 20, learning: 4, review: 12 });
  if (options.failList) {
    repository.failWith.listByUser = new Error('offline');
  }
  if (options.failTotals) {
    repository.failWith.countCardsByState = new Error('offline');
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca/:bookId', component: LibroDetailPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: repository },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/biblioteca/${bookId}`);
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    harness.detectChanges();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  return { harness, repository, update, page };
}

describe('LibroDetailPageComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('por navegación directa carga la Biblioteca y pinta la cabecera del libro', async () => {
    const { page, repository } = await open('b1');

    expect(repository.calls.listByUser).toBe(1);
    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Inglés');
    expect(page().textContent).toContain('language-en');
    expect(page().querySelector('a[href="/biblioteca"]')?.textContent?.trim()).toBe('← Biblioteca');
  });

  it('muestra los totales por estado', async () => {
    const { page } = await open('b1');

    expect(page().textContent).toContain('12 dominadas');
    expect(page().textContent).toContain('4 en aprendizaje');
    expect(page().textContent).toContain('20 nuevas');
  });

  it.each([
    ['sin red', { online: false }],
    ['con el conteo fallando', { failTotals: true }],
  ])('%s omite los totales sin mostrar un error', async (_label, options) => {
    const { page } = await open('b1', options);

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Inglés');
    expect(page().textContent).not.toContain('dominadas');
    expect(page().querySelector('[role="alert"]')).toBeNull();
  });

  it('si la Biblioteca no carga muestra el error con Reintentar', async () => {
    const { page } = await open('b1', { failList: true });

    expect(page().querySelector('app-error-state [role="alert"]')).not.toBeNull();
    expect(page().textContent).toContain('Reintentar');
  });

  it('un libro que no existe dice "Libro no encontrado" con el camino a la Biblioteca', async () => {
    const { page } = await open('nadie');

    expect(page().textContent).toContain('Libro no encontrado');
    expect(page().querySelector('a[href="/biblioteca"]')).not.toBeNull();
    expect(page().querySelector('[aria-label="Capítulos"]')).toBeNull();
  });

  it('el botón de ajustes abre los ajustes del libro', async () => {
    const { page, update } = await open('b1');

    page().querySelector<HTMLButtonElement>('[aria-label="Ajustes de Inglés"]')?.click();
    await update();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Ajustes de «Inglés»');
  });

  it('"Editar Inglés" abre el diálogo en modo editar y la cabecera refleja el nombre nuevo', async () => {
    const { page, update } = await open('b1');

    page().querySelector<HTMLButtonElement>('[aria-label="Editar Inglés"]')?.click();
    await update();
    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Editar libro');
    typeInto('#book-name', 'Inglés B2');
    await update();
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Inglés B2');
  });

  it('deja la región de capítulos con la página provisional', async () => {
    const { page } = await open('b1');

    expect(page().querySelector('section[aria-label="Capítulos"] app-pending-page')).not.toBeNull();
  });
});
