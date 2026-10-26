import { computed, signal, type Signal } from '@angular/core';

import type { Logger } from '@domain/ports/logger.port';

import { AJUSTES_COPY } from './ajustes.copy';

export interface ImmediateSetting<T> {
  /** Lo que el control muestra: el valor elegido mientras se guarda, si no, el persistido. */
  readonly value: Signal<T>;
  readonly saving: Signal<boolean>;
  /** Texto del último fallo, o `null`. Se pinta como alerta junto al control. */
  readonly error: Signal<string | null>;
  change(value: T): Promise<void>;
}

/**
 * Guardado inmediato de un control de elección (casilla, selector, tema): el valor nuevo se ve al
 * tocar, el control queda "guardando" (y la pantalla lo deshabilita), y si la escritura falla el
 * control vuelve al valor persistido, se registra el detalle y se explica el error. No sabe nada de
 * la red: sin conexión la pantalla deshabilita el control antes.
 */
export function createImmediateSetting<T>(
  persisted: () => T,
  save: (value: T) => Promise<void>,
  logger: Logger,
): ImmediateSetting<T> {
  const pending = signal<{ value: T } | null>(null);
  const error = signal<string | null>(null);

  async function change(value: T): Promise<void> {
    if (pending() !== null) {
      return;
    }
    pending.set({ value });
    error.set(null);
    try {
      await save(value);
    } catch (cause) {
      logger.error('No se pudo guardar un ajuste', cause);
      error.set(AJUSTES_COPY.saveError);
    } finally {
      pending.set(null);
    }
  }

  return {
    value: computed(() => {
      const inFlight = pending();
      return inFlight === null ? persisted() : inFlight.value;
    }),
    saving: computed(() => pending() !== null),
    error: error.asReadonly(),
    change,
  };
}
