import { FakeLogger } from '@testing/fake-logger';

import { readDeviceThenServer } from './read-device-then-server';

/** Una promesa que la prueba resuelve o rechaza cuando quiere (el servidor "tarda"). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Deja correr las promesas ya resueltas. */
const flush = () => new Promise((resolve) => setTimeout(resolve));

const hasContent = (list: readonly string[]) => list.length > 0;

function read(options: {
  fromDevice: () => Promise<string[]>;
  fromServer: () => Promise<string[]>;
  abortSignal?: AbortSignal;
}) {
  const logger = new FakeLogger();
  const stream = readDeviceThenServer({
    ...options,
    hasContent,
    logger,
    errorMessage: 'No se pudieron leer los libros',
    abortSignal: options.abortSignal ?? new AbortController().signal,
  });
  return { stream, logger };
}

describe('readDeviceThenServer', () => {
  it('con algo guardado, lo entrega al instante y después lo del servidor', async () => {
    const server = deferred<string[]>();
    const { stream } = read({ fromDevice: async () => ['a'], fromServer: () => server.promise });

    const items = await stream;
    expect(items()).toEqual({ value: ['a'] });

    server.resolve(['a', 'b']);
    await flush();
    expect(items()).toEqual({ value: ['a', 'b'] });
  });

  it('con lo guardado vacío (o nada), no entrega nada hasta que responde el servidor', async () => {
    const server = deferred<string[]>();
    let delivered = false;
    const { stream } = read({ fromDevice: async () => [], fromServer: () => server.promise });
    void stream.then(() => (delivered = true));

    await flush();
    expect(delivered).toBe(false);

    server.resolve(['a']);
    expect((await stream)()).toEqual({ value: ['a'] });
  });

  it('si el servidor falla con lo guardado a la vista, lo guardado se queda y el fallo se registra', async () => {
    const server = deferred<string[]>();
    const failure = new Error('unavailable');
    const { stream, logger } = read({
      fromDevice: async () => ['a'],
      fromServer: () => server.promise,
    });
    const items = await stream;

    server.reject(failure);
    await flush();

    expect(items()).toEqual({ value: ['a'] });
    expect(logger.entries).toEqual([
      { level: 'error', message: 'No se pudieron leer los libros', cause: failure },
    ]);
  });

  it('si el servidor falla sin nada guardado, entrega el error y lo registra', async () => {
    const failure = new Error('unavailable');
    const { stream, logger } = read({
      fromDevice: async () => [],
      fromServer: async () => Promise.reject(failure),
    });

    expect((await stream)()).toEqual({ error: failure });
    expect(logger.entries).toEqual([
      { level: 'error', message: 'No se pudieron leer los libros', cause: failure },
    ]);
  });

  it('si falla la lectura del dispositivo, lo registra como aviso y sigue con el servidor', async () => {
    const failure = new Error('IndexedDB bloqueado');
    const { stream, logger } = read({
      fromDevice: async () => Promise.reject(failure),
      fromServer: async () => ['a'],
    });

    expect((await stream)()).toEqual({ value: ['a'] });
    expect(logger.entries).toEqual([
      {
        level: 'warn',
        message: 'No se pudieron leer los libros (lo guardado en el dispositivo)',
        cause: failure,
      },
    ]);
  });

  it('si la carga se reinició antes de que llegue el servidor, su respuesta tardía se descarta', async () => {
    const server = deferred<string[]>();
    const restart = new AbortController();
    const { stream } = read({
      fromDevice: async () => ['a'],
      fromServer: () => server.promise,
      abortSignal: restart.signal,
    });
    const items = await stream;

    restart.abort();
    server.resolve(['viejo']);
    await flush();

    expect(items()).toEqual({ value: ['a'] });
  });
});
