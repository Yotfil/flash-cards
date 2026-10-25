import { signal } from '@angular/core';

import { ConnectivityPort } from '@domain/ports/connectivity.port';

// Fake del puerto de conectividad: la prueba decide si hay red con `setOnline`.
export class FakeConnectivity extends ConnectivityPort {
  private readonly state = signal(true);
  readonly online = this.state.asReadonly();

  constructor(initiallyOnline = true) {
    super();
    this.state.set(initiallyOnline);
  }

  setOnline(online: boolean): void {
    this.state.set(online);
  }
}
