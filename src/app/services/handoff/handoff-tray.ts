import { signal } from '@angular/core';

// Punto de entrega entre quien prepara algo (una sesión de repaso, una práctica) y la pantalla
// completa que lo usa. Se entrega una sola vez: `take` lo devuelve y limpia la bandeja, así volver
// a la ruta sin pasar por un botón no reabre lo anterior. Cada uso es su propio servicio con su
// propio tipo, para que la guardia de una pantalla nunca acepte lo preparado para otra.
export abstract class HandoffTray<T> {
  private readonly tray = signal<T | null>(null);
  /** Lo entregado, sin consumirlo (las guardias solo miran). */
  readonly prepared = this.tray.asReadonly();

  hand(value: T): void {
    this.tray.set(value);
  }

  take(): T | null {
    const value = this.tray();
    this.tray.set(null);
    return value;
  }
}
