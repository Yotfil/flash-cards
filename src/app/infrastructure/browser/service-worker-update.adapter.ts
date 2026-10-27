import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

import { AppUpdatePort } from '@domain/ports/app-update.port';

// Adaptador de versión nueva sobre el trabajador de servicio de Angular: la versión está lista
// cuando termina de descargarse (`VERSION_READY`). Sin trabajador de servicio activo (desarrollo,
// navegadores sin soporte) nunca lo está. Recargar el documento estrena la versión descargada.
@Injectable()
export class ServiceWorkerUpdateAdapter extends AppUpdatePort {
  private readonly document = inject(DOCUMENT);
  private readonly ready = signal(false);
  readonly updateReady = this.ready.asReadonly();

  constructor() {
    super();
    const swUpdate = inject(SwUpdate, { optional: true });
    if (swUpdate?.isEnabled) {
      swUpdate.versionUpdates
        .pipe(
          filter((event) => event.type === 'VERSION_READY'),
          takeUntilDestroyed(),
        )
        .subscribe(() => this.ready.set(true));
    }
  }

  reload(): void {
    this.document.location.reload();
  }
}
