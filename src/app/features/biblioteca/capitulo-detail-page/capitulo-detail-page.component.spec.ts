import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { ChaptersService } from '@services/chapters/chapters.service';
import { BookReadyCardsService } from '@services/queue/book-ready-cards.service';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { allowDialogFocusInJsdom } from '@testing/dialog-test-helpers';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardListComponent } from '../card-list/card-list.component';
import { CapituloDetailPageComponent } from './capitulo-detail-page.component';

@Component({ template: '' })
class BlankPageComponent {}

async function open(
  url: string,
  options: {
    preload?: boolean;
    failBooks?: boolean;
    failChapters?: boolean;
    holdBooks?: boolean;
    cards?: Card[];
  } = {},
) {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'b1', name: 'Phrasal Verbs' }));
  const chapters = new FakeChapterRepository();
  chapters.seed(aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos' }));
  const cards = new FakeCardRepository();
  cards.seed(
    ...(options.cards ?? [aCard({ id: 'k1', bookId: 'b1', chapterId: 'c1', front: 'to give up' })]),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca/:bookId/:chapterId', component: CapituloDetailPageComponent },
        { path: 'biblioteca/:bookId', component: BlankPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
        { path: 'repaso', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: books },
      { provide: ChapterRepository, useValue: chapters },
      { provide: CardRepository, useValue: cards },
      { provide: ImportRepository, useValue: new FakeImportRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  if (options.preload) {
    TestBed.inject(BooksService).reload();
    TestBed.inject(ChaptersService).openBook('b1');
    await settle();
  }
  if (options.failBooks) {
    books.failWith.listByUser = new Error('offline');
  }
  if (options.failChapters) {
    chapters.failWith.listByBook = new Error('offline');
  }
  let releaseBooks: () => void = () => undefined;
  if (options.holdBooks) {
    const gate = new Promise<void>((resolve) => (releaseBooks = resolve));
    const list = books.listByUser.bind(books);
    books.listByUser = async (uid) => {
      await gate;
      return list(uid);
    };
  }
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const page = () => harness.routeNativeElement as HTMLElement;
  const update = async () => {
    await settle();
    harness.detectChanges();
  };
  return { harness, books, chapters, page, update, releaseBooks };
}

describe('CapituloDetailPageComponent', () => {
  it('con libros y capítulos ya cargados no relee y pinta la cabecera', async () => {
    const { page, books, chapters, update } = await open('/biblioteca/b1/c1', { preload: true });
    await update();

    expect(books.calls.listByUser).toBe(1);
    expect(chapters.calls.listByBook).toBe(1);
    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Básicos');
    const back = page().querySelector('a[href="/biblioteca/b1"]');
    expect(back?.getAttribute('aria-label')).toBe('Volver a Phrasal Verbs');
  });

  it('entrando directo muestra el esqueleto, carga ambos y luego la cabecera', async () => {
    const { page, harness, books, chapters, update, releaseBooks } = await open(
      '/biblioteca/b1/c1',
      { holdBooks: true },
    );
    harness.detectChanges();
    expect(page().querySelector('app-skeleton')).not.toBeNull();

    releaseBooks();
    await update();
    expect(books.calls.listByUser).toBe(1);
    expect(chapters.calls.listByBook).toBe(1);
    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Básicos');
  });

  it.each([
    ['libros', { failBooks: true }, 'listByUser'],
    ['capítulos', { failChapters: true }, 'listByBook'],
  ] as const)('si fallan los %s, Reintentar relee ese recurso', async (_label, options, method) => {
    const { page, books, chapters, update } = await open('/biblioteca/b1/c1', options);
    await update();
    expect(page().querySelector('app-error-state')).not.toBeNull();
    expect(page().querySelector('[aria-label="Tarjetas"]')).toBeNull();

    delete books.failWith.listByUser;
    delete chapters.failWith.listByBook;
    page().querySelector<HTMLButtonElement>('app-error-state button')?.click();
    await update();

    const calls = method === 'listByUser' ? books.calls.listByUser : chapters.calls.listByBook;
    expect(calls).toBe(2);
    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Básicos');
  });

  it('con el libro inexistente dice "Libro no encontrado" con el camino a la Biblioteca', async () => {
    const { page, update } = await open('/biblioteca/nadie/c1');
    await update();

    expect(page().textContent).toContain('Libro no encontrado');
    expect(page().querySelector('a[href="/biblioteca"]')).not.toBeNull();
    expect(page().querySelector('[aria-label="Tarjetas"]')).toBeNull();
  });

  it('con el capítulo inexistente dice "Capítulo no encontrado" con "Volver a {libro}"', async () => {
    const { page, update } = await open('/biblioteca/b1/nadie');
    await update();

    expect(page().textContent).toContain('Capítulo no encontrado');
    expect(page().querySelector('a[href="/biblioteca/b1"]')?.textContent?.trim()).toBe(
      'Volver a Phrasal Verbs',
    );
    expect(page().querySelector('[aria-label="Tarjetas"]')).toBeNull();
  });

  it('listo: zona de acciones y, en la región "Tarjetas", la lista del capítulo', async () => {
    const { page, harness, update } = await open('/biblioteca/b1/c1');
    await update();
    await update();

    expect(page().querySelector('[data-chapter-actions]')).not.toBeNull();
    const list = harness.fixture.debugElement.query(By.directive(CardListComponent));
    expect(list.nativeElement.closest('section[aria-label="Tarjetas"]')).not.toBeNull();
    expect(list.componentInstance.bookId()).toBe('b1');
    expect(list.componentInstance.chapterId()).toBe('c1');
    expect(page().querySelector('app-card-row')?.textContent).toContain('to give up');
  });
});

describe('CapituloDetailPageComponent · estudiar este capítulo', () => {
  const button = (page: HTMLElement, text: string) =>
    Array.from(page.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const ready = aCard({ id: 'k1', bookId: 'b1', chapterId: 'c1', front: 'to give up' });

  async function openReady(cards?: Card[]) {
    const opened = await open('/biblioteca/b1/c1', cards ? { cards } : {});
    await opened.update();
    await opened.update();
    return opened;
  }

  it('aparece en la zona de acciones solo con las tarjetas cargadas y al menos una', async () => {
    const withCards = await openReady();
    expect(withCards.page().querySelector('[data-chapter-actions]')?.textContent).toContain(
      'Estudiar este capítulo',
    );
    TestBed.resetTestingModule();

    const empty = await openReady([]);
    expect(button(empty.page(), 'Estudiar este capítulo')).toBeUndefined();
  });

  it('con tarjetas listas entrega la sesión del capítulo y navega al repaso', async () => {
    const { page, update } = await openReady();

    button(page(), 'Estudiar este capítulo')?.click();
    await update();

    expect(TestBed.inject(StudyHandoffService).take()).toEqual({
      cards: [ready],
      source: { kind: 'chapter', bookId: 'b1', chapterId: 'c1' },
    });
    expect(TestBed.inject(Router).url).toBe('/repaso');
  });

  it('sin tarjetas listas dice que está al día, sin salir', async () => {
    const future = {
      ...ready,
      scheduling: { ...ready.scheduling, due: new Date('2999-01-01T00:00:00Z') },
    };
    const { page, update } = await openReady([future]);

    button(page(), 'Estudiar este capítulo')?.click();
    await update();

    expect(page().textContent).toContain(
      'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
    );
    expect(TestBed.inject(Router).url).toBe('/biblioteca/b1/c1');
  });

  it('si la preparación falla: error con Reintentar y nunca "al día"', async () => {
    const { page, update } = await openReady();
    vi.spyOn(TestBed.inject(BookReadyCardsService), 'prepareChapterSession').mockRejectedValue(
      new Error('sin tarjetas'),
    );

    button(page(), 'Estudiar este capítulo')?.click();
    await update();

    expect(page().querySelector('[data-chapter-actions] [role="alert"]')?.textContent).toContain(
      'No se pudo preparar la sesión. Inténtalo de nuevo.',
    );
    expect(button(page(), 'Reintentar')).toBeDefined();
    expect(page().textContent).not.toContain('Estás al día con este capítulo');
  });

  it('un doble toque prepara una sola sesión', async () => {
    const { page } = await openReady();
    const prepare = vi
      .spyOn(TestBed.inject(BookReadyCardsService), 'prepareChapterSession')
      .mockReturnValue(new Promise(() => undefined));

    button(page(), 'Estudiar este capítulo')?.click();
    button(page(), 'Estudiar este capítulo')?.click();
    await new Promise((resolve) => setTimeout(resolve));

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith('c1');
  });
});

describe('CapituloDetailPageComponent · importar tarjetas', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('"Importar tarjetas" abre el diálogo del capítulo y lo importado aparece sin recargar', async () => {
    const { page, update } = await open('/biblioteca/b1/c1');
    await update();
    await update();

    Array.from(page().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Importar tarjetas')
      ?.click();
    await update();
    const dialog = document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
    expect(dialog?.querySelector('h2')?.textContent?.trim()).toBe('Importar tarjetas');

    const area = dialog?.querySelector('textarea');
    if (area) {
      area.value = 'to give up | rendirse\nto look up | buscar';
      area.dispatchEvent(new Event('input'));
    }
    await update();
    // Repetida contra la tarjeta que ya tiene el capítulo: el diálogo recibió sus tarjetas.
    expect(dialog?.textContent).toContain('2 tarjetas · 1 repetida');
    dialog?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();
    await update();

    expect(document.querySelector('.cdk-overlay-container [role="dialog"]')).toBeNull();
    const fronts = Array.from(
      page().querySelectorAll('app-card-row [data-card-body] > span:first-child'),
    ).map((row) => row.textContent?.replace(/\s+/g, ' ').trim());
    expect(fronts).toContain('to look up → buscar');
  });
});
