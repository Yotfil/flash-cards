import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { Book } from '@domain/models/book.model';
import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';
import { PracticeHandoffService } from '@services/practice/practice-handoff.service';
import { BookReadyCardsService } from '@services/queue/book-ready-cards.service';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { SessionService } from '@services/session/session.service';
import { allowDialogFocusInJsdom, openDialog, typeInto } from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { LibroDetailPageComponent } from './libro-detail-page.component';

@Component({ template: '' })
class BlankPageComponent {}

async function open(
  bookId: string,
  options: {
    books?: Book[];
    online?: boolean;
    failList?: boolean;
    failTotals?: boolean;
    cards?: Card[];
    holdChapters?: boolean;
  } = {},
) {
  const repository = new FakeBookRepository();
  repository.seed(
    ...(options.books ?? [aBook({ id: 'b1', name: 'Inglés', subject: 'language-en' })]),
  );
  repository.stateTotals.set('b1', { newCards: 20, learning: 4, review: 12 });
  if (options.failList) {
    repository.failWith.listByUser = new Error('offline');
  }
  const chapters = new FakeChapterRepository();
  chapters.seed(aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos' }));
  if (options.failTotals) {
    repository.failWith.countCardsByState = new Error('offline');
  }
  const cards = new FakeCardRepository();
  cards.seed(...(options.cards ?? []));
  let releaseChapters: () => void = () => undefined;
  if (options.holdChapters) {
    const gate = new Promise<void>((resolve) => (releaseChapters = resolve));
    const list = chapters.listByBook.bind(chapters);
    chapters.listByBook = async (uid, bookId) => {
      await gate;
      return list(uid, bookId);
    };
  }
  const connectivity = new FakeConnectivity(options.online ?? true);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca/:bookId', component: LibroDetailPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
        { path: 'repaso', component: BlankPageComponent },
        { path: 'practicar', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: repository },
      { provide: ChapterRepository, useValue: chapters },
      { provide: CardRepository, useValue: cards },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: FileDeliveryPort, useValue: new FakeFileDelivery() },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/biblioteca/${bookId}`);
  const update = async (waitForStable = true) => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    if (waitForStable) {
      await TestBed.inject(ApplicationRef).whenStable();
    }
    harness.detectChanges();
  };
  await update(!options.holdChapters);
  const page = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(page().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  return {
    harness,
    repository,
    chapters,
    cards,
    connectivity,
    update,
    page,
    button,
    releaseChapters,
  };
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

  it('"Exportar «Inglés»" está junto a los ajustes y abre la exportación de ese libro', async () => {
    const { page, update } = await open('b1');
    const exportButton = page().querySelector<HTMLButtonElement>(
      '[aria-label="Exportar «Inglés»"]',
    );
    const settings = page().querySelector('[aria-label="Ajustes de Inglés"]');

    expect(exportButton?.parentElement).toBe(settings?.parentElement);
    expect(exportButton?.querySelector('[data-icon="share"]')).not.toBeNull();
    exportButton?.click();
    await update();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Exportar «Inglés»');
    expect(openDialog().textContent).toContain('1 capítulo · 0 tarjetas');
  });

  it('sin conexión, "Exportar" está deshabilitado con el motivo y se habilita al volver la red', async () => {
    const { page, connectivity, update } = await open('b1', { online: false });
    const exportButton = () =>
      page().querySelector<HTMLButtonElement>('[aria-label="Exportar «Inglés»"]');

    expect(exportButton()?.disabled).toBe(true);
    const describedBy = exportButton()?.getAttribute('aria-describedby') ?? '';
    expect(page().querySelector(`#${describedBy}`)?.textContent?.trim()).toBe(
      'Necesitas conexión para exportar.',
    );

    connectivity.setOnline(true);
    await update();

    expect(exportButton()?.disabled).toBe(false);
    expect(exportButton()?.hasAttribute('aria-describedby')).toBe(false);
    expect(page().textContent).not.toContain('Necesitas conexión para exportar.');
  });

  it('la región de capítulos pinta la lista del libro', async () => {
    const { page, chapters } = await open('b1');

    expect(page().querySelector('app-chapter-list section h2')?.textContent?.trim()).toBe(
      'Capítulos',
    );
    expect(page().textContent).toContain('Básicos');
    expect(chapters.calls.listByBook).toBe(1);
  });

  it('con el libro inexistente no hay lista de capítulos', async () => {
    const { page } = await open('nadie');

    expect(page().querySelector('app-chapter-list')).toBeNull();
  });

  it('cuando la lista cambia el contenido del libro, vuelve a pedir los totales', async () => {
    const { harness, repository, update } = await open('b1');
    expect(repository.calls.countCardsByState).toBe(1);

    const list = harness.fixture.debugElement.query(By.css('app-chapter-list'));
    (list.componentInstance as { contentsChanged: { emit(): void } }).contentsChanged.emit();
    await update();

    expect(repository.calls.countCardsByState).toBe(2);
  });
});

