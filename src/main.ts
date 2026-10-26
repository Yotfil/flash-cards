import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // Antes de que exista el ErrorHandler global no hay más salida que la consola.
  console.error('[Cadence] No se pudo arrancar la aplicación.', error);
});
