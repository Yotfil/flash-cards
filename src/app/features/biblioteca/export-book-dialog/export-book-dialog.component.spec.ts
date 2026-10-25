import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { allowDialogFocusInJsdom, pressEscape } from '@testing/dialog-test-helpers';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import {
  ExportBookDialogComponent,
  type ExportBookDialogData,
} from './export-book-dialog.component';

const CARDS = Array.from({ length: 40 }, (_, index) =>
  aCard({
    id: `k${index}`,
    chapterId: index < 30 ? 'c1' : 'c2',
    front: `word ${index}`,
    back: `palabra ${index}`,
  }),
);

async function open(options: { canShare?: boolean; holdRead?: boolean; failRead?: boolean } = {}) {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'b1', name: 'Phrasal Verbs' }));
  const chapters = new FakeChapterRepository();
  chapters.seed(
    aChapter({ id: 'c1', name: 'Movement', order: 0 }),
    aChapter({ id: 'c2', name: 'Grammar', order: 1 }),
  );
  const cards = new FakeCardRepository();
  cards.seed(...CARDS);
  if (options.failRead) {
    cards.failWith.listByBookFromServer = new Error('sin red');
  }
  let releaseRead: () => void = () => undefined;
  if (options.holdRead) {
    const real = cards.listByBookFromServer.bind(cards);
    vi.spyOn(cards, 'listByBookFromServer').mockImplementation(
      (uid, bookId) =>
        new Promise<Card[]>((resolve) => {
          releaseRead = () => resolve(real(uid, bookId));
        }),
    );
  }
  const delivery = new FakeFileDelivery();
  delivery.canShare = options.canShare ?? false;
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: books },
      { provide: ChapterRepository, useValue: chapters },
      { provide: CardRepository, useValue: cards },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: FileDeliveryPort, useValue: delivery },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  // Con la lectura retenida la app nunca está estable: solo se pinta.
  const render = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };
  const update = async () => {
    await render();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  const ref = TestBed.inject(DialogService).open<boolean, ExportBookDialogData>(
    ExportBookDialogComponent,
    {
      label: 'Exportar «Phrasal Verbs»',
      size: 'sm',
      data: { bookId: 'b1', bookName: 'Phrasal Verbs' },
    },
  );
  await (options.holdRead ? render() : update());
  const dialog = () =>
    document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]') as HTMLElement;
  const button = (text: string) =>
    Array.from(dialog().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const click = async (text: string) => {
    button(text)?.click();
    await update();
  };
  return {
    ref,
    cards,
    delivery,
    render,
    update,
    dialog,
    button,
    click,
    releaseRead: () => releaseRead(),
  };
}

