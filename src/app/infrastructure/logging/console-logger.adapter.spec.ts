import { ConsoleLoggerAdapter } from './console-logger.adapter';

describe('ConsoleLoggerAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('error escribe en console.error con el prefijo [Cadence] y la causa', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cause = new Error('boom');

    new ConsoleLoggerAdapter().error('No se pudo guardar la calificación', cause);

    expect(consoleError).toHaveBeenCalledWith(
      '[Cadence] No se pudo guardar la calificación',
      cause,
    );
  });

  it('error sin causa no añade un segundo argumento', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    new ConsoleLoggerAdapter().error('Falló sin más detalle');

    expect(consoleError).toHaveBeenCalledWith('[Cadence] Falló sin más detalle');
  });

  it('warn escribe en console.warn e info en console.info, con el mismo prefijo', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = new ConsoleLoggerAdapter();

    logger.warn('Sin conexión, se guardará al volver');
    logger.info('Sesión iniciada');

    expect(consoleWarn).toHaveBeenCalledWith('[Cadence] Sin conexión, se guardará al volver');
    expect(consoleInfo).toHaveBeenCalledWith('[Cadence] Sesión iniciada');
  });
});