describe('LibroDetailPageComponent · estudiar este libro', () => {
  const ready = aCard({ id: 'k1', bookId: 'b1', chapterId: 'c1' });

  it('abre las listas del libro y ofrece estudiar solo con los capítulos cargados', async () => {
    const { page, cards, button, update, releaseChapters } = await open('b1', {
      holdChapters: true,
    });

    expect(button('Estudiar este libro')).toBeUndefined();
    expect(cards.calls.listReadyByBook).toBe(1);

    releaseChapters();
    await update();
    expect(page().querySelector('[data-book-actions]')?.textContent).toContain(
      'Estudiar este libro',
    );
  });

  it('con tarjetas listas entrega la sesión del libro y navega al repaso', async () => {
    const { button, update } = await open('b1', { cards: [ready] });

    button('Estudiar este libro')?.click();
    await update();

    expect(TestBed.inject(StudyHandoffService).take()).toEqual({
      cards: [ready],
      source: { kind: 'book', bookId: 'b1' },
    });
    expect(TestBed.inject(Router).url).toBe('/repaso');
  });

  it('sin tarjetas listas dice que está al día, sin salir', async () => {
    const { page, button, update } = await open('b1');

    button('Estudiar este libro')?.click();
    await update();

    expect(page().textContent).toContain(
      'Estás al día con este libro. No hay tarjetas para repasar ahora.',
    );
    expect(TestBed.inject(Router).url).toBe('/biblioteca/b1');
  });

  it('si la preparación falla: error con Reintentar y nunca "al día"', async () => {
    const { page, cards, button, update } = await open('b1', { cards: [ready] });
    cards.failWith.listReadyByBook = new Error('offline');

    button('Estudiar este libro')?.click();
    await update();

    expect(page().querySelector('[data-book-actions] [role="alert"]')?.textContent).toContain(
      'No se pudo preparar la sesión. Inténtalo de nuevo.',
    );
    expect(button('Reintentar')).toBeDefined();
    expect(page().textContent).not.toContain('Estás al día con este libro');
  });

  it('un doble toque prepara una sola sesión', async () => {
    const { button, update } = await open('b1', { cards: [ready] });
    const prepare = vi
      .spyOn(TestBed.inject(BookReadyCardsService), 'prepareBookSession')
      .mockReturnValue(new Promise(() => undefined));

    button('Estudiar este libro')?.click();
    button('Estudiar este libro')?.click();
    await update(false);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith('b1');
    expect(button('Preparando…')?.disabled).toBe(true);
  });
});

describe('LibroDetailPageComponent · practicar', () => {
  const basic = (id: string, chapterId: string) =>
    aCard({ id, bookId: 'b1', chapterId, front: `front ${id}`, back: `back ${id}` });

  it('con los capítulos cargados, "Practicar" secundario junto a "Estudiar este libro"', async () => {
    const { page, button, update, releaseChapters } = await open('b1', { holdChapters: true });

    expect(button('Practicar')).toBeUndefined();
    releaseChapters();
    await update();

    const actions = page().querySelector('[data-book-actions]');
    expect(actions?.textContent).toContain('Estudiar este libro');
    expect(button('Practicar')?.closest('[data-book-actions]')).toBe(actions);
    expect(button('Practicar')?.classList).toContain('border-glass-border');
  });

  it('con básicas en el libro, arma el quiz con todo el libro y abre la práctica', async () => {
    const { cards, button, update } = await open('b1', {
      cards: [basic('k1', 'c1'), basic('k2', 'c2')],
    });

    button('Practicar')?.click();
    await update();

    expect(cards.calls.listByBook).toBe(1);
    expect(TestBed.inject(PracticeHandoffService).prepared()?.origin).toEqual({
      kind: 'book',
      bookId: 'b1',
    });
    expect(TestBed.inject(Router).url).toBe('/practicar');
  });

  it('sin tarjetas elegibles: "Nada que practicar aún." y no sale', async () => {
    const { page, button, update } = await open('b1');

    button('Practicar')?.click();
    await update();

    expect(page().querySelector('[data-book-actions]')?.textContent).toContain(
      'Nada que practicar aún.',
    );
    expect(TestBed.inject(Router).url).toBe('/biblioteca/b1');
  });

  it('si la lectura falla: el error de la práctica y no sale', async () => {
    const { page, cards, button, update } = await open('b1');
    cards.failWith.listByBook = new Error('sin red');

    button('Practicar')?.click();
    await update();

    expect(page().querySelector('[data-book-actions] [role="alert"]')?.textContent).toContain(
      'No se pudo preparar la práctica. Inténtalo de nuevo.',
    );
    expect(TestBed.inject(Router).url).toBe('/biblioteca/b1');
  });
});
