import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { Card } from '@domain/models/card.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';
import { Logger } from '@domain/ports/logger.port';
import { SchedulingPort } from '@domain/ports/scheduling.port';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { ReviewSessionService } from '@services/review/review-session.service';
import { SessionService } from '@services/session/session.service';
import { aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeGradePersistence } from '@testing/fake-grade-persistence';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSchedulingPort } from '@testing/fake-scheduling-port';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { RepasoPageComponent } from './repaso-page.component';

@Component({ template: '<p>Hoy</p>' })
class TodayStubComponent {}

const T0 = new Date('2026-10-24T15:00:00Z');
const A = aCard({ id: 'A', front: 'to give up', back: 'rendirse' });
const B = aCard({ id: 'B', front: 'to look up', back: 'buscar' });

async function open(options: { cards?: Card[]; online?: boolean } = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'repaso', component: RepasoPageComponent },
        { path: 'hoy', component: TodayStubComponent },
      ]),
      { provide: SchedulingPort, useValue: new FakeSchedulingPort() },
      { provide: GradePersistencePort, useValue: new FakeGradePersistence() },
      { provide: Logger, useValue: new FakeLogger() },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const handoff = TestBed.inject(StudyHandoffService);
  handoff.hand({ cards: options.cards ?? [A, B], source: { kind: 'today' } });
  const session = TestBed.inject(ReviewSessionService);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/repaso');
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    harness.detectChanges();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const press = async (key: string) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    window.dispatchEvent(event);
    await update();
    return event;
  };
  const button = (text: string) =>
    Array.from(page().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const ratingOption = (label: string) =>
    Array.from(page().querySelectorAll<HTMLButtonElement>('app-rating-bar button')).find(
      (candidate) => candidate.querySelector('[data-label]')?.textContent?.trim() === label,
    );
  const url = () => TestBed.inject(Router).url;
  return { harness, handoff, session, update, page, press, button, ratingOption, url };
}

describe('RepasoPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('toma la lista entregada (una sola vez) y arranca la sesión con la primera', async () => {
    const { handoff, session, page } = await open();

    expect(session.status()).toBe('active');
    expect(page().querySelector('[data-front]')?.textContent?.trim()).toBe('to give up');
    expect(page().querySelector('app-main-nav')).toBeNull();
    expect(handoff.take()).toBeNull();
  });

  it('con la lista vacía vuelve a Hoy', async () => {
    const { url, session } = await open({ cards: [] });

    expect(url()).toBe('/hoy');
    expect(session.status()).toBe('idle');
  });

  it('sin revelar, Espacio revela (sin desplazar la página) y "2" no hace nada', async () => {
    const { session, press } = await open();
    const grade = vi.spyOn(session, 'grade');

    expect((await press('2')).defaultPrevented).toBe(false);
    expect(grade).not.toHaveBeenCalled();
    const space = await press(' ');

    expect(space.defaultPrevented).toBe(true);
    expect(session.revealed()).toBe(true);
  });

  it('revelada, "4" califica "Fácil"', async () => {
    const { session, press } = await open();
    await press(' ');
    const grade = vi.spyOn(session, 'grade');

    await press('4');

    expect(grade).toHaveBeenCalledWith(4);
  });

  it('Enter confirma la sugerencia; sin sugerencia no hace nada', async () => {
    const { session, press } = await open();
    vi.setSystemTime(new Date(T0.getTime() + 3000));
    await press(' ');
    expect(session.suggested()).toBe(3);
    const grade = vi.spyOn(session, 'grade');

    await press('Enter');
    expect(grade).toHaveBeenCalledWith(3);
    TestBed.resetTestingModule();

    const quiet = await open();
    const user = aUser();
    vi.spyOn(TestBed.inject(SessionService), 'user').mockReturnValue({
      ...user,
      settings: { ...user.settings, autoGradeByTime: false },
    });
    await quiet.press(' ');
    const quietGrade = vi.spyOn(quiet.session, 'grade');
    await quiet.press('Enter');
    expect(quietGrade).not.toHaveBeenCalled();
  });

  it('se puede elegir otra opción que la sugerida', async () => {
    const { session, press, ratingOption } = await open();
    await press(' ');
    const grade = vi.spyOn(session, 'grade');

    ratingOption('Otra vez')?.click();

    expect(grade).toHaveBeenCalledWith(1);
  });

  it('al terminar se ve el cierre y las teclas ya no hacen nada', async () => {
    const { session, press, page } = await open({ cards: [A] });
    await press(' ');
    await press('4');
    expect(page().querySelector('app-session-summary')).not.toBeNull();
    const grade = vi.spyOn(session, 'grade');

    await press('4');

    expect(grade).not.toHaveBeenCalled();
  });

  it('"Salir" vuelve a Hoy sin preguntar y vacía la sesión', async () => {
    const { session, button, update, url } = await open();

    button('Salir')?.click();
    await update();

    expect(url()).toBe('/hoy');
    expect(session.status()).toBe('idle');
    expect(document.querySelector('.cdk-overlay-container [role="dialog"]')).toBeNull();
  });

  it('"Volver a Hoy" desde el cierre vacía la sesión y va a Hoy', async () => {
    const { session, press, button, update, url } = await open({ cards: [A] });
    await press(' ');
    await press('3');

    button('Volver a Hoy')?.click();
    await update();

    expect(url()).toBe('/hoy');
    expect(session.status()).toBe('idle');
  });

  it('sin red se ve el aviso y calificar sigue avanzando', async () => {
    const { page, press, session } = await open({ online: false });

    expect(page().textContent).toContain('Sin conexión');
    await press(' ');
    await press('3');

    expect(session.remaining()).toBe(1);
    expect(page().querySelector('[data-front]')?.textContent?.trim()).toBe('to look up');
  });

  it('el toque que califica no revela la tarjeta que entra', async () => {
    const { page, press, update, session } = await open();
    await press(' ');
    await press('3');

    page().querySelector<HTMLElement>('[data-card]')?.click();
    await update();

    expect(session.revealed()).toBe(false);
  });
});
