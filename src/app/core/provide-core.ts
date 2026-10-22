import { EnvironmentProviders, ErrorHandler, makeEnvironmentProviders } from '@angular/core';

import { Logger } from '@domain/ports/logger.port';
import { ConsoleLoggerAdapter } from '@infrastructure/logging/console-logger.adapter';

import { GlobalErrorHandler } from './global-error-handler';

// Raíz de composición: enlaza cada puerto con su adaptador. Es el único sitio donde la app
// decide qué implementación concreta usa (ADR 0001).
export function provideCore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Logger, useClass: ConsoleLoggerAdapter },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ]);
}
