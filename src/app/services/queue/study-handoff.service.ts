import { Injectable } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { HandoffTray } from '@services/handoff/handoff-tray';

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

// La bandeja del repaso: Hoy, un libro o un capítulo entregan aquí su sesión y la pantalla de
// repaso la toma una sola vez (ver `HandoffTray`).
@Injectable({ providedIn: 'root' })
export class StudyHandoffService extends HandoffTray<PreparedStudy> {
  /** Entrega la sesión si tiene tarjetas y dice cuántas (lo que espera el botón de lanzamiento). */
  handCards(cards: Card[], source: StudySource): number {
    if (cards.length > 0) {
      this.hand({ cards, source });
    }
    return cards.length;
  }
}
