import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { provideCore } from '@core/provide-core';
import { provideFirebase } from '@core/provide-firebase';

import { routes } from './app.routes';

// Raíz de composición de la app. Los puertos y adaptadores se enlazan en `provideCore`; el cambio
// entre pantallas usa View Transitions (instantáneo con "reducir movimiento"). Una navegación
// cancelada devuelve el historial a su sitio ('computed'): así el "atrás" que solo cierra un
// diálogo no pierde la entrada de la pantalla.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions(),
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ),
    provideCore(),
    provideFirebase(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
