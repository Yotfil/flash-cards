import { TestBed } from '@angular/core/testing';

import { Logger } from '@domain/ports/logger.port';
import { UnexpectedErrorNotice } from '@services/notices/unexpected-error-notice.service';
import { FakeLogger } from '@testing/fake-logger';

import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let logger: FakeLogger;
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    logger = new FakeLogger();
    TestBed.configureTestingModule({
      providers: [{ provide: Logger, useValue: logger }, GlobalErrorHandler],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('registra el error no controlado en el Logger y no lo relanza', () => {
    const error = new Error('boom');

    expect(() => handler.handleError(error)).not.toThrow();

    expect(logger.entries).toEqual([
      { level: 'error', message: 'Error no controlado', cause: error },
    ]);
  });

  it('además de registrarlo, muestra el aviso discreto de fallo no previsto', () => {
    const notice = TestBed.inject(UnexpectedErrorNotice);

    handler.handleError(new Error('boom'));

    expect(notice.visible()).toBe(true);
  });

  it('acepta valores que no son Error y los conserva como causa', () => {
    handler.handleError('algo salió mal');

    expect(logger.entries).toEqual([
      { level: 'error', message: 'Error no controlado', cause: 'algo salió mal' },
    ]);
  });
});
