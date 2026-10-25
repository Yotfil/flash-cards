import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

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

import { CompletedPackagesPageComponent } from './completed-packages-page.component';

@Component({ template: '' })
class BlankPageComponent {}

async function open(packages: PracticePackage[]) {
  const repository = new FakePracticePackageRepository();
  repository.seed(...packages);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'paquetes/completados', component: CompletedPackagesPageComponent },
        { path: '**', component: BlankPageComponent },
      ]),
      { provide: PracticePackageRepository, useValue: repository },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/paquetes/completados');
  await new Promise((resolve) => setTimeout(resolve));
  harness.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  harness.detectChanges();
  return harness.routeNativeElement as HTMLElement;
}

describe('CompletedPackagesPageComponent', () => {
  it('lista los completados, el más reciente primero, con fecha e ítems', async () => {
    const page = await open([
      aPackage(
        {
          id: 'a',
          name: 'Octubre 10',
          status: 'completed',
          completedAt: new Date('2026-10-10T15:00:00Z'),
        },
        [anItem({ id: 'x' })],
      ),
      aPackage(
        {
          id: 'b',
          name: 'Octubre 15',
          status: 'completed',
          completedAt: new Date('2026-10-15T15:00:00Z'),
        },
        [anItem({ id: 'y' }), anItem({ id: 'z' })],
      ),
      aPackage({ id: 'c', name: 'Abierto' }),
    ]);

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Paquetes completados');
    const rows = Array.from(page.querySelectorAll('[data-completed-row]'));
    expect(rows.map((row) => row.querySelector('[data-name]')?.textContent?.trim())).toEqual([
      'Octubre 15',
      'Octubre 10',
    ]);
    expect(rows[0]?.textContent).toContain('2 ítems');
    expect(rows[0]?.textContent).toContain('15/10/2026');
    expect(rows[0]?.getAttribute('href')).toBe('/paquetes/b');
  });

  it('sin historial lo dice', async () => {
    const page = await open([aPackage({ id: 'c' })]);

    expect(page.textContent).toContain('Aún no has completado ningún paquete.');
  });
});
