import { Component, computed, input } from '@angular/core';

import type { Rating } from '@domain/models/rating';
import type { RatingRow } from '@services/progress/rating-rows';

import { REPASO_COPY } from '../../repaso/repaso.copy';
import { barWidth } from '../bar-width';
import { PROGRESO_COPY } from '../progreso.copy';

/** La escala de calificación, reservada a calificar: aquí se permite porque ES la calificación. */
const BAR_CLASS: Readonly<Record<Rating, string>> = {
  1: 'bar-rating-again',
  2: 'bar-rating-hard',
  3: 'bar-rating-good',
  4: 'bar-rating-easy',
};

// "Calificaciones de hoy": cuatro filas fijas con la etiqueta de los cerebros, el número (que
// diferencia sin depender del color) y una barra decorativa con su parte de las repasadas.
@Component({
  selector: 'app-rating-distribution',
  templateUrl: './rating-distribution.component.html',
  styleUrl: './rating-distribution.component.scss',
})
export class RatingDistributionComponent {
  readonly rows = input.required<readonly RatingRow[]>();
  readonly total = input.required<number>();

  protected readonly copy = PROGRESO_COPY;
  protected readonly bars = computed(() =>
    this.rows().map((row) => ({
      rating: row.rating,
      label: REPASO_COPY.ratingLabels[row.rating],
      count: row.count,
      width: barWidth(row.share),
      barClass: BAR_CLASS[row.rating],
    })),
  );
}
