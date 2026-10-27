import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { CardRepository } from '@domain/ports/card.repository';
import type { UserSettings } from '@domain/models/user.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';
import { Logger } from '@domain/ports/logger.port';
import {
  PracticePackageGoneError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';
import { PracticeAiHandoffService } from '@services/practice-ai/practice-ai-handoff.service';
import { PracticeAiSessionService } from '@services/practice-ai/practice-ai-session.service';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { SessionService } from '@services/session/session.service';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeDailyStatsRepository } from '@testing/fake-daily-stats-repository';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeGradePersistence } from '@testing/fake-grade-persistence';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PracticeAiPageComponent } from './practice-ai-page.component';

@Component({ template: '' })
class BlankPageComponent {}

// Sábado 25 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-25).
const T0 = new Date('2026-10-25T15:00:00Z');
const ITEMS = ['a', 'b', 'c'].map((id) => anItem({ id, front: `front ${id}`, back: `back ${id}` }));

async function open(
  options: { online?: boolean; handOff?: boolean; settings?: Partial<UserSettings> } = {},
) {
  const user = aUser();
  const repository = new FakePracticePackageRepository();
  repository.seed(aPackage({ id: 'p1' }, ITEMS));
  const cards = new FakeCardRepository();
  const stats = new FakeDailyStatsRepository();
  const grades = new FakeGradePersistence();
  const delivery = new FakeFileDelivery();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'practica-ia', component: PracticeAiPageComponent },
        { path: '**', component: BlankPageComponent },
      ]),
      { provide: PracticePackageRepository, useValue: repository },
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: GradePersistencePort, useValue: grades },
      { provide: FileDeliveryPort, useValue: delivery },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({
          kind: 'active',
          user: { ...user, settings: { ...user.settings, ...options.settings } },
        }),
      },
    ],
  });
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  const packages = TestBed.inject(PracticePackagesService);
  packages.reload();
  await settle();
  if (options.handOff ?? true) {
    await packages.prepareTodayPractice('p1');
  }
  const session = TestBed.inject(PracticeAiSessionService);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/practica-ia');
  const update = async () => {
    await settle();
    harness.detectChanges();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const press = async (key: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true }));
    await update();
  };
  const button = (text: string) =>
    Array.from(page()?.querySelectorAll('button') ?? []).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const brain = (label: string) =>
    Array.from(page().querySelectorAll<HTMLButtonElement>('app-rating-bar button')).find(
      (candidate) => candidate.querySelector('[data-label]')?.textContent?.trim() === label,
    );
  return {
    harness,
    repository,
    cards,
    stats,
    grades,
    delivery,
    session,
    update,
    page,
    press,
    button,
    brain,
    url: () => TestBed.inject(Router).url,
  };
}

