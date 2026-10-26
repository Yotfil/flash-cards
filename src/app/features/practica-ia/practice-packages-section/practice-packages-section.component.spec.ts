import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { PracticePackage } from '@domain/models/practice-package';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { SessionService } from '@services/session/session.service';
import { allowDialogFocusInJsdom, openDialog } from '@testing/dialog-test-helpers';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PracticePackagesSectionComponent } from './practice-packages-section.component';

@Component({ template: '' })
class BlankPageComponent {}

// Sábado 25 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-25).
const T0 = new Date('2026-10-25T15:00:00Z');
const items = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => anItem({ id: `${prefix}${index}` }));

async function render(
  options: { packages?: PracticePackage[]; hold?: boolean; fail?: boolean } = {},
) {
  const repository = new FakePracticePackageRepository();
  repository.seed(...(options.packages ?? []));
  if (options.fail) {
    repository.failWith.listByUser = new Error('sin red');
  }
  let release: () => void = () => undefined;
  if (options.hold) {
    const list = repository.listByUser.bind(repository);
    // Solo el servidor espera: lo guardado en el dispositivo responde al instante.
    repository.listByUser = (uid, source) =>
      source === 'device'
        ? list(uid, source)
        : new Promise((resolve) => (release = () => resolve(list(uid, source))));
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: BlankPageComponent }]),
      { provide: PracticePackageRepository, useValue: repository },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const fixture = TestBed.createComponent(PracticePackagesSectionComponent);
  const update = async (stable = true) => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    if (stable) {
      await TestBed.inject(ApplicationRef).whenStable();
    }
    fixture.detectChanges();
  };
  await update(!options.hold);
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const rows = () =>
    Array.from(element.querySelectorAll('[data-package-row]')).map((row) =>
      ['[data-name]', '[data-items]', '[data-today]']
        .map((part) => row.querySelector(part)?.textContent?.trim())
        .join(' · '),
    );
  return { element, repository, update, button, rows, release: () => release() };
}

describe('PracticePackagesSectionComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    allowDialogFocusInJsdom();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('"Práctica con IA" con un esqueleto mientras carga', async () => {
    const { element, update, release } = await render({ hold: true });

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Práctica con IA');
    expect(element.querySelector('app-skeleton[aria-busy="true"]')).not.toBeNull();
    release();
    await update();
    expect(element.querySelector('app-skeleton')).toBeNull();
  });

  it('sin paquetes, la invitación y "Nuevo paquete"', async () => {
    const { element, button } = await render();

    expect(element.textContent).toContain(
      'Guarda aquí las palabras y frases que te cruces en el día y practícalas con tu IA.',
    );
    expect(button('Nuevo paquete')).toBeDefined();
  });

  it('una fila por paquete abierto con "ítems / capacidad" y lo de hoy, más el enlace al historial', async () => {
    const { element, rows } = await render({
      packages: [
        aPackage({ id: 'a', name: 'A' }, items(14, 'a')),
        aPackage(
          { id: 'b', name: 'B', todaySet: { dayId: '2026-10-25', itemIds: ['b0'] } },
          items(3, 'b'),
        ),
        aPackage({ id: 'c', name: 'C', status: 'completed', completedAt: T0 }),
      ],
    });

    expect(rows()).toEqual(['A · 14 / 20 · 14 para hoy', 'B · 3 / 20 · Ya practicaste hoy']);
    expect(element.querySelector('a[href="/paquetes/a"]')).not.toBeNull();
    expect(
      Array.from(element.querySelectorAll('a'))
        .find((link) => link.textContent?.trim() === 'Paquetes completados')
        ?.getAttribute('href'),
    ).toBe('/paquetes/completados');
  });

  it('si la lectura falla: "No pudimos cargar tus paquetes." y Reintentar vuelve a leer', async () => {
    const { element, repository, button, update } = await render({ fail: true });

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar tus paquetes.',
    );
    delete repository.failWith.listByUser;
    button('Reintentar')?.click();
    await update();

    expect(repository.calls.listByUser).toBe(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('"Nuevo paquete" abre el diálogo de crear', async () => {
    const { button, update } = await render();

    button('Nuevo paquete')?.click();
    await update();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nuevo paquete');
  });
});
