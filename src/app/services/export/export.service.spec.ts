import { TestBed } from '@angular/core/testing';

import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ExportService } from './export.service';

const ACTIVE: SessionState = { kind: 'active', user: aUser({ id: 'u7' }) };

function setup() {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'b1', name: 'Phrasal Verbs', subject: 'inglés' }));
  const chapters = new FakeChapterRepository();
  chapters.seed(
    aChapter({ id: 'c2', name: 'Grammar', order: 1 }),
    aChapter({ id: 'c1', name: 'Movement', order: 0 }),
    aChapter({ id: 'otro', bookId: 'b2', name: 'Ajeno', order: 0 }),
  );
  const cards = new FakeCardRepository();
  cards.seed(
    ...Array.from({ length: 39 }, (_, index) =>
      aCard({ id: `m${index}`, chapterId: 'c1', front: `word ${index}`, back: `palabra ${index}` }),
    ),
    aCard({ id: 'g1', chapterId: 'c2', cardType: 'cloze', front: 'I {{have}} eaten', back: '' }),
    aCard({ id: 'x1', bookId: 'b2', chapterId: 'otro' }),
  );
  const delivery = new FakeFileDelivery();
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: books },
      { provide: ChapterRepository, useValue: chapters },
      { provide: CardRepository, useValue: cards },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: SessionService, useValue: new FakeSessionService(ACTIVE) },
      { provide: FileDeliveryPort, useValue: delivery },
      { provide: Logger, useValue: logger },
    ],
  });
  return { service: TestBed.inject(ExportService), chapters, cards, delivery, logger };
}

describe('ExportService · cargar el paquete', () => {
  it('arma el paquete del libro con sus capítulos por orden y todas sus tarjetas del servidor', async () => {
    const { service, chapters, cards } = setup();

    const preview = await service.loadPackage('b1');

    expect(chapters.listedUids).toEqual(['u7']);
    expect(cards.listedUids).toEqual(['u7']);
    expect(cards.calls.listByBookFromServer).toBe(1);
    expect(preview.fileName).toBe('Phrasal Verbs.txt');
    expect(preview.chapterCount).toBe(2);
    expect(preview.cardCount).toBe(40);
    expect(preview.package.name).toBe('Phrasal Verbs');
    expect(preview.package.subject).toBe('inglés');
    expect(preview.package.chapters.map((chapter) => chapter.name)).toEqual([
      'Movement',
      'Grammar',
    ]);
    expect(preview.text.startsWith('# Movement\nword 0 | palabra 0\n')).toBe(true);
    expect(preview.text.endsWith('\n\n# Grammar\nI {{have}} eaten\n')).toBe(true);
    expect(preview.cardsThatWontReturn).toEqual([]);
  });

  it('nombra las tarjetas que no volverán igual al importar el texto', async () => {
    const { service, cards } = setup();
    cards.seed(aCard({ id: 'h1', chapterId: 'c2', front: '#include', back: 'incluye un archivo' }));

    const preview = await service.loadPackage('b1');

    // "#include" se volvería capítulo y la cloze que la sigue en "Grammar" caería en él.
    expect(preview.cardsThatWontReturn.map((card) => card.front)).toEqual([
      '#include',
      'I {{have}} eaten',
    ]);
  });

  it('un libro que no existe no se exporta', async () => {
    const { service } = setup();

    await expect(service.loadPackage('no-existe')).rejects.toThrow();
  });

  it('si la lectura falla, la registra y la relanza', async () => {
    const { service, cards, logger } = setup();
    const failure = new Error('sin red');
    cards.failWith.listByBookFromServer = failure;

    await expect(service.loadPackage('b1')).rejects.toBe(failure);
    expect(logger.entries).toEqual([
      { level: 'error', message: expect.stringContaining('b1'), cause: failure },
    ]);
  });
});

describe('ExportService · entregar', () => {
  async function loaded() {
    const context = setup();
    return { ...context, preview: await context.service.loadPackage('b1') };
  }

  it('compartir pasa el archivo con su nombre y su texto', async () => {
    const { service, delivery, preview } = await loaded();

    expect(await service.deliver(preview, 'share')).toBe('done');
    expect(delivery.shared).toEqual([{ name: 'Phrasal Verbs.txt', content: preview.text }]);
  });

  it('cerrar la hoja de compartir es "cancelado"', async () => {
    const { service, delivery, preview } = await loaded();
    delivery.shareResult = 'cancelled';

    expect(await service.deliver(preview, 'share')).toBe('cancelled');
  });

  it('descargar y copiar entregan el mismo archivo y el mismo texto', async () => {
    const { service, delivery, preview } = await loaded();

    expect(await service.deliver(preview, 'download')).toBe('done');
    expect(await service.deliver(preview, 'copy')).toBe('done');
    expect(delivery.downloaded).toEqual([{ name: 'Phrasal Verbs.txt', content: preview.text }]);
    expect(delivery.copied).toEqual([preview.text]);
  });

  it('si la entrega falla, la registra y la relanza', async () => {
    const { service, delivery, logger, preview } = await loaded();
    const failure = new Error('bloqueado');
    delivery.failWith.copyText = failure;

    await expect(service.deliver(preview, 'copy')).rejects.toBe(failure);
    expect(logger.entries).toEqual([
      { level: 'error', message: expect.stringContaining('copy'), cause: failure },
    ]);
  });
});