describe('PracticeAiPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('toma la práctica entregada: barra "1 / 3", la tarjeta y "Mostrar respuesta", sin navegación', async () => {
    const { page, session } = await open();

    expect(TestBed.inject(PracticeAiHandoffService).prepared()).toBeNull();
    expect(session.status()).toBe('active');
    expect(page().querySelector('app-session-top-bar')?.textContent).toContain('1 / 3');
    expect(page().querySelector('app-flip-card')).not.toBeNull();
    expect(page().querySelector('app-rating-bar')).toBeNull();
    expect(page().querySelector('app-main-nav')).toBeNull();
  });

  it('sin práctica entregada vuelve a la Biblioteca', async () => {
    const { url } = await open({ handOff: false });

    expect(url()).toBe('/biblioteca');
  });

  it('revelar muestra los cuatro cerebros sin intervalos; calificar guarda y avanza', async () => {
    const { press, page, brain, repository, update } = await open();

    await press(' ');
    const intervals = page().querySelectorAll('app-rating-bar [data-interval]');
    expect(page().querySelectorAll('app-rating-bar button')).toHaveLength(4);
    expect(intervals).toHaveLength(0);
    brain('Difícil')?.click();
    await update();

    expect(repository.grades.at(-1)).toEqual(
      expect.objectContaining({ grade: 2, dayId: '2026-10-25' }),
    );
    expect(page().querySelector('app-session-top-bar')?.textContent).toContain('2 / 3');
    await press(' ');
    await press('4');
    expect(repository.grades).toHaveLength(2);
  });

  it('"Salir" vuelve al paquete y vacía la práctica', async () => {
    const { button, update, url, session } = await open();

    button('Salir')?.click();
    await update();

    expect(url()).toBe('/paquetes/p1');
    expect(session.status()).toBe('idle');
  });

  it('al terminar: "Práctica terminada", lo practicado, los difíciles, copiar el prompt y volver al paquete', async () => {
    const { press, page, button, update, delivery, url } = await open();
    for (const key of ['1', '2', '3']) {
      await press(' ');
      await press(key);
    }

    const summary = page().querySelector('app-session-summary');
    expect(summary?.querySelector('h1')?.textContent?.trim()).toBe('Práctica terminada');
    expect(document.activeElement).toBe(summary?.querySelector('h1'));
    expect(summary?.textContent).toContain('Practicaste 3 ítems');
    expect(summary?.textContent).toContain('2 para reforzar con la IA');
    expect(summary?.textContent).not.toContain('Volver a Hoy');
    button('Copiar prompt')?.click();
    await update();
    expect(delivery.copied[0]).toContain('front a | back a');

    button('Volver al paquete')?.click();
    await update();
    expect(url()).toBe('/paquetes/p1');
  });

  it('si el paquete ya no existe: «Este paquete ya no existe» y el enlace a la Biblioteca, sin cerebros', async () => {
    const { press, page, update, repository, url } = await open();
    await press(' ');
    await press('3');

    // El servidor rechaza la nota: el paquete se borró en otro dispositivo.
    repository.rejectNext(new PracticePackageGoneError('p1'));
    await update();

    expect(page().querySelector('h2')?.textContent?.trim()).toBe('Este paquete ya no existe');
    expect(page().querySelector('app-flip-card')).toBeNull();
    expect(page().querySelector('app-rating-bar')).toBeNull();
    expect(page().querySelector('app-session-top-bar')).toBeNull();
    expect(page().querySelector('app-session-summary')).toBeNull();
    await press(' ');
    expect(page().querySelector('app-flip-card')).toBeNull();
    page().querySelector<HTMLAnchorElement>('a[href="/biblioteca"]')?.click();
    await update();
    expect(url()).toBe('/biblioteca');
  });

  it('si la práctica cruza el inicio del día, el prompt del cierre lista los difíciles que anuncia', async () => {
    // Ada empieza el día a medianoche y practica a las 23:58 del domingo 25.
    vi.setSystemTime(new Date('2026-10-26T04:58:00Z'));
    const { press, page, button, update, delivery } = await open({ settings: { dayStartHour: 0 } });
    for (let index = 0; index < 2; index++) {
      await press(' ');
      await press('1');
    }
    // La última nota llega a las 00:02 del lunes 26: ya es otro día de estudio.
    vi.setSystemTime(new Date('2026-10-26T05:02:00Z'));
    await press(' ');
    await press('1');

    expect(page().querySelector('app-session-summary')?.textContent).toContain(
      '3 para reforzar con la IA',
    );
    button('Copiar prompt')?.click();
    await update();
    const hardBlock = delivery.copied[0]?.split('<hard_terms>')[1]?.split('</hard_terms>')[0] ?? '';
    expect(hardBlock.split('\n').filter((line) => line.trim() !== '')).toHaveLength(3);
  });

  it('practicar no toca tarjetas, repaso ni el día; funciona sin red', async () => {
    const { press, cards, stats, grades, repository } = await open({ online: false });
    for (const key of ['3', '3', '3']) {
      await press(' ');
      await press(key);
    }

    expect(repository.grades).toHaveLength(3);
    expect(Object.values(cards.calls).every((count) => count === 0)).toBe(true);
    expect(stats.calls.getByDay).toEqual([]);
    expect(grades.records).toEqual([]);
  });
});
