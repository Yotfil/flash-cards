import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { PracticePackage } from '@domain/models/practice-package';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakePracticePackageRepository, aPackage } from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import {
  PackageFormDialogComponent,
  type PackageFormDialogData,
} from './package-form-dialog.component';

async function open(data: PackageFormDialogData = { mode: 'create' }, online = true) {
  const repository = new FakePracticePackageRepository();
  repository.seed(aPackage({ id: 'p1', name: 'Película del viernes' }));
  TestBed.configureTestingModule({
    providers: [
      { provide: PracticePackageRepository, useValue: repository },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(online) },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  TestBed.inject(PracticePackagesService).reload();
  await update();
  const ref = TestBed.inject(DialogService).open<PracticePackage, PackageFormDialogData>(
    PackageFormDialogComponent,
    { label: 'Paquete', size: 'sm', data },
  );
  await update();
  const submit = async () => {
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();
  };
  return { ref, repository, update, submit };
}

describe('PackageFormDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('crea un paquete con el nombre recortado y cierra con él', async () => {
    const { ref, repository, update, submit } = await open();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nuevo paquete');
    typeInto('#package-name', '  Reunión del lunes ');
    await update();
    await submit();

    const created = await ref.closed;
    expect(created?.name).toBe('Reunión del lunes');
    expect(repository.calls.create).toBe(1);
  });

  it('renombrar precarga el nombre y lo cambia', async () => {
    const pkg = aPackage({ id: 'p1', name: 'Película del viernes' });
    const { ref, repository, update, submit } = await open({ mode: 'rename', pkg });

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Renombrar paquete');
    expect(openDialog().querySelector<HTMLInputElement>('#package-name')?.value).toBe(
      'Película del viernes',
    );
    typeInto('#package-name', 'Película del sábado');
    await update();
    await submit();

    await ref.closed;
    expect(repository.packages.get('p1')?.name).toBe('Película del sábado');
  });

  it('el nombre es obligatorio y de 120 caracteres como máximo', async () => {
    const { update } = await open();

    expect(dialogButton('Crear paquete')?.disabled).toBe(true);
    const input = typeInto('#package-name', 'x'.repeat(121));
    input.dispatchEvent(new Event('blur'));
    await update();

    expect(dialogButton('Crear paquete')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Usa como máximo 120 caracteres.');
  });

  it('si no confirma en 6 s, avisa que quedó guardado en el dispositivo y deja cerrar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { ref, repository, update, submit } = await open();
    vi.spyOn(repository, 'create').mockReturnValue(new Promise(() => undefined));
    typeInto('#package-name', 'Reunión');
    await update();
    await submit();
    await update();
    vi.advanceTimersByTime(6000);
    await update();

    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.',
    );
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    expect(dialogButton('Cerrar')?.disabled).toBe(false);
    dialogButton('Cerrar')?.click();
    await expect(ref.closed).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('mientras guarda dice "Guardando…"; si falla avisa dentro y conserva el nombre', async () => {
    const { repository, update, submit } = await open();
    let fail!: (error: Error) => void;
    vi.spyOn(repository, 'create').mockReturnValue(
      new Promise((_resolve, reject) => (fail = reject)),
    );
    typeInto('#package-name', 'Reunión');
    await update();

    await submit();
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    fail(new Error('sin red'));
    await update();

    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar el paquete. Inténtalo de nuevo.',
    );
    expect(openDialog().querySelector<HTMLInputElement>('#package-name')?.value).toBe('Reunión');
  });

  it('sin red no deja guardar y lo explica', async () => {
    const { update } = await open({ mode: 'create' }, false);
    typeInto('#package-name', 'Reunión');
    await update();

    expect(dialogButton('Crear paquete')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Necesitas conexión para guardar cambios.');
  });
});
