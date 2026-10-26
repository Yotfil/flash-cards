import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardState, type Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeDailyStatsRepository, aDailyStats } from '@testing/fake-daily-stats-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { DailyQueueService } from './daily-queue.service';

// Viernes 24 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-24, acaba mañana a las 4).
const T0 = new Date('2026-10-24T15:00:00Z');
const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
const DAY_MS = 86_400_000;

function newCard(id: string, bookId: string, daysAgo: number): Card {
  const createdAt = new Date(T0.getTime() - daysAgo * DAY_MS);
  const base = aCard({ id, bookId, createdAt });
  return { ...base, scheduling: { ...base.scheduling, state: CardState.New, due: createdAt } };
}

function dueCard(id: string, bookId: string): Card {
  const base = aCard({ id, bookId });
  return {
    ...base,
    scheduling: {
      ...base.scheduling,
      state: CardState.Review,
      due: new Date(T0.getTime() - DAY_MS),
    },
  };
}

const INGLES = aBook({ id: 'ingles', name: 'Inglés', newCardsPerDay: 5, order: 0 });
const MEDICINA = aBook({ id: 'medicina', name: 'Medicina', newCardsPerDay: 5, order: 1 });

function setup() {
  const books = new FakeBookRepository();
  books.seed(INGLES, MEDICINA);
  const cards = new FakeCardRepository();
  cards.seed(
    ...Array.from({ length: 20 }, (_, index) => newCard(`i${index}`, 'ingles', 20 - index)),
    ...Array.from({ length: 12 }, (_, index) => newCard(`m${index}`, 'medicina', 12 - index)),
    dueCard('d1', 'ingles'),
  );
  const stats = new FakeDailyStatsRepository();
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: books },
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: Logger, useValue: logger },
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
  return { service: TestBed.inject(DailyQueueService), books, cards, stats, logger, settle };
}

describe('DailyQueueService · carga', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('refresh lee las listas hasta el fin del día y los indicadores de hoy, una vez cada uno', async () => {
    const { service, cards, stats, settle } = setup();

    service.refresh();
    expect(service.status()).toBe('loading');
    await settle();

    expect(cards.calls.listReady).toBe(1);
    expect(cards.readyBefore).toEqual([END_OF_DAY]);
    expect(stats.calls.getByDay).toEqual(['2026-10-24']);
    expect(service.status()).toBe('ready');
  });

  it('sin ajuste, la cola de la sesión es la base', async () => {
    const { service, settle } = setup();

    service.refresh();
    await settle();

    expect(service.baseQueue().newCount).toBe(10);
    expect(service.baseQueue().dueCount).toBe(1);
    expect(service.sessionQueue()).toEqual(service.baseQueue());
  });

  it('expone los indicadores de hoy y los aplica a los topes', async () => {
    const { service, stats, settle } = setup();
    const today = aDailyStats({ id: '2026-10-24', newCardsIntroduced: { ingles: 4 } });
    stats.seed(today);

    service.refresh();
    await settle();

    expect(service.todayStats()).toEqual(today);
    expect(service.baseQueue().perBook[0]?.new).toBe(1);
  });

  it('con la biblioteca vacía no hay libros, y no es un error', async () => {
    const { service, books, settle } = setup();
    books.books.clear();

    service.refresh();
    await settle();

    expect(service.hasBooks()).toBe(false);
    expect(service.status()).toBe('ready');
  });

  it('volver a Hoy relee también los libros: un libro creado en otro dispositivo entra en la cola', async () => {
    const { service, books, cards, settle } = setup();
    service.refresh();
    await settle();

    // En el computador importa "Inglés B2" con 30 nuevas; el móvil seguía con Cadence abierta.
    books.seed(aBook({ id: 'b2', name: 'Inglés B2', newCardsPerDay: 20, order: 2 }));
    cards.seed(...Array.from({ length: 30 }, (_, index) => newCard(`b2-${index}`, 'b2', 1)));
    service.refresh();
    await settle();

    expect(service.baseQueue().perBook.find((row) => row.bookId === 'b2')?.new).toBe(20);
    expect(books.calls.listByUser).toBe(2);
  });

  it('deja fuera las tarjetas de un libro que ya no existe y registra cuántas', async () => {
    const { service, cards, logger, settle } = setup();
    cards.seed(dueCard('h1', 'borrado'), dueCard('h2', 'borrado'), newCard('h3', 'borrado', 1));

    service.refresh();
    await settle();

    expect(service.baseQueue().cards.map((card) => card.bookId)).not.toContain('borrado');
    expect(service.baseQueue().dueCount).toBe(1);
    expect(logger.entries).toEqual([
      { level: 'warn', message: 'Tarjetas de libros que ya no existen, fuera de Hoy: 3' },
    ]);
  });

  it('si la cola no se puede armar, queda registrado', async () => {
    const { service, cards, logger, settle } = setup();
    const failure = new Error('Documento inválido en users/u1/cards/k1');
    cards.failWith.listReady = failure;

    service.refresh();
    await settle();

    expect(service.status()).toBe('error');
    expect(logger.entries).toContainEqual({
      level: 'error',
      message: 'No se pudo armar la cola de Hoy',
      cause: failure,
    });
  });

  it('si fallan las tarjetas o los libros, la cola está en error', async () => {
    const failingCards = setup();
    failingCards.cards.failWith.listReady = new Error('offline');
    failingCards.service.refresh();
    await failingCards.settle();
    expect(failingCards.service.status()).toBe('error');

    TestBed.resetTestingModule();
    const failingBooks = setup();
    failingBooks.books.failWith.listByUser = new Error('offline');
    failingBooks.service.refresh();
    await failingBooks.settle();
    expect(failingBooks.service.status()).toBe('error');
  });
});

