import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { CardStateTotals } from '@domain/models/book.model';
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

import { ProgresoPageComponent } from './progreso-page.component';

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

const SIX = [
  dueCard('d1'),
  dueCard('d2'),
  dueCard('d3'),
  dueCard('d4'),
  newCard('n1'),
  newCard('n2'),
];

async function open(
  options: {
    cards?: Card[];
    collection?: CardStateTotals;
    reviews?: number;
    online?: boolean;
    holdList?: boolean;
    failList?: boolean;
    failCollection?: boolean;
  } = {},
) {
  const books = new FakeBookRepository();
  books.seed(aBook({ id: 'ingles', newCardsPerDay: 20 }));
  books.collectionTotals = options.collection ?? { newCards: 3, learning: 2, review: 5 };
  if (options.failCollection) {
    books.failWith.countCollectionByState = new Error('sin índice');
  }
  const cards = new FakeCardRepository();
  cards.seed(...(options.cards ?? SIX));
  if (options.failList) {
    cards.failWith.listReady = new Error('sin red');
  }
  let releaseList: () => void = () => undefined;
  if (options.holdList) {
    const gate = new Promise<void>((resolve) => (releaseList = resolve));
    const list = cards.listReady.bind(cards);
    cards.listReady = async (uid, before) => {
      await gate;
      return list(uid, before);
    };
  }
  const stats = new FakeDailyStatsRepository();
  if (options.reviews) {
    stats.seed(
      aDailyStats({
        id: '2026-10-24',
        reviewsCompleted: options.reviews,
        ratingCounts: { again: 1, hard: 1, good: options.reviews - 3, easy: 1 },
      }),
    );
  }
  const connectivity = new FakeConnectivity(options.online ?? true);
  TestBed.configureTestingModule({
    providers: [
      { provide: BookRepository, useValue: books },
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const fixture = TestBed.createComponent(ProgresoPageComponent);
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
  const summary = () =>
    Array.from(element.querySelectorAll('app-summary-card')).map(
      (card) =>
        `${card.querySelector('[data-summary-label]')?.textContent?.trim()}: ${card.querySelector('[data-summary-value]')?.textContent?.trim()}`,
    );
  const collection = () => element.querySelector('app-collection-overview');
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  return {
    element,
    fixture,
    books,
    cards,
    connectivity,
    update,
    summary,
    collection,
    button,
    releaseList,
  };
}

describe('ProgresoPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('al entrar carga el día y la colección; mientras tanto, esqueleto ocupado sin paneles', async () => {
    const { element, cards, books, summary, update, releaseList } = await open({ holdList: true });

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Progreso');
    expect(element.querySelector('app-skeleton[aria-busy="true"]')).not.toBeNull();
    expect(summary()).toEqual([]);

    releaseList();
    await update();

    expect(cards.calls.listReady).toBe(1);
    expect(books.calls.countCollectionByState).toBe(1);
    expect(element.querySelector('app-skeleton')).toBeNull();
  });

  it('con cola y repasos: los dos paneles, las calificaciones y la colección', async () => {
    const { element, summary, collection } = await open({ reviews: 7 });

    expect(summary()).toEqual(['Pendientes hoy: 6', 'Repasadas hoy: 7']);
    expect(element.querySelectorAll('app-rating-distribution li')).toHaveLength(4);
    expect(collection()?.textContent).toContain('10 tarjetas en total');
  });

  it('si la cola del día falla: error de toda la pantalla, aunque la colección cuente; Reintentar repite todo', async () => {
    const { element, cards, books, summary, button, update } = await open({ failList: true });

    expect(element.querySelector('[role="alert"] h2')?.textContent?.trim()).toBe(
      'No pudimos cargar tus estadísticas',
    );
    expect(element.textContent).toContain('No se pudieron cargar tus estadísticas.');
    expect(summary()).toEqual([]);

    delete cards.failWith.listReady;
    button('Reintentar')?.click();
    await update();

    expect(cards.calls.listReady).toBe(2);
    expect(books.calls.countCollectionByState).toBe(2);
    expect(summary()).toEqual(['Pendientes hoy: 6', 'Repasadas hoy: 0']);
  });

  it('sin tarjetas y con el conteo en la mano: el estado vacío', async () => {
    const { element, summary } = await open({
      cards: [],
      collection: { newCards: 0, learning: 0, review: 0 },
    });

    expect(element.textContent).toContain('Aún no hay nada que mostrar');
    expect(element.textContent).toContain(
      'Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar.',
    );
    expect(summary()).toEqual([]);
  });

  it('con tarjetas y sin repasos: paneles en cero y el aviso de calificaciones', async () => {
    const { element, summary } = await open();

    expect(summary()).toEqual(['Pendientes hoy: 6', 'Repasadas hoy: 0']);
    expect(element.textContent).toContain('Aún no has calificado tarjetas hoy.');
  });

  it('si el conteo de la colección falla: los paneles del día siguen y la sección avisa', async () => {
    const { element, summary, collection } = await open({ failCollection: true });

    expect(summary()).toEqual(['Pendientes hoy: 6', 'Repasadas hoy: 0']);
    expect(collection()?.textContent).toContain('No pudimos contar tu colección.');
    expect(element.textContent).not.toContain('No pudimos cargar tus estadísticas');
  });

  it('sin red y con la cola vacía: paneles en "0" y el aviso de colección, nunca el vacío; al volver la red se cuenta', async () => {
    const { element, books, connectivity, summary, collection, update } = await open({
      cards: [],
      online: false,
      collection: { newCards: 0, learning: 1, review: 0 },
    });

    expect(summary()).toEqual(['Pendientes hoy: 0', 'Repasadas hoy: 0']);
    expect(collection()?.textContent).toContain('Necesitas conexión para contar tu colección.');
    expect(element.textContent).not.toContain('Aún no hay nada que mostrar');
    expect(books.calls.countCollectionByState).toBe(0);

    connectivity.setOnline(true);
    await update();

    expect(books.calls.countCollectionByState).toBe(1);
    expect(collection()?.textContent).toContain('1 tarjeta en total');
  });

  it('al salir de Progreso, la red que vuelve ya no cuenta la colección', async () => {
    const { books, connectivity, fixture } = await open({ online: false });

    fixture.destroy();
    connectivity.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(books.calls.countCollectionByState).toBe(0);
  });
});
