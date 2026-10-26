import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Book } from '@domain/models/book.model';
import { CardState, type Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { previousStudyDayId } from '@services/study-day/study-day';
import { FakeBookRepository, aBook } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeDailyStatsRepository, aDailyStats } from '@testing/fake-daily-stats-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { HoyPageComponent } from './hoy-page.component';

@Component({ template: '' })
class BlankPageComponent {}

// Sábado 24 de octubre de 2026, 10:00 en Bogotá.
const T0 = new Date('2026-10-24T15:00:00Z');
const DAY_MS = 86_400_000;

const INGLES = aBook({ id: 'ingles', name: 'Inglés', newCardsPerDay: 8, order: 0 });
const MEDICINA = aBook({ id: 'medicina', name: 'Medicina', order: 1 });
const QUIMICA = aBook({ id: 'quimica', name: 'Química', order: 2 });

const dues = (count: number, bookId: string): Card[] =>
  Array.from({ length: count }, (_, index) => {
    const base = aCard({ id: `${bookId}-d${index}`, bookId });
    return {
      ...base,
      scheduling: {
        ...base.scheduling,
        state: CardState.Review,
        due: new Date(T0.getTime() - (index + 1) * 60_000),
      },
    };
  });
const news = (count: number, bookId: string): Card[] =>
  Array.from({ length: count }, (_, index) => {
    const createdAt = new Date(T0.getTime() - (count - index) * DAY_MS);
    const base = aCard({ id: `${bookId}-n${index}`, bookId, createdAt });
    return { ...base, scheduling: { ...base.scheduling, state: CardState.New, due: createdAt } };
  });

async function open(
  options: {
    books?: Book[];
    cards?: Card[];
    studiedDays?: number;
    holdList?: boolean;
    failList?: boolean;
  } = {},
) {
  const books = new FakeBookRepository();
  books.seed(...(options.books ?? [INGLES, MEDICINA, QUIMICA]));
  const cards = new FakeCardRepository();
  cards.seed(...(options.cards ?? []));
  if (options.failList) {
    cards.failWith.listReady = new Error('offline');
  }
  const stats = new FakeDailyStatsRepository();
  let day = '2026-10-24';
  for (let index = 0; index < (options.studiedDays ?? 0); index++) {
    stats.seed(aDailyStats({ id: day, reviewsCompleted: 3 }));
    day = previousStudyDayId(day);
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
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'biblioteca', component: BlankPageComponent },
        { path: 'repaso', component: BlankPageComponent },
      ]),
      { provide: BookRepository, useValue: books },
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: Logger, useValue: new FakeLogger() },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const fixture = TestBed.createComponent(HoyPageComponent);
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
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const labelled = (label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const rows = () =>
    Array.from(element.querySelectorAll('app-book-pending-row')).map((row) =>
      ['[data-name]', '[data-meta]', '[data-total]']
        .map((part) => row.querySelector(part)?.textContent?.trim())
        .join(' · '),
    );
  return { element, cards, update, button, labelled, rows, releaseList };
}

describe('HoyPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('al entrar arma la cola; mientras tanto, esqueleto ocupado y ningún botón', async () => {
    const { element, cards, button, releaseList, update } = await open({
      cards: dues(3, 'ingles'),
      holdList: true,
    });

    expect(element.querySelector('app-skeleton[aria-busy="true"]')).not.toBeNull();
    expect(button('Estudiar ahora')).toBeUndefined();
    releaseList();
    await update();
    expect(cards.calls.listReady).toBe(1);
    expect(button('Estudiar ahora')).toBeDefined();
  });

  it('el subtítulo es la fecha local del usuario', async () => {
    const { element } = await open();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Hoy');
    expect(element.textContent).toContain('Sábado, 24 de octubre');
  });

  it('si la carga falla: error con Reintentar, que vuelve a armar la cola', async () => {
    const { element, cards, button, update } = await open({
      cards: dues(2, 'ingles'),
      failList: true,
    });

    expect(element.textContent).toContain('No pudimos cargar tu cola de hoy');
    expect(element.textContent).not.toContain('Estás al día');

    delete cards.failWith.listReady;
    button('Reintentar')?.click();
    await update();
    expect(cards.calls.listReady).toBe(2);
    expect(element.textContent).toContain('2 tarjetas');
  });

  it('sin libros: bienvenida con "Ir a la Biblioteca", sin bloque ni racha', async () => {
    const { element } = await open({ books: [], studiedDays: 3 });

    expect(element.textContent).toContain('Te damos la bienvenida a Cadence');
    expect(element.textContent).toContain(
      'Crea o importa tu primer libro para empezar a estudiar.',
    );
    expect(element.querySelector('a[href="/biblioteca"]')?.textContent?.trim()).toBe(
      'Ir a la Biblioteca',
    );
    expect(element.querySelector('app-today-hero')).toBeNull();
    expect(element.querySelector('app-streak-badge [role="img"]')).toBeNull();
  });

  it('al día: bloque asentado sin botón, con la racha y el enlace para crear o importar', async () => {
    const { element, button } = await open({ studiedDays: 6 });

    expect(element.textContent).toContain('Estás al día');
    expect(button('Estudiar ahora')).toBeUndefined();
    expect(element.querySelector('app-streak-badge')?.textContent?.trim()).toBe('6 días seguidos');
    expect(element.textContent).toContain('Crear o importar un libro');
  });

  it('con tarjetas: bloque, desglose en orden de la biblioteca, ajuste y enlace', async () => {
    const { element, rows } = await open({
      cards: [...dues(10, 'ingles'), ...news(20, 'ingles'), ...dues(3, 'medicina')],
    });

    expect(element.textContent).toContain('21 tarjetas');
    expect(element.textContent).toContain('Listas para repasar hoy');
    expect(element.textContent).toContain('Por libro');
    expect(rows()).toEqual([
      'Inglés · 10 por repasar, 8 nuevas · 18',
      'Medicina · 3 por repasar · 3',
    ]);
    expect(element.querySelector('details summary')?.textContent?.trim()).toBe(
      'Ajustar nuevas de hoy',
    );
    expect(element.textContent).toContain('Crear o importar un libro');
  });

  it('con una sola tarjeta dice "1 tarjeta"', async () => {
    const { element } = await open({ cards: dues(1, 'medicina') });

    expect(element.textContent).toContain('1 tarjeta');
    expect(element.textContent).not.toContain('1 tarjetas');
  });

  it('subir las nuevas de un libro cambia su fila y el total al instante, sin leer', async () => {
    const { element, cards, labelled, rows, update } = await open({
      cards: [...dues(10, 'ingles'), ...news(20, 'ingles')],
    });

    for (let step = 0; step < 4; step++) {
      labelled('Más nuevas de Inglés')?.click();
      await update();
    }

    expect(rows()).toEqual(['Inglés · 10 por repasar, 12 nuevas · 22']);
    expect(element.textContent).toContain('22 tarjetas');
    expect(cards.calls.listReady).toBe(1);
  });

  it('sin vencidas y con las nuevas a cero: "0 tarjetas" con el botón deshabilitado, no "al día"', async () => {
    const { element, button, labelled, update } = await open({ cards: news(2, 'ingles') });

    labelled('Menos nuevas de Inglés')?.click();
    await update();
    labelled('Menos nuevas de Inglés')?.click();
    await update();

    expect(element.textContent).toContain('0 tarjetas');
    expect(button('Estudiar ahora')?.disabled).toBe(true);
    expect(element.textContent).not.toContain('Estás al día');
  });
});
