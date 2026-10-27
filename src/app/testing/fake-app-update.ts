import { signal } from '@angular/core';

import { AppUpdatePort } from '@domain/ports/app-update.port';

// Fake del puerto de versión nueva: la prueba decide si hay versión con `setReady` y cuenta las
// recargas pedidas (en jsdom no se puede recargar de verdad).
export class FakeAppUpdate extends AppUpdatePort {
  private readonly ready = signal(false);
  readonly updateReady = this.ready.asReadonly();
  reloads = 0;

  setReady(ready: boolean): void {
    this.ready.set(ready);
  }

  reload(): void {
    this.reloads++;
  }
}
