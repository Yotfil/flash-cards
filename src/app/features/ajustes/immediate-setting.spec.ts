import { signal } from '@angular/core';

import { FakeLogger } from '@testing/fake-logger';

import { createImmediateSetting } from './immediate-setting';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function setup() {
  const persisted = signal(4);
  const logger = new FakeLogger();
  const pending = deferred();
  const save = vi.fn((value: number) =>
    pending.promise.then(() => {
      persisted.set(value);
    }),
  );
  const setting = createImmediateSetting(persisted, save, logger);
  return { persisted, logger, pending, save, setting };
}

describe('createImmediateSetting', () => {
  it('muestra el valor nuevo al instante y queda guardando', () => {
    const { setting, save } = setup();

    void setting.change(2);

    expect(setting.value()).toBe(2);
    expect(setting.saving()).toBe(true);
    expect(save).toHaveBeenCalledWith(2);
  });

  it('al terminar bien deja el valor nuevo, sin guardar ni error', async () => {
    const { setting, pending } = setup();

    const change = setting.change(2);
    pending.resolve();
    await change;

    expect(setting.value()).toBe(2);
    expect(setting.saving()).toBe(false);
    expect(setting.error()).toBeNull();
  });

  it('si falla vuelve al valor guardado, registra el detalle y explica el error', async () => {
    const { setting, pending, logger } = setup();
    const cause = new Error('offline');

    const change = setting.change(2);
    pending.reject(cause);
    await change;

    expect(setting.value()).toBe(4);
    expect(setting.saving()).toBe(false);
    expect(setting.error()).toBe('No se pudo guardar. Inténtalo de nuevo.');
    expect(logger.entries).toContainEqual(expect.objectContaining({ level: 'error', cause }));
  });

  it('un cambio mientras guarda se ignora', () => {
    const { setting, save } = setup();

    void setting.change(2);
    void setting.change(7);

    expect(save).toHaveBeenCalledTimes(1);
    expect(setting.value()).toBe(2);
  });

  it('un nuevo intento limpia el error anterior', async () => {
    const persisted = signal(4);
    let attempts = 0;
    const setting = createImmediateSetting(
      persisted,
      async (value: number) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('offline');
        }
        persisted.set(value);
      },
      new FakeLogger(),
    );

    await setting.change(2);
    expect(setting.error()).not.toBeNull();
    await setting.change(3);

    expect(setting.error()).toBeNull();
    expect(setting.value()).toBe(3);
  });
});