/** Deja en espera las listas del servidor (las del dispositivo responden al instante). */
function holdServerReady(cards: FakeCardRepository): () => void {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const list = cards.listReady.bind(cards);
  cards.listReady = async (uid, before, source) => {
    if (source !== 'device') {
      await gate;
    }
    return list(uid, before, source);
  };
  return release;
}

/** Un ciclo sin esperar a que la app quede estable (con el servidor en espera no lo está). */
async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
}

describe('DailyQueueService · lo guardado en el dispositivo primero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('con libros y tarjetas guardados, pinta esa cola al instante y luego la del servidor', async () => {
    const { service, books, cards, settle } = setup();
    books.seedOnDevice(INGLES, MEDICINA);
    cards.seedOnDevice(dueCard('d1', 'ingles'));
    const release = holdServerReady(cards);

    service.refresh();
    await tick();
    expect(service.status()).toBe('ready');
    expect(service.baseQueue().cards.map((card) => card.id)).toEqual(['d1']);

    release();
    await settle();
    expect(service.baseQueue().cards).toHaveLength(1 + 5 + 5);
    expect(cards.calls.listReady).toBe(1);
  });

  it('sin tarjetas guardadas no pinta nada hasta el servidor: nunca "al día" por lo guardado', async () => {
    const { service, books, cards } = setup();
    books.seedOnDevice(INGLES, MEDICINA);
    holdServerReady(cards);

    service.refresh();
    await tick();

    expect(service.status()).toBe('loading');
  });

  it('las tarjetas de libros que ya no existen se registran una vez, con la lectura del servidor', async () => {
    const { service, books, cards, logger, settle } = setup();
    books.seedOnDevice(INGLES);
    cards.seed(dueCard('h1', 'borrado'));
    cards.seedOnDevice(dueCard('h1', 'borrado'), dueCard('d1', 'ingles'));

    service.refresh();
    await settle();

    expect(logger.entries).toEqual([
      { level: 'warn', message: 'Tarjetas de libros que ya no existen, fuera de Hoy: 1' },
    ]);
  });

  it('"Estudiar ahora" con lo guardado a la vista espera la cola del servidor, sin repetir la lectura', async () => {
    const { service, books, cards, settle } = setup();
    books.seedOnDevice(INGLES, MEDICINA);
    cards.seedOnDevice(dueCard('d1', 'ingles'));
    const release = holdServerReady(cards);
    service.refresh();
    await tick();

    const session = service.prepareSession();
    release();
    await settle();

    expect(await session).toHaveLength(1 + 5 + 5);
    expect(cards.calls.listReady).toBe(1);
  });
});

