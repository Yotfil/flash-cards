import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardState, type Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { CardsService } from '@services/cards/cards.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { BookReadyCardsService } from './book-ready-cards.service';
import { orderReadyCards } from './ready-cards';

// Sábado 24 de octubre de 2026, 10:00 en Bogotá: el día de estudio acaba mañana a las 4.
const T0 = new Date('2026-10-24T15:00:00Z');
const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function card(id: string, chapterId: string, due: Date, state = CardState.Review): Card {
  const base = aCard({ id, bookId: 'b1', chapterId, createdAt: new Date(T0.getTime() - DAY_MS) });
  return { ...base, scheduling: { ...base.scheduling, state, due } };
}
const overdue = (id: string, chapterId: string, hoursAgo: number) =>
  card(id, chapterId, new Date(T0.getTime() - hoursAgo * HOUR_MS));
const future = (id: string, chapterId: string) =>
  card(id, chapterId, new Date(END_OF_DAY.getTime() + DAY_MS));

function setup() {
  const repository = new FakeCardRepository();
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: Logger, useValue: new FakeLogger() },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { service: TestBed.inject(BookReadyCardsService), repository, settle };
}

describe('BookReadyCardsService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('abrir un libro lee sus listas hasta el fin del día y cuenta las de cada capítulo', async () => {
    const { service, repository, settle } = setup();
    repository.seed(
      ...Array.from({ length: 22 }, (_, index) => overdue(`a${index}`, 'c1', index + 1)),
      future('f1', 'c3'),
    );
    const c1 = TestBed.runInInjectionContext(() => service.countFor(signal('c1')));
    const c3 = TestBed.runInInjectionContext(() => service.countFor(signal('c3')));

    service.openBook('b1');
    expect(c1()).toBeUndefined();
    await settle();

    expect(repository.calls.listReadyByBook).toBe(1);
    expect(repository.readyBefore).toEqual([END_OF_DAY]);
    expect(c1()).toBe(22);
    expect(c3()).toBe(0);
  });

  it('si la lectura falla, el conteo no está disponible', async () => {
    const { service, repository, settle } = setup();
    repository.failWith.listReadyByBook = new Error('offline');
    const c1 = TestBed.runInInjectionContext(() => service.countFor(signal('c1')));

    service.openBook('b1');
    await settle();

    expect(c1()).toBeUndefined();
  });

  it('la sesión del libro trae todas sus listas sin topes, en orden de estudio', async () => {
    const { service, repository } = setup();
    const cards = [
      ...Array.from({ length: 40 }, (_, index) => overdue(`d${index}`, 'c1', 40 - index)),
      ...Array.from({ length: 15 }, (_, index) =>
        card(`n${index}`, 'c2', new Date(T0.getTime() - DAY_MS), CardState.New),
      ),
      card('en-dos-horas', 'c1', new Date(T0.getTime() + 2 * HOUR_MS)),
      future('mañana', 'c1'),
    ];
    repository.seed(...cards);

    const session = await service.prepareBookSession('b1');

    expect(session).toHaveLength(56);
    expect(session).toEqual(orderReadyCards(cards, END_OF_DAY));
    expect(session.map((ready) => ready.id)).toContain('en-dos-horas');
  });

  it('la sesión del capítulo sale de sus tarjetas ya cargadas, sin leer', async () => {
    const { service, repository, settle } = setup();
    repository.seed(overdue('a', 'c1', 3), future('b', 'c1'), overdue('otro', 'c2', 1));
    TestBed.inject(CardsService).openChapter('c1');
    await settle();
    const reads = repository.calls.listByChapter;

    const session = await service.prepareChapterSession('c1');

    expect(session.map((ready) => ready.id)).toEqual(['a']);
    expect(repository.calls.listByChapter).toBe(reads);
    expect(repository.calls.listReadyByBook).toBe(0);
  });

  it('un capítulo sin listas da una sesión vacía; sin sus tarjetas cargadas, falla', async () => {
    const { service, repository, settle } = setup();
    repository.seed(future('b', 'c1'));

    await expect(service.prepareChapterSession('c1')).rejects.toThrow();

    TestBed.inject(CardsService).openChapter('c1');
    await settle();
    expect(await service.prepareChapterSession('c1')).toEqual([]);
  });
});
