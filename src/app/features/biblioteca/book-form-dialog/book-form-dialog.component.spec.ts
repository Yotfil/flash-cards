import { ApplicationRef, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GlobalErrorHandler } from '@core/global-error-handler';

import type { Book } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { UnexpectedErrorNotice } from '@services/notices/unexpected-error-notice.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  pressEscape,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { BookFormDialogComponent, type BookFormDialogData } from './book-form-dialog.component';

async function setup(data: BookFormDialogData, online = true) {
  const repository = new FakeBookRepository();
  repository.seed(
    aBook({
      id: 'b1',
      name: 'Inglés',
      subject: 'language-en',
      studyDirection: 'both',
      newCardsPerDay: 12,
      maxReviewsPerDay: 150,
    }),
  );
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
      // El de la app: así se ve si un fallo se escapa de la pantalla hasta el aviso global.
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ],
  });
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  TestBed.inject(BooksService).reload();
  await update();
  const ref = TestBed.inject(DialogService).open<Book, BookFormDialogData>(
    BookFormDialogComponent,
    {
      label: 'Libro',
      data,
    },
  );
  await update();
  const submit = () => openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
  return { ref, repository, connectivity, update, submit, books: TestBed.inject(BooksService) };
}

describe('BookFormDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('crear: pide nombre y materia con la pista "general" y sin dirección de estudio', async () => {
    await setup({ mode: 'create' });

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nuevo libro');
    expect(openDialog().querySelector<HTMLInputElement>('#book-subject')?.placeholder).toBe(
      'general',
    );
    expect(openDialog().textContent).toContain('Si la dejas vacía, será «general»');
    expect(openDialog().querySelectorAll('input, select, textarea')).toHaveLength(2);
    expect(openDialog().textContent).not.toMatch(/sentido|dirección/i);
  });

  it('un nombre de solo espacios bloquea el envío y, al tocarlo, explica el error', async () => {
    const { update } = await setup({ mode: 'create' });

    const name = typeInto('#book-name', '   ');
    name.dispatchEvent(new Event('blur'));
    await update();

    expect(dialogButton('Crear libro')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('El nombre es obligatorio.');
  });

  it('con la materia vacía crea el libro como "general" y cierra con él', async () => {
    const { ref, update, submit } = await setup({ mode: 'create' });
    typeInto('#book-name', 'Francés');
    await update();
    expect(dialogButton('Crear libro')?.disabled).toBe(false);

    submit();
    const book = await ref.closed;

    expect(book).toMatchObject({ name: 'Francés', subject: 'general' });
  });

  it('Cancelar y Escape cierran sin resultado', async () => {
    const first = await setup({ mode: 'create' });
    dialogButton('Cancelar')?.click();
    await expect(first.ref.closed).resolves.toBeUndefined();

    const second = TestBed.inject(DialogService).open<Book, BookFormDialogData>(
      BookFormDialogComponent,
      { label: 'Libro', data: { mode: 'create' } },
    );
    await first.update();
    pressEscape();
    await expect(second.closed).resolves.toBeUndefined();
  });

  it('editar precarga los valores y conserva topes y dirección al guardar', async () => {
    const { ref, repository, update, submit } = await setup({
      mode: 'edit',
      book: aBook({ id: 'b1', name: 'Inglés', subject: 'language-en' }),
    });
    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Editar libro');
    expect(openDialog().querySelector<HTMLInputElement>('#book-name')?.value).toBe('Inglés');

    typeInto('#book-name', 'Inglés B2');
    await update();
    submit();
    const book = await ref.closed;

    expect(book).toMatchObject({
      name: 'Inglés B2',
      newCardsPerDay: 12,
      maxReviewsPerDay: 150,
      studyDirection: 'both',
    });
    expect(repository.books.get('b1')).toMatchObject({
      newCardsPerDay: 12,
      studyDirection: 'both',
    });
  });

  it('mientras guarda: "Guardando…", botones deshabilitados, Escape bloqueado, sin doble envío', async () => {
    const { ref, repository, update, submit } = await setup({ mode: 'create' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const create = repository.create.bind(repository);
    repository.create = async (...args) => {
      await gate;
      return create(...args);
    };
    typeInto('#book-name', 'Francés');
    await update();

    submit();
    submit();
    await update();
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    expect(dialogButton('Cancelar')?.disabled).toBe(true);
    pressEscape();
    expect(ref.isPending).toBe(true);

    release();
    await ref.closed;
    expect(repository.calls.create).toBe(1);
  });

  it('si no confirma en 6 s, avisa que quedó guardado en el dispositivo y deja cerrar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { ref, repository, update, submit } = await setup({ mode: 'create' });
    repository.create = () => new Promise<Book>(() => undefined);
    typeInto('#book-name', 'Química');
    await update();
    submit();
    await update();
    vi.advanceTimersByTime(6000);
    await update();

    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.',
    );
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    expect(dialogButton('Cerrar')?.disabled).toBe(false);
    dialogButton('Cerrar')?.click();
    await expect(ref.closed).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('si falla sigue abierto con el error y lo escrito; el reintento cierra con el libro', async () => {
    const { ref, repository, update, submit } = await setup({ mode: 'create' });
    repository.failWith.create = new Error('offline');
    typeInto('#book-name', 'Francés');
    await update();

    submit();
    await update();
    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar el libro. Inténtalo de nuevo.',
    );
    expect(openDialog().querySelector<HTMLInputElement>('#book-name')?.value).toBe('Francés');
    // El diálogo ya lo explica: el aviso global de fallo no previsto no aparece además.
    expect(TestBed.inject(UnexpectedErrorNotice).visible()).toBe(false);

    delete repository.failWith.create;
    submit();
    await expect(ref.closed).resolves.toMatchObject({ name: 'Francés' });
  });

  it('sin red no deja crear, lo explica y al volver la red se habilita con lo escrito', async () => {
    const { connectivity, update } = await setup({ mode: 'create' }, false);
    typeInto('#book-name', 'Francés');
    await update();

    expect(dialogButton('Crear libro')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Necesitas conexión para guardar cambios.');

    connectivity.setOnline(true);
    await update();
    expect(dialogButton('Crear libro')?.disabled).toBe(false);
    expect(openDialog().querySelector<HTMLInputElement>('#book-name')?.value).toBe('Francés');
  });
});
