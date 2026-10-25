import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { ChaptersService } from '@services/chapters/chapters.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
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
  } = {},
) {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'b1', name: 'Phrasal Verbs' }));
  const chapters = new FakeChapterRepository();
  chapters.seed(aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos' }));
  const cards = new FakeCardRepository();
  cards.seed(aCard({ id: 'k1', bookId: 'b1', chapterId: 'c1', front: 'to give up' }));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca/:bookId/:chapterId', component: CapituloDetailPageComponent },
        { path: 'biblioteca/:bookId', component: BlankPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: books },
      { provide: ChapterRepository, useValue: chapters },
      { provide: CardRepository, useValue: cards },
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
