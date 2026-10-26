import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardState, type Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { Logger } from '@domain/ports/logger.port';
import { DailyQueueService } from '@services/queue/daily-queue.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeDailyStatsRepository, aDailyStats } from '@testing/fake-daily-stats-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardCollectionChanges } from './card-collection-changes';
import { ProgressService } from './progress.service';

// Sábado 24 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-24).
const T0 = new Date('2026-10-24T15:00:00Z');
const DAY_MS = 86_400_000;

function dueCard(id: string): Card {
  const base = aCard({ id, bookId: 'ingles' });
  return {
    ...base,
    scheduling: {
      ...base.scheduling,
      state: CardState.Review,
      due: new Date(T0.getTime() - DAY_MS),
    },
  };
}

function newCard(id: string): Card {
  const base = aCard({ id, bookId: 'ingles', createdAt: new Date(T0.getTime() - DAY_MS) });
  return { ...base, scheduling: { ...base.scheduling, state: CardState.New, due: base.createdAt } };
}

function setup(options: { online?: boolean } = {}) {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'ingles', newCardsPerDay: 20 }));
  books.collectionTotals = { newCards: 3, learning: 2, review: 5 };
  const cards = new FakeCardRepository();
  cards.seed(
    dueCard('d1'),
    dueCard('d2'),
    dueCard('d3'),
    dueCard('d4'),
    newCard('n1'),
    newCard('n2'),
  );
  const stats = new FakeDailyStatsRepository();
  const connectivity = new FakeConnectivity(options.online ?? true);
  const logger = new FakeLogger();
  const session = new FakeSessionService({ kind: 'active', user: aUser() });
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: books },
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: logger },
      { provide: SessionService, useValue: session },
    ],
  });
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return {
    service: TestBed.inject(ProgressService),
    queue: TestBed.inject(DailyQueueService),
    changes: TestBed.inject(CardCollectionChanges),
    books,
    cards,
    stats,
    connectivity,
    logger,
    session,
    settle,
  };
}

describe('ProgressService · el día', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('refresh rearma la cola del día (la de Hoy, no otra)', async () => {
    const { service, queue, settle } = setup();
    const refreshQueue = vi.spyOn(queue, 'refreshQueue');

    service.refresh();
    await settle();

    expect(refreshQueue).toHaveBeenCalledTimes(1);
    expect(service.dayStatus()).toBe('ready');
  });

  it('una visita no lee la racha ni el historial (Progreso no los muestra)', async () => {
    const { service, stats, settle } = setup();

    service.refresh();
    await settle();

    expect(stats.calls.listRecent).toEqual([]);
  });

  it('pendientes = la cola base (4 vencidas + 2 nuevas); repasadas = el contador del día', async () => {
    const { service, stats, settle } = setup();
    stats.seed(
      aDailyStats({
        id: '2026-10-24',
        reviewsCompleted: 7,
        ratingCounts: { again: 1, hard: 1, good: 4, easy: 1 },
      }),
    );

    service.refresh();
    await settle();

    expect(service.pending()).toBe(6);
    expect(service.reviewedToday()).toBe(7);
    expect(service.ratings().map((row) => row.count)).toEqual([1, 1, 4, 1]);
  });

  it('sin contador del día, repasadas 0 y calificaciones en cero', async () => {
    const { service, settle } = setup();

    service.refresh();
    await settle();

    expect(service.reviewedToday()).toBe(0);
    expect(service.ratings().map((row) => row.count)).toEqual([0, 0, 0, 0]);
  });

  it('una visita lee la cola, el contador y la colección una sola vez cada uno', async () => {
    const { service, books, cards, stats, settle } = setup();

    service.refresh();
    await settle();

    expect(cards.calls.listReady).toBe(1);
    expect(stats.calls.getByDay).toEqual(['2026-10-24']);
    expect(books.calls.countCollectionByState).toBe(1);
    expect(service.collectionStatus()).toBe('ready');
    expect(service.shares()?.total).toBe(10);
  });
});

