import { signal, type ResourceStreamItem, type Signal } from '@angular/core';

import type { Logger } from '@domain/ports/logger.port';

export interface DeviceThenServerRead<T> {
  /** Lo que el dispositivo ya tiene guardado de esta lectura (sin red, al instante). */
  readonly fromDevice: () => Promise<T>;
  /** La lectura del servidor (sin red, cae a lo guardado). */
  readonly fromServer: () => Promise<T>;
  /** Si lo guardado sirve para pintar: una lista vacía cuenta como "nada guardado". */
  readonly hasContent: (value: T) => boolean;
  readonly logger: Logger;
  /** Qué se registra si la lectura falla. */
  readonly errorMessage: string;
  /** Se activa cuando la carga se reinicia: la respuesta tardía del servidor ya no vale. */
  readonly abortSignal: AbortSignal;
}

/**
 * Lectura en dos fases para el cargador en flujo de un `resource`: entrega primero lo guardado en
 * el dispositivo y, cuando responde el servidor, lo cambia por su lectura. Mientras no haya nada
 * guardado, no entrega nada: la pantalla sigue con su esqueleto hasta el servidor.
 *
 * - Si el servidor falla con lo guardado ya a la vista, lo guardado se queda y el fallo se registra
 *   (como sin red); si falla sin nada guardado, se entrega el error (la pantalla pinta su estado
 *   de error con "Reintentar").
 * - Si falla la lectura del dispositivo (p. ej. su almacén está bloqueado), se registra como aviso
 *   y se sigue con el servidor: nunca tumba la carga.
 */
export async function readDeviceThenServer<T>(
  read: DeviceThenServerRead<T>,
): Promise<Signal<ResourceStreamItem<T>>> {
  const saved = await readSaved(read);
  if (saved === undefined) {
    return signal(await readServer(read));
  }

  const items = signal<ResourceStreamItem<T>>({ value: saved });
  read.fromServer().then(
    (value) => {
      if (!read.abortSignal.aborted) {
        items.set({ value });
      }
    },
    (error: unknown) => read.logger.error(read.errorMessage, error),
  );
  return items.asReadonly();
}

/** Lo guardado si sirve para pintar; `undefined` si no hay nada (o no se pudo leer). */
async function readSaved<T>(read: DeviceThenServerRead<T>): Promise<T | undefined> {
  try {
    const saved = await read.fromDevice();
    return read.hasContent(saved) ? saved : undefined;
  } catch (error) {
    read.logger.warn(`${read.errorMessage} (lo guardado en el dispositivo)`, error);
    return undefined;
  }
}

async function readServer<T>(read: DeviceThenServerRead<T>): Promise<ResourceStreamItem<T>> {
  try {
    return { value: await read.fromServer() };
  } catch (error) {
    read.logger.error(read.errorMessage, error);
    // El recurso solo acepta un `Error`; un rechazo con otra cosa se envuelve sin perderla.
    return {
      error: error instanceof Error ? error : new Error(read.errorMessage, { cause: error }),
    };
  }
}
