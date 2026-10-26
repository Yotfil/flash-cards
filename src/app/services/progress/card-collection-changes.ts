import { Injectable, signal } from '@angular/core';

// Aviso de que la colección de tarjetas cambió desde este dispositivo (una calificación, una tarjeta
// creada, importada o borrada, un capítulo o un libro borrado). Progreso guarda en memoria el conteo
// de la colección y solo lo repite cuando esta versión cambió. Vive aparte para que quien escribe
// tarjetas no dependa de Progreso ni de su cola.
@Injectable({ providedIn: 'root' })
export class CardCollectionChanges {
  private readonly versionSignal = signal(0);

  /** Sube con cada cambio; quien contó guarda la versión con la que contó. */
  readonly version = this.versionSignal.asReadonly();

  notify(): void {
    this.versionSignal.update((version) => version + 1);
  }
}