describe('ProgressService · colección y fallos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('si el conteo falla, la colección queda en error y el día sigue listo', async () => {
    const { service, books, settle } = setup();
    books.failWith.countCollectionByState = new Error('sin índice');

    service.refresh();
    await settle();

    expect(service.collectionStatus()).toBe('error');
    expect(service.dayStatus()).toBe('ready');
    expect(service.isEmpty()).toBe(false);
  });

  it('si el conteo de la colección falla, queda registrado', async () => {
    const { service, books, logger, settle } = setup();
    const failure = new Error('sin índice');
    books.failWith.countCollectionByState = failure;

    service.refresh();
    await settle();

    expect(logger.entries).toContainEqual({
      level: 'error',
      message: 'No se pudo contar la colección',
      cause: failure,
    });
  });

  it('reintentar la colección no vuelve a leer la cola', async () => {
    const { service, books, cards, settle } = setup();
    books.failWith.countCollectionByState = new Error('sin índice');
    service.refresh();
    await settle();

    delete books.failWith.countCollectionByState;
    service.retryCollection();
    await settle();

    expect(service.collectionStatus()).toBe('ready');
    expect(books.calls.countCollectionByState).toBe(2);
    expect(cards.calls.listReady).toBe(1);
  });

  it('sin red no se cuenta: "offline", nunca vacío; con Progreso abierta, al volver la red se cuenta sola', async () => {
    const { service, books, connectivity, settle } = setup({ online: false });
    books.collectionTotals = { newCards: 0, learning: 0, review: 0 };

    service.enter();
    await settle();

    expect(books.calls.countCollectionByState).toBe(0);
    expect(service.collectionStatus()).toBe('offline');
    expect(service.isEmpty()).toBe(false);

    connectivity.setOnline(true);
    await settle();

    expect(books.calls.countCollectionByState).toBe(1);
    expect(service.collectionStatus()).toBe('ready');
    expect(service.isEmpty()).toBe(true);
  });

  it('vacío solo con el conteo listo y en cero', async () => {
    const { service, books, settle } = setup();
    books.collectionTotals = { newCards: 0, learning: 0, review: 0 };

    service.refresh();
    await settle();

    expect(service.isEmpty()).toBe(true);
  });

  it('si la cola del día falla, el día queda en error aunque la colección resuelva', async () => {
    const { service, cards, settle } = setup();
    cards.failWith.listReady = new Error('sin red');

    service.refresh();
    await settle();

    expect(service.dayStatus()).toBe('error');
    expect(service.collectionStatus()).toBe('ready');
  });
});

describe('ProgressService · la colección se cuenta una vez y se guarda en memoria', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('dos visitas seguidas sin cambios cuentan la colección una sola vez', async () => {
    const { service, books, settle } = setup();

    service.refresh();
    await settle();
    service.refresh();
    await settle();

    expect(books.calls.countCollectionByState).toBe(1);
    expect(service.shares()?.total).toBe(10);
  });

  it('entrar a Progreso con red cuenta una sola vez', async () => {
    const { service, books, settle } = setup();

    service.enter();
    await settle();

    expect(books.calls.countCollectionByState).toBe(1);
    expect(service.collectionStatus()).toBe('ready');
  });

  it('tras un cambio de la colección en este dispositivo, la visita siguiente vuelve a contar', async () => {
    const { service, books, changes, settle } = setup();
    service.refresh();
    await settle();

    books.collectionTotals = { newCards: 1, learning: 2, review: 3 };
    changes.notify();
    service.refresh();
    await settle();

    expect(books.calls.countCollectionByState).toBe(2);
    expect(service.shares()?.total).toBe(6);
  });

  it('Reintentar de la sección vuelve a contar sin volver a leer la cola', async () => {
    const { service, books, cards, settle } = setup();
    service.refresh();
    await settle();

    service.retryCollection();
    await settle();

    expect(books.calls.countCollectionByState).toBe(2);
    expect(cards.calls.listReady).toBe(1);
  });

  it('Reintentar de toda la pantalla repite la cola y también el conteo', async () => {
    const { service, books, cards, settle } = setup();
    service.refresh();
    await settle();

    service.retry();
    await settle();

    expect(cards.calls.listReady).toBe(2);
    expect(books.calls.countCollectionByState).toBe(2);
  });

  it('sin red y con un conteo previo, la colección sigue mostrándolo', async () => {
    const { service, books, connectivity, settle } = setup();
    service.refresh();
    await settle();

    connectivity.setOnline(false);
    service.refresh();
    await settle();

    expect(books.calls.countCollectionByState).toBe(1);
    expect(service.collectionStatus()).toBe('ready');
    expect(service.shares()?.total).toBe(10);
  });

  it('al volver la red en otra pantalla no se cuenta nada', async () => {
    const { service, books, connectivity, settle } = setup({ online: false });
    service.refresh();
    await settle();

    connectivity.setOnline(true);
    await settle();

    expect(books.calls.countCollectionByState).toBe(0);
  });

  it('tras salir de Progreso, la red que vuelve tampoco cuenta', async () => {
    const { service, books, connectivity, settle } = setup({ online: false });
    service.enter();
    await settle();
    service.leave();

    connectivity.setOnline(true);
    await settle();

    expect(books.calls.countCollectionByState).toBe(0);
  });

  it('el conteo es de la cuenta que lo pidió: con otra cuenta se vuelve a contar', async () => {
    const { service, books, session, settle } = setup();
    service.refresh();
    await settle();

    session.setState({ kind: 'active', user: aUser({ id: 'u2' }) });
    service.refresh();
    await settle();

    expect(books.calls.countCollectionByState).toBe(2);
  });
});
