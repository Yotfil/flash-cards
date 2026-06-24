import { Component, input, output } from '@angular/core';

import type { Rating } from '@domain/models';
import type { RatingOutcome } from '@domain/ports';
import { formatInterval } from '@services/review';
import { IconComponent } from '@shared/icon/icon.component';

interface RatingOption {
  rating: Rating;
  label: string;
  /** Clase de color (token rating-*) de los cerebros activos de esta opción. */
  activeClass: string;
}

/** Los cuatro cerebros 🧠 (spec §7). Cada opción es un objetivo de toque independiente y amplio; el
 *  número de cerebros activos (1..4) es el diferenciador redundante al color (daltonismo). Muestra el
 *  intervalo de retorno por opción (preview de ts-fsrs) y emite el grado 1-4. Esta es la única pieza
 *  donde se usa la escala rojo→verde, reservada a la calificación. */
@Component({
  selector: 'app-rating',
  imports: [IconComponent],
  templateUrl: './rating.component.html',
  styleUrl: './rating.component.scss',
})
export class RatingComponent {
  readonly previews = input.required<Record<Rating, RatingOutcome>>();
  readonly graded = output<Rating>();

  protected readonly slots = [1, 2, 3, 4];
  protected readonly options: RatingOption[] = [
    { rating: 1, label: 'Otra vez', activeClass: 'text-rating-again' },
    { rating: 2, label: 'Difícil', activeClass: 'text-rating-hard' },
    { rating: 3, label: 'Bien', activeClass: 'text-rating-good' },
    { rating: 4, label: 'Fácil', activeClass: 'text-rating-easy' },
  ];

  protected interval(rating: Rating): string {
    return formatInterval(this.previews()[rating].intervalDays);
  }
}