describe('DailyQueueService · ajuste de nuevas por libro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  const englishNew = (queue: { perBook: { bookId: string; new: number }[] }) =>
    queue.perBook.find((row) => row.bookId === 'ingles')?.new;

  it('subir un libro recalcula la cola de la sesión sin leer de nuevo; la base no cambia', async () => {
    const { service, cards, settle } = setup();
    service.refresh();
    await settle();

    service.setSessionNew('ingles', 11);

    expect(englishNew(service.sessionQueue())).toBe(11);
    expect(service.sessionNewFor('ingles')).toBe(11);
    expect(englishNew(service.baseQueue())).toBe(5);
    expect(cards.calls.listReady).toBe(1);
  });

  it('volver a Hoy el mismo día relee y conserva el ajuste', async () => {
    const { service, cards, settle } = setup();
    service.refresh();
    await settle();
    service.setSessionNew('ingles', 11);

    service.refresh();
    await settle();

    expect(cards.calls.listReady).toBe(2);
    expect(englishNew(service.sessionQueue())).toBe(11);
  });

  it('ofrece un control por libro con lo elegido y lo disponible', async () => {
    const { service, settle } = setup();
    service.refresh();
    await settle();

    service.setSessionNew('ingles', 11);

    expect(service.newCardsChoices()).toEqual([
      { bookId: 'ingles', name: 'Inglés', chosen: 11, available: 20 },
      { bookId: 'medicina', name: 'Medicina', chosen: 5, available: 12 },
    ]);
  });

  it('el ajuste caduca con el día de estudio', async () => {
    const { service, cards, settle } = setup();
    service.refresh();
    await settle();
    service.setSessionNew('ingles', 11);

    vi.setSystemTime(new Date(END_OF_DAY.getTime() + 60_000));
    service.refresh();
    await settle();

    expect(cards.readyBefore.at(-1)).toEqual(new Date(END_OF_DAY.getTime() + DAY_MS));
    expect(service.sessionQueue()).toEqual(service.baseQueue());
    expect(service.sessionNewFor('ingles')).toBe(5);
  });
});

describe('DailyQueueService · racha', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  const studied = (date: string) => aDailyStats({ id: date, reviewsCompleted: 2 });

  it('cada refresh lee una vez los 60 días recientes y calcula la racha', async () => {
    const { service, stats, settle } = setup();
    stats.seed(
      ...['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'].map(
        studied,
      ),
    );

    service.refresh();
    await settle();

    expect(stats.calls.listRecent).toEqual([60]);
    expect(service.streak.value()).toBe(6);
  });

  it('refreshQueue (Progreso) arma la cola sin leer la racha, también la primera vez', async () => {
    const { service, cards, stats, settle } = setup();

    service.refreshQueue();
    await settle();
    service.refreshQueue();
    await settle();

    expect(cards.calls.listReady).toBe(2);
    expect(stats.calls.listRecent).toEqual([]);
    expect(service.status()).toBe('ready');
  });

  it('Hoy después de Progreso sí lee la racha, y cada vuelta a Hoy la relee', async () => {
    const { service, stats, settle } = setup();
    service.refreshQueue();
    await settle();

    service.refresh();
    await settle();
    service.refresh();
    await settle();

    expect(stats.calls.listRecent).toEqual([60, 60]);
  });

  it('si la racha no se puede leer se omite, se registra y la cola sigue', async () => {
    const { service, stats, logger, settle } = setup();
    const failure = new Error('offline');
    stats.failWith.listRecent = failure;

    service.refresh();
    await settle();

    expect(service.streak.value()).toBeNull();
    expect(service.status()).toBe('ready');
    expect(logger.entries.at(-1)?.cause).toBe(failure);
  });
});

describe('DailyQueueService · preparar la sesión de Hoy', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('el mismo día entrega la cola de la sesión sin leer de nuevo', async () => {
    const { service, cards, settle } = setup();
    service.refresh();
    await settle();
    service.setSessionNew('ingles', 11);

    const session = await service.prepareSession();

    expect(session).toEqual(service.sessionQueue().cards);
    expect(session).toHaveLength(1 + 11 + 5);
    expect(cards.calls.listReady).toBe(1);
  });

  it('si el día de estudio cambió con Hoy abierta, arma la cola del día nuevo', async () => {
    const { service, cards, settle } = setup();
    service.refresh();
    await settle();
    service.setSessionNew('ingles', 11);

    vi.setSystemTime(new Date(END_OF_DAY.getTime() + 60_000));
    const session = await service.prepareSession();

    expect(cards.readyBefore.at(-1)).toEqual(new Date(END_OF_DAY.getTime() + DAY_MS));
    expect(session.filter((card) => card.bookId === 'ingles' && card.id !== 'd1')).toHaveLength(5);
  });
});