describe('ExportBookDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('mientras lee muestra un esqueleto ocupado y las acciones deshabilitadas; al resolver, el resumen', async () => {
    const { dialog, button, update, releaseRead } = await open({ holdRead: true });

    expect(dialog().querySelector('h2')?.textContent?.trim()).toBe('Exportar «Phrasal Verbs»');
    expect(dialog().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(button('Descargar .txt')?.disabled).toBe(true);
    expect(button('Copiar texto')?.disabled).toBe(true);

    releaseRead();
    await update();

    expect(dialog().textContent).toContain('2 capítulos · 40 tarjetas');
    expect(dialog().querySelector('app-skeleton')).toBeNull();
    expect(button('Descargar .txt')?.disabled).toBe(false);
  });

  it('si la lectura falla, ofrece reintentar sin acciones de entrega; reintentar muestra el resumen', async () => {
    const { cards, dialog, button, click } = await open({ failRead: true });

    expect(dialog().textContent).toContain('No pudimos cargar las tarjetas del libro.');
    expect(button('Compartir')).toBeUndefined();
    expect(button('Descargar .txt')).toBeUndefined();
    expect(button('Copiar texto')).toBeUndefined();

    delete cards.failWith.listByBookFromServer;
    await click('Reintentar');

    expect(dialog().textContent).toContain('2 capítulos · 40 tarjetas');
    expect(button('Descargar .txt')).toBeDefined();
  });

  it('donde se puede compartir, la única acción principal es "Compartir" y comparte el archivo', async () => {
    const { ref, delivery, button, click } = await open({ canShare: true });

    expect(button('Descargar .txt')).toBeUndefined();
    await click('Compartir');

    expect(delivery.shared).toEqual([
      { name: 'Phrasal Verbs.txt', content: expect.stringContaining('# Movement\n') },
    ]);
    await expect(ref.closed).resolves.toBe(true);
  });

  it('cerrar la hoja de compartir deja el diálogo abierto, sin alerta', async () => {
    const { delivery, dialog, button, click } = await open({ canShare: true });
    delivery.shareResult = 'cancelled';

    await click('Compartir');

    expect(dialog()).not.toBeNull();
    expect(dialog().querySelector('[role="alert"]')).toBeNull();
    expect(button('Compartir')?.disabled).toBe(false);
  });

  it('si compartir falla, avisa dentro del diálogo y deja intentarlo de nuevo', async () => {
    const { delivery, dialog, button, click } = await open({ canShare: true });
    delivery.failWith.share = new Error('falló');

    await click('Compartir');

    expect(dialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo exportar el libro. Inténtalo de nuevo.',
    );
    expect(button('Compartir')?.disabled).toBe(false);
    expect(button('Copiar texto')?.disabled).toBe(false);
  });

  it('donde no se puede compartir, "Descargar .txt" descarga el archivo y cierra', async () => {
    const { ref, delivery, button, click } = await open({ canShare: false });

    expect(button('Compartir')).toBeUndefined();
    await click('Descargar .txt');

    expect(delivery.downloaded.map((file) => file.name)).toEqual(['Phrasal Verbs.txt']);
    await expect(ref.closed).resolves.toBe(true);
  });

  it('"Copiar texto" copia el texto completo, confirma "Copiado" y no cierra', async () => {
    const { delivery, dialog, click } = await open();

    await click('Copiar texto');

    expect(delivery.copied).toHaveLength(1);
    expect(delivery.copied[0]).toContain('# Movement\n');
    expect(delivery.copied[0]).toContain('# Grammar\n');
    expect(dialog().querySelector('[role="status"]')?.textContent?.trim()).toBe('Copiado');
    expect(dialog()).not.toBeNull();
  });

  it('sin portapapeles, avisa que use Compartir o Descargar', async () => {
    const { delivery, dialog, click } = await open();
    delivery.failWith.copyText = new Error('sin portapapeles');

    await click('Copiar texto');

    expect(dialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo copiar. Usa Compartir o Descargar.',
    );
  });

  it('mientras entrega está ocupado: botones deshabilitados, Escape no cierra y dos clics envían una vez', async () => {
    const { ref, delivery, dialog, button, update } = await open();
    let release: () => void = () => undefined;
    delivery.gate = new Promise<void>((resolve) => (release = resolve));

    button('Descargar .txt')?.click();
    button('Descargar .txt')?.click();
    await update();

    expect(dialog().getAttribute('aria-busy')).toBe('true');
    expect(button('Descargar .txt')?.disabled).toBe(true);
    expect(button('Copiar texto')?.disabled).toBe(true);
    expect(button('Cancelar')?.disabled).toBe(true);
    pressEscape();
    await update();
    expect(dialog()).not.toBeNull();

    release();
    await expect(ref.closed).resolves.toBe(true);
    expect(delivery.downloaded).toHaveLength(1);
  });

  it('Cancelar cierra con false mientras carga', async () => {
    const { ref, button } = await open({ holdRead: true });

    button('Cancelar')?.click();

    await expect(ref.closed).resolves.toBe(false);
  });

  it('Cancelar cierra con false con el resumen listo', async () => {
    const { ref, click } = await open();

    await click('Cancelar');

    await expect(ref.closed).resolves.toBe(false);
  });

  it('Cancelar cierra con false tras un fallo de lectura', async () => {
    const { ref, click } = await open({ failRead: true });

    await click('Cancelar');

    await expect(ref.closed).resolves.toBe(false);
  });
});
