import { Injectable, signal } from '@angular/core';

// El aviso de un fallo que ninguna pantalla previó (lo activa el manejador global de errores al
// registrarlo). Es una sola señal: varios fallos seguidos siguen siendo un aviso, no una pila.
@Injectable({ providedIn: 'root' })
export class UnexpectedErrorNotice {
  private readonly visibleSignal = signal(false);
  readonly visible = this.visibleSignal.asReadonly();

  report(): void {
    this.visibleSignal.set(true);
  }

  dismiss(): void {
    this.visibleSignal.set(false);
  }
}
