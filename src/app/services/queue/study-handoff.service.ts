import { Injectable, signal } from '@angular/core';

import type { Card } from '@domain/models/card.model';

/** De dónde sale una sesión: Hoy, un libro o un capítulo. */
export type StudySource =
  | { readonly kind: 'today' }
  | { readonly kind: 'book'; readonly bookId: string }
  | { readonly kind: 'chapter'; readonly bookId: string; readonly chapterId: string };

/** Una sesión lista para empezar: las tarjetas en orden de estudio y su origen. */
export interface PreparedStudy {
  readonly cards: Card[];
  readonly source: StudySource;
}

// Punto de entrega entre quien prepara una sesión (Hoy, un libro, un capítulo) y la pantalla de
// repaso. Se entrega una sola vez: `take` la devuelve y la limpia, así volver a /repaso sin pasar
// por un botón no reabre una sesión vieja. Una señal en un servicio se prueba sin router (el
// `state` de la navegación se tipa débil y también se pierde al recargar).
@Injectable({ providedIn: 'root' })
export class StudyHandoffService {
  private readonly prepared = signal<PreparedStudy | null>(null);

  hand(prepared: PreparedStudy): void {
    this.prepared.set(prepared);
  }

  take(): PreparedStudy | null {
    const prepared = this.prepared();
    this.prepared.set(null);
    return prepared;
  }
}
