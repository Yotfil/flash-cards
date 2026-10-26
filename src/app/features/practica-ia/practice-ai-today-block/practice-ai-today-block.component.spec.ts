import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { PracticePackage } from '@domain/models/practice-package';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { SessionService } from '@services/session/session.service';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PracticeAiTodayBlockComponent } from './practice-ai-today-block.component';

@Component({ template: '' })
class BlankPageComponent {}

// Sábado 25 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-25).
const T0 = new Date('2026-10-25T15:00:00Z');
const fresh = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => anItem({ id: `${prefix}${index}` }));
const rested = anItem({ id: 'r', lastGrade: 4, lastPracticedDayId: '2026-10-24' });

async function render(options: { packages?: PracticePackage[]; fail?: boolean } = {}) {
  const repository = new FakePracticePackageRepository();
  repository.seed(...(options.packages ?? []));
  if (options.fail) {
    repository.failWith.listByUser = new Error('sin red');
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: BlankPageComponent }]),
      { provide: PracticePackageRepository, useValue: repository },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const fixture = TestBed.createComponent(PracticeAiTodayBlockComponent);
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };
  await update();
  const element = fixture.nativeElement as HTMLElement;
  const rows = () =>
    Array.from(element.querySelectorAll('[data-package-today]')).map((row) => ({
      text: row.querySelector('[data-text]')?.textContent?.trim(),
      button: row.querySelector('app-study-launch-button button')?.textContent?.trim(),
    }));
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  return { element, repository, update, rows, button };
}

describe('PracticeAiTodayBlockComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('sin ningún paquete no se muestra', async () => {
    const { element } = await render();

    expect(element.querySelector('section')).toBeNull();
  });

  it('una fila por paquete con pendientes, con su número y su botón', async () => {
    const { element, rows } = await render({
      packages: [
        aPackage({ id: 'a', name: 'Película del viernes' }, fresh(11, 'a')),
        aPackage({ id: 'b', name: 'Reunión' }, fresh(3, 'b')),
        aPackage({ id: 'c', name: 'Al día' }, [rested]),
      ],
    });

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Práctica con IA');
    expect(rows()).toEqual([
      { text: 'Película del viernes · 11 para hoy', button: 'Practicar hoy' },
      { text: 'Reunión · 3 para hoy', button: 'Practicar hoy' },
    ]);
  });

  it('ya practicado hoy: "Ya practicaste hoy · Volver a practicar", sin aviso', async () => {
    const { rows } = await render({
      packages: [
        aPackage(
          { id: 'a', name: 'A', todaySet: { dayId: '2026-10-25', itemIds: ['a0'] } },
          fresh(2, 'a'),
        ),
      ],
    });

    expect(rows()).toEqual([{ text: 'A · Ya practicaste hoy', button: 'Volver a practicar' }]);
  });

  it('nada pendiente: lo dice con "Ver paquetes"', async () => {
    const { element } = await render({ packages: [aPackage({ id: 'c' }, [rested])] });

    expect(element.textContent).toContain('Nada pendiente en tus paquetes.');
    expect(
      Array.from(element.querySelectorAll('a'))
        .find((link) => link.textContent?.trim() === 'Ver paquetes')
        ?.getAttribute('href'),
    ).toBe('/biblioteca');
  });

  it('si la lectura falla: su error con Reintentar', async () => {
    const { element, repository, button, update } = await render({ fail: true });

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar tus paquetes.',
    );
    delete repository.failWith.listByUser;
    button('Reintentar')?.click();
    await update();
    expect(repository.calls.listByUser).toBe(2);
  });
});
