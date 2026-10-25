import {
  EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ThemePort } from '@domain/ports/theme.port';
import { DocumentThemeAdapter } from '@infrastructure/browser/document-theme.adapter';
import { NavigatorConnectivityAdapter } from '@infrastructure/browser/navigator-connectivity.adapter';
import { ConsoleLoggerAdapter } from '@infrastructure/logging/console-logger.adapter';
import { ThemeService } from '@services/theme/theme.service';

import { GlobalErrorHandler } from './global-error-handler';

// Raíz de composición: enlaza cada puerto con su adaptador. Es el único sitio donde la app
// decide qué implementación concreta usa (ADR 0001).
export function provideCore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Logger, useClass: ConsoleLoggerAdapter },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: ThemePort, useClass: DocumentThemeAdapter },
    { provide: ConnectivityPort, useClass: NavigatorConnectivityAdapter },
    // El tema recordado se aplica antes del primer render, para no arrancar con el equivocado.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ]);
}
