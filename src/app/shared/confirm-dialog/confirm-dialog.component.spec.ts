import { InteractivityChecker } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';

import { DialogService, type AppDialogRef } from '../dialog/dialog.service';
import { ConfirmDialogComponent, type ConfirmDialogData } from './confirm-dialog.component';

const settle = () => new Promise((resolve) => setTimeout(resolve));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function overlay(): HTMLElement {
  const container = document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  if (!container) throw new Error('No hay diálogo abierto');
  return container;
}

function button(text: string): HTMLButtonElement | undefined {
  return Array.from(overlay().querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

function open(action: () => Promise<void>, online = true) {
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const data: ConfirmDialogData = {
    title: '¿Borrar este libro?',
    message: 'Vas a borrar «Inglés». No se puede deshacer.',
    detail: 'Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva.',
    confirmLabel: 'Borrar',
    pendingLabel: 'Borrando…',
    errorMessage: 'No se pudo borrar el libro. Inténtalo de nuevo.',
    action,
  };
  const ref: AppDialogRef<boolean> = TestBed.inject(DialogService).open<boolean, ConfirmDialogData>(
    ConfirmDialogComponent,
    { label: data.title, size: 'sm', data },
  );
  TestBed.tick();
  const update = async () => {
    await settle();
    TestBed.tick();
  };
  return { ref, connectivity, update };
}

describe('ConfirmDialogComponent', () => {
  beforeEach(() => {
    vi.spyOn(InteractivityChecker.prototype, 'isVisible').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra título, mensaje y detalle', () => {
    open(async () => undefined);

    expect(overlay().querySelector('h2')?.textContent?.trim()).toBe('¿Borrar este libro?');
    expect(overlay().textContent).toContain('Vas a borrar «Inglés». No se puede deshacer.');
    expect(overlay().textContent).toContain('Se borrarán 3 capítulos y 40 tarjetas.');
  });

  it('mientras la acción corre muestra "Borrando…" y queda ocupado; al terminar cierra con true', async () => {
    const running = deferred();
    const { ref, update } = open(() => running.promise);

    button('Borrar')?.click();
    await update();
    expect(button('Borrando…')?.disabled).toBe(true);
    expect(overlay().getAttribute('aria-busy')).toBe('true');
    expect(ref.isPending).toBe(true);

    running.resolve();
    await expect(ref.closed).resolves.toBe(true);
  });

  it('si la acción falla sigue abierto con el error y permite reintentar', async () => {
    let attempts = 0;
    const { ref, update } = open(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('offline');
      }
    });

    button('Borrar')?.click();
    await update();
    expect(overlay().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo borrar el libro. Inténtalo de nuevo.',
    );
    expect(ref.isPending).toBe(false);

    button('Borrar')?.click();
    await expect(ref.closed).resolves.toBe(true);
    expect(attempts).toBe(2);
  });

  it('Cancelar cierra con false sin ejecutar la acción', async () => {
    const action = vi.fn(async () => undefined);
    const { ref } = open(action);

    button('Cancelar')?.click();

    await expect(ref.closed).resolves.toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it('sin red no deja confirmar, lo explica, deja cancelar y se habilita al volver la red', async () => {
    const { connectivity, update } = open(async () => undefined, false);

    expect(button('Borrar')?.disabled).toBe(true);
    expect(overlay().textContent).toContain('Necesitas conexión para guardar cambios.');
    expect(button('Cancelar')?.disabled).toBe(false);

    connectivity.setOnline(true);
    await update();
    expect(button('Borrar')?.disabled).toBe(false);
  });
});
