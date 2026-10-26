import { Component, computed, input, output } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { clozeQuestion, clozeSegments } from '@services/cards/cloze/parse-cloze';

import { REPASO_COPY } from '../repaso.copy';

/**
 * Tras aparecer una tarjeta, un toque sobre ella no la revela durante su entrada (la duración de
 * `--duration-base`): evita revelar la siguiente con el mismo toque que calificó la anterior.
 */
const ENTRY_GUARD_MS = 320;

// La tarjeta de estudio: sólida, de alto contraste, nunca acrílico. Primero solo la pregunta y
// "Mostrar respuesta"; al revelar se voltea y muestra el reverso (y el ejemplo, si lo hay). Una
// cloze pregunta con sus huecos como "[…]" y al revelar los muestra en acento, sin reverso.
@Component({
  selector: 'app-flip-card',
  templateUrl: './flip-card.component.html',
  styleUrl: './flip-card.component.scss',
})
export class FlipCardComponent {
  readonly card = input.required<Card>();
  readonly revealed = input(false);
  readonly revealRequested = output<void>();

  protected readonly copy = REPASO_COPY;
  private readonly shownAt = Date.now();
  protected readonly isCloze = computed(() => this.card().cardType === 'cloze');
  protected readonly question = computed(() =>
    this.isCloze() ? clozeQuestion(this.card().front) : this.card().front,
  );
  protected readonly segments = computed(() => clozeSegments(this.card().front));

  protected tapCard(): void {
    if (!this.revealed() && Date.now() - this.shownAt >= ENTRY_GUARD_MS) {
      this.revealRequested.emit();
    }
  }
}
