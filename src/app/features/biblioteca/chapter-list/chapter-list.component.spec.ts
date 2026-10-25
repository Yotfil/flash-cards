import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Chapter } from '@domain/models/chapter.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ChapterListComponent } from './chapter-list.component';

async function render(
  options: { chapters?: Chapter[]; online?: boolean; failWith?: unknown; holdList?: boolean } = {},
) {
  const repository = new FakeChapterRepository();
  repository.seed(...(options.chapters ?? []));
  if (options.failWith) {
    repository.failWith.listByBook = options.failWith;
  }
  let releaseList: () => void = () => undefined;
  if (options.holdList) {
    const gate = new Promise<void>((resolve) => (releaseList = resolve));
    const list = repository.listByBook.bind(repository);
    repository.listByBook = async (uid, bookId) => {
      await gate;
      return list(uid, bookId);
    };
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ChapterRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const fixture = TestBed.createComponent(ChapterListComponent);
  fixture.componentRef.setInput('bookId', 'b1');
  const contentsChanged = vi.fn();
  fixture.componentInstance.contentsChanged.subscribe(contentsChanged);
  const update = async (waitForStable = true) => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    if (waitForStable) {
      await TestBed.inject(ApplicationRef).whenStable();
    }
    fixture.detectChanges();
  };
  await update(!options.holdList);
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const names = () =>
    Array.from(element.querySelectorAll('app-chapter-row a .truncate')).map((name) =>
      name.textContent?.trim(),
    );
  return { fixture, element, repository, update, button, names, contentsChanged, releaseList };
}

const THREE = [
  aChapter({ id: 'c0', name: 'Básicos', order: 0 }),
  aChapter({ id: 'c3', name: 'Medios', order: 3 }),
  aChapter({ id: 'c7', name: 'Altos', order: 7 }),
];

describe('ChapterListComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('al iniciar lee los capítulos del libro y, mientras tanto, muestra el esqueleto', async () => {
    const { element, button, repository, releaseList, update } = await render({
      chapters: THREE,
      holdList: true,
    });

    expect(element.querySelector('app-skeleton[aria-busy="true"]')).not.toBeNull();
    expect(button('Añadir un capítulo')).toBeUndefined();

    releaseList();
    await update();
    expect(repository.calls.listByBook).toBe(1);
  });

  it.each([
    ['una lectura que falla', new Error('offline')],
    // La pantalla no conoce la frontera de lectura: le basta que la lectura lance.
    ['un documento corrupto', new Error('Documento inválido en users/u1/chapters/x: order')],
  ])('con %s muestra el error con Reintentar, nunca el vacío', async (_label, failure) => {
    const { element, button, repository, update } = await render({ failWith: failure });

    expect(element.textContent).toContain('No pudimos cargar los capítulos');
    expect(element.textContent).not.toContain('Este libro aún no tiene capítulos');

    delete repository.failWith.listByBook;
    button('Reintentar')?.click();
    await update();
    expect(repository.calls.listByBook).toBe(2);
  });

  it('vacío: invita a crear el primero', async () => {
    const { element, button } = await render();

    expect(element.textContent).toContain('Este libro aún no tiene capítulos');
    expect(element.textContent).toContain(
      'Los capítulos agrupan tus tarjetas. Crea el primero para empezar.',
    );
    expect(button('Crear capítulo')).toBeDefined();
  });

  it('numera los capítulos 1, 2 y 3 según su orden', async () => {
    const { element, names } = await render({ chapters: THREE });

    expect(names()).toEqual(['Básicos', 'Medios', 'Altos']);
    const positions = Array.from(
      element.querySelectorAll('app-chapter-row a > span:first-child'),
    ).map((position) => position.textContent?.trim());
    expect(positions).toEqual(['1', '2', '3']);
  });

  it('"Añadir un capítulo" abre el diálogo y el nuevo aparece último', async () => {
    const { button, update, names } = await render({ chapters: THREE });

    button('Añadir un capítulo')?.click();
    await update();
    typeInto('#chapter-name', 'Expertos');
    await update();
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(names().at(-1)).toBe('Expertos');
  });

  it('borrar pide confirmación con el nombre y las tarjetas; al confirmar sale y avisa', async () => {
    const { element, update, names, repository, contentsChanged } = await render({
      chapters: THREE,
    });
    repository.setCardCount('c0', 42);

    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();
    await update();
    expect(openDialog().textContent).toContain('Se borrará «Básicos».');
    expect(openDialog().textContent).toContain(
      'Se borrarán 42 tarjetas. Tu historial de repasos se conserva. No se puede deshacer.',
    );

    dialogButton('Borrar')?.click();
    await update();
    expect(names()).toEqual(['Medios', 'Altos']);
    expect(contentsChanged).toHaveBeenCalledTimes(1);
  });

  it('cancelar deja la fila y no borra nada', async () => {
    const { element, update, names, repository, contentsChanged } = await render({
      chapters: THREE,
    });

    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();
    await update();
    dialogButton('Cancelar')?.click();
    await update();

    expect(names()).toHaveLength(3);
    expect(repository.calls.deleteWithCards).toBe(0);
    expect(contentsChanged).not.toHaveBeenCalled();
  });

  it('si el borrado falla la fila sigue', async () => {
    const { element, update, names, repository } = await render({ chapters: THREE });
    repository.failWith.deleteWithCards = new Error('offline');

    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();
    await update();
    dialogButton('Borrar')?.click();
    await update();

    expect(names()).toHaveLength(3);
  });

  it('si el conteo falla la confirmación va sin número', async () => {
    const { element, update, repository } = await render({ chapters: THREE });
    repository.failWith.countCards = new Error('offline');

    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();
    await update();

    expect(openDialog().textContent).toContain('También se borrarán sus tarjetas.');
  });

  it('sin red no pide el conteo', async () => {
    const { element, update, repository } = await render({ chapters: THREE, online: false });

    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();
    await update();

    expect(repository.calls.countCards).toBe(0);
    expect(openDialog().textContent).toContain('También se borrarán sus tarjetas.');
  });
});
