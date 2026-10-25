import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Book } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import {
  BookSettingsDialogComponent,
  type BookSettingsDialogData,
} from './book-settings-dialog.component';

async function setup(online = true) {
  const book = aBook({ id: 'b1', name: 'Inglés', newCardsPerDay: 12, maxReviewsPerDay: 150 });
  const repository = new FakeBookRepository();
  repository.seed(book);
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: repository },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  TestBed.inject(BooksService).reload();
  await update();
  const ref = TestBed.inject(DialogService).open<Book, BookSettingsDialogData>(
    BookSettingsDialogComponent,
    { label: 'Ajustes', data: { book } },
  );
  await update();
  const submit = () => openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
  return { ref, repository, connectivity, update, submit };
}

describe('BookSettingsDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('se titula con el libro y precarga sus topes', async () => {
    await setup();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Ajustes de «Inglés»');
    expect(openDialog().querySelector<HTMLInputElement>('#new-cards-per-day')?.value).toBe('12');
    expect(openDialog().querySelector<HTMLInputElement>('#max-reviews-per-day')?.value).toBe('150');
    expect(openDialog().textContent).toContain('0 = sin tope');
  });

  it('guardar persiste solo los dos topes y cierra con el libro', async () => {
    const { ref, repository, update, submit } = await setup();
    const updateSpy = vi.spyOn(repository, 'update');
    typeInto('#new-cards-per-day', '5');
    await update();

    submit();
    const book = await ref.closed;

    expect(updateSpy).toHaveBeenCalledWith('u1', 'b1', {
      newCardsPerDay: 5,
      maxReviewsPerDay: 150,
    });
    expect(book).toMatchObject({ newCardsPerDay: 5, maxReviewsPerDay: 150, name: 'Inglés' });
  });

  it.each([
    ['#new-cards-per-day', '-1', 'Escribe un número entero entre 0 y 999.'],
    ['#new-cards-per-day', '2.5', 'Escribe un número entero entre 0 y 999.'],
    ['#max-reviews-per-day', '-1', 'Escribe un número entero entre 0 y 9999.'],
  ])('%s con %s deshabilita guardar y muestra su texto', async (selector, value, message) => {
    const { update } = await setup();

    typeInto(selector, value);
    await update();

    expect(dialogButton('Guardar')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain(message);
  });

  it('cero es válido', async () => {
    const { ref, update, submit } = await setup();
    typeInto('#max-reviews-per-day', '0');
    await update();

    submit();

    await expect(ref.closed).resolves.toMatchObject({ maxReviewsPerDay: 0 });
  });

  it('si falla sigue abierto con su mensaje', async () => {
    const { repository, update, submit } = await setup();
    repository.failWith.update = new Error('offline');
    typeInto('#new-cards-per-day', '5');
    await update();

    submit();
    await update();

    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudieron guardar los ajustes. Inténtalo de nuevo.',
    );
  });

  it('sin red no deja guardar y lo explica', async () => {
    const { update } = await setup(false);
    typeInto('#new-cards-per-day', '5');
    await update();

    expect(dialogButton('Guardar')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Necesitas conexión para guardar cambios.');
  });
});
