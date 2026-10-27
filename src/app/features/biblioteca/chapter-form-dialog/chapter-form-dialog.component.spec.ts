import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Chapter } from '@domain/models/chapter.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ChaptersService } from '@services/chapters/chapters.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  pressEscape,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import {
  ChapterFormDialogComponent,
  type ChapterFormDialogData,
} from './chapter-form-dialog.component';

async function setup(data: ChapterFormDialogData, online = true) {
  const repository = new FakeChapterRepository();
  repository.seed(aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos', order: 0 }));
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      { provide: ChapterRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
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
  TestBed.inject(ChaptersService).openBook('b1');
  await update();
  const ref = TestBed.inject(DialogService).open<Chapter, ChapterFormDialogData>(
    ChapterFormDialogComponent,
    { label: 'Capítulo', data },
  );
  await update();
  const submit = () => openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
  return { ref, repository, connectivity, update, submit };
}

describe('ChapterFormDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('crear: "Nuevo capítulo" con "Crear capítulo" y la pista materia-agnóstica', async () => {
    await setup({ mode: 'create' });

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nuevo capítulo');
    expect(dialogButton('Crear capítulo')).toBeDefined();
    expect(openDialog().querySelector<HTMLInputElement>('#chapter-name')?.placeholder).toBe(
      'Ej. Unidad 1',
    );
  });

  it('un nombre de solo espacios bloquea y, al tocarlo, explica el error', async () => {
    const { update } = await setup({ mode: 'create' });

    typeInto('#chapter-name', '   ').dispatchEvent(new Event('blur'));
    await update();

    expect(dialogButton('Crear capítulo')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('El nombre es obligatorio.');
  });

  it('Cancelar y Escape cierran sin resultado ni llamada al servicio', async () => {
    const first = await setup({ mode: 'create' });
    dialogButton('Cancelar')?.click();
    await expect(first.ref.closed).resolves.toBeUndefined();

    const second = TestBed.inject(DialogService).open<Chapter, ChapterFormDialogData>(
      ChapterFormDialogComponent,
      { label: 'Capítulo', data: { mode: 'create' } },
    );
    await first.update();
    pressEscape();
    await expect(second.closed).resolves.toBeUndefined();
    expect(first.repository.calls.create).toBe(0);
  });

  it('renombrar: precargado y con "Guardar"; cierra con el capítulo renombrado', async () => {
    const { ref, update, submit } = await setup({
      mode: 'rename',
      chapter: aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos' }),
    });
    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Renombrar capítulo');
    expect(openDialog().querySelector<HTMLInputElement>('#chapter-name')?.value).toBe('Básicos');

    typeInto('#chapter-name', 'Intermedios');
    await update();
    submit();

    await expect(ref.closed).resolves.toMatchObject({ id: 'c1', name: 'Intermedios', order: 0 });
  });

  it('mientras guarda: "Guardando…", botones deshabilitados, Escape bloqueado y un solo create', async () => {
    const { ref, repository, update, submit } = await setup({ mode: 'create' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const create = repository.create.bind(repository);
    repository.create = async (...args) => {
      await gate;
      return create(...args);
    };
    typeInto('#chapter-name', 'Uno');
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
    repository.create = () => new Promise<Chapter>(() => undefined);
    typeInto('#chapter-name', 'Uno');
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

  it('si falla sigue abierto con el nombre y el error; el reintento cierra con el capítulo', async () => {
    const { ref, repository, update, submit } = await setup({ mode: 'create' });
    repository.failWith.create = new Error('offline');
    typeInto('#chapter-name', 'Uno');
    await update();

    submit();
    await update();
    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar el capítulo. Inténtalo de nuevo.',
    );
    expect(openDialog().querySelector<HTMLInputElement>('#chapter-name')?.value).toBe('Uno');

    delete repository.failWith.create;
    submit();
    await expect(ref.closed).resolves.toMatchObject({ name: 'Uno' });
  });

  it('sin red no deja guardar, lo explica y al volver la red se habilita con el nombre', async () => {
    const { connectivity, update } = await setup({ mode: 'create' }, false);
    typeInto('#chapter-name', 'Uno');
    await update();

    expect(dialogButton('Crear capítulo')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Necesitas conexión para guardar cambios.');

    connectivity.setOnline(true);
    await update();
    expect(dialogButton('Crear capítulo')?.disabled).toBe(false);
    expect(openDialog().querySelector<HTMLInputElement>('#chapter-name')?.value).toBe('Uno');
  });
});
