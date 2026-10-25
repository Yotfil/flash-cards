import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { provideCore } from '@core/provide-core';
import { provideFirebase } from '@core/provide-firebase';

// Raíz de composición de la app. Las rutas llegan con `navegacion-y-shell`; los repositorios de
// cada capacidad se enlazan en `provideCore`.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter([]),
    provideCore(),
    provideFirebase(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
