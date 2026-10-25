import { DOCUMENT, DestroyRef, Injectable, inject, signal } from '@angular/core';

import { ConnectivityPort } from '@domain/ports/connectivity.port';

// Adaptador de conectividad sobre el navegador: el estado inicial sale de `navigator.onLine` y
// los cambios, de los eventos `online`/`offline` de la ventana. Deja de escuchar al destruirse.
@Injectable()
export class NavigatorConnectivityAdapter extends ConnectivityPort {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly state = signal(this.window?.navigator.onLine ?? true);
  readonly online = this.state.asReadonly();

  constructor() {
    super();
    const goOnline = () => this.state.set(true);
    const goOffline = () => this.state.set(false);
    this.window?.addEventListener('online', goOnline);
    this.window?.addEventListener('offline', goOffline);
    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('online', goOnline);
      this.window?.removeEventListener('offline', goOffline);
    });
  }
}
