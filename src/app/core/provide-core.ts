import {
  EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import { AuthPort } from '@domain/ports/auth.port';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ThemePort } from '@domain/ports/theme.port';
import { UserRepository } from '@domain/ports/user.repository';
import { FirebaseAuthAdapter } from '@infrastructure/auth/firebase-auth.adapter';
import { DocumentThemeAdapter } from '@infrastructure/browser/document-theme.adapter';
import { NavigatorConnectivityAdapter } from '@infrastructure/browser/navigator-connectivity.adapter';
import { FIREBASE_AUTH, FIRESTORE } from '@infrastructure/firebase/firebase.tokens';
import { FirestoreAllowlistRepository } from '@infrastructure/firestore/allowlist.repository.firestore';
import { FirestoreUserRepository } from '@infrastructure/firestore/user.repository.firestore';
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
    // Adaptadores de Firebase: reciben su instancia por constructor (así se prueban contra el
    // emulador sin Angular) y Firebase arranca la primera vez que alguien los pide.
    { provide: AuthPort, useFactory: () => new FirebaseAuthAdapter(inject(FIREBASE_AUTH)) },
    { provide: UserRepository, useFactory: () => new FirestoreUserRepository(inject(FIRESTORE)) },
    {
      provide: AllowlistRepository,
      useFactory: () => new FirestoreAllowlistRepository(inject(FIRESTORE)),
    },
    // El tema recordado se aplica antes del primer render, para no arrancar con el equivocado.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ]);
}
