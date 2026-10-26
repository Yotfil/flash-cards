import { TestBed } from '@angular/core/testing';

import { CardRepository } from '@domain/ports/card.repository';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PracticeHandoffService } from './practice-handoff.service';
import { PracticeService } from './practice.service';

const basics = (count: number, bookId = 'b1', chapterId = 'c1') =>
  Array.from({ length: count }, (_, index) =>
    aCard({
      id: `${chapterId}-${index}`,
      bookId,
      chapterId,
      front: `f${chapterId}${index}`,
      back: `b${chapterId}${index}`,
    }),
  );
const cloze = aCard({ id: 'cz', cardType: 'cloze', front: 'El {{gato}}', back: '' });

function setup() {
  const cards = new FakeCardRepository();
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: cards },
      { provide: Logger, useValue: logger },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser({ id: 'u9' }) }),
      },
    ],
  });
  return {
    service: TestBed.inject(PracticeService),
    handoff: TestBed.inject(PracticeHandoffService),
    cards,
    logger,
  };
}

describe('PracticeService · capítulo', () => {
  it('arma el quiz con las tarjetas ya cargadas, lo entrega y dice cuántas preguntas tiene, sin leer', async () => {
    const { service, handoff, cards } = setup();
    const origin = { kind: 'chapter', bookId: 'b1', chapterId: 'c1' } as const;

    expect(await service.prepareChapterPractice([...basics(4), cloze], origin)).toBe(4);

    const prepared = handoff.take();
    expect(prepared?.origin).toEqual(origin);
    expect(prepared?.questions.map((question) => question.cardId).sort()).toEqual([
      'c1-0',
      'c1-1',
      'c1-2',
      'c1-3',
    ]);
    expect(Object.values(cards.calls).every((count) => count === 0)).toBe(true);
  });

  it('vaciar la bandeja quita la práctica preparada (ya no se va a abrir)', async () => {
    const { service, handoff } = setup();
    await service.prepareChapterPractice(basics(4), {
      kind: 'chapter',
      bookId: 'b1',
      chapterId: 'c1',
    });

    service.discardPrepared();

    expect(handoff.prepared()).toBeNull();
  });

  it('solo clozes: 0 y la bandeja sigue vacía', async () => {
    const { service, handoff } = setup();

    expect(
      await service.prepareChapterPractice([cloze], {
        kind: 'chapter',
        bookId: 'b1',
        chapterId: 'c1',
      }),
    ).toBe(0);
    expect(handoff.prepared()).toBeNull();
  });
});

describe('PracticeService · libro', () => {
  it('lee las tarjetas del libro con el uid, arma hasta 10 con todo el libro y lo entrega', async () => {
    const { service, handoff, cards } = setup();
    cards.seed(
      ...basics(8, 'b1', 'c1'),
      ...basics(8, 'b1', 'c2'),
      ...basics(3, 'otro', 'c3'),
      cloze,
    );

    expect(await service.prepareBookPractice('b1')).toBe(10);

    expect(cards.calls.listByBook).toBe(1);
    expect(cards.listedUids).toEqual(['u9']);
    const prepared = handoff.take();
    expect(prepared?.origin).toEqual({ kind: 'book', bookId: 'b1' });
    expect(prepared?.questions.every((question) => !question.cardId.startsWith('c3'))).toBe(true);
  });

  it('un libro sin elegibles da 0 y no entrega nada', async () => {
    const { service, handoff, cards } = setup();
    cards.seed(cloze);

    expect(await service.prepareBookPractice('b1')).toBe(0);
    expect(handoff.prepared()).toBeNull();
  });

  it('si la lectura falla, la registra y la relanza', async () => {
    const { service, cards, logger } = setup();
    const failure = new Error('sin red');
    cards.failWith.listByBook = failure;

    await expect(service.prepareBookPractice('b1')).rejects.toBe(failure);
    expect(logger.entries).toEqual([
      { level: 'error', message: expect.stringContaining('b1'), cause: failure },
    ]);
  });
});
