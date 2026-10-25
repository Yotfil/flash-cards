import { Component, computed, input, output } from '@angular/core';

import { REPASO_COPY, remainingLabel } from '../repaso.copy';

// La barra discreta de la sesión: progreso, cuántas quedan y "Salir". Acrílico tenue y estático.
@Component({
  selector: 'app-review-top-bar',
  templateUrl: './review-top-bar.component.html',
  styleUrl: './review-top-bar.component.scss',
})
export class ReviewTopBarComponent {
  /** Porcentaje de tarjetas que ya salieron de la sesión (0-100). */
  readonly progress = input.required<number>();
  readonly remaining = input.required<number>();
  readonly exitRequested = output<void>();

  protected readonly copy = REPASO_COPY;
  protected readonly remainingText = computed(() => remainingLabel(this.remaining()));
}
