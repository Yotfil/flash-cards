import { Component, computed, input, output } from '@angular/core';

import { RATINGS, type Rating } from '@domain/models/rating';
import type { SchedulingPreview } from '@domain/ports/scheduling.port';
import { formatInterval } from '@services/scheduling/format-interval';
import { IconComponent } from '@shared/icon/icon.component';

import { REPASO_COPY, ratingAriaLabel } from '../repaso.copy';

/** El color de cada grado: la escala rojo→verde está reservada a este componente. */
const RATING_COLOR_CLASS = {
  1: 'text-rating-again',
  2: 'text-rating-hard',
  3: 'text-rating-good',
  4: 'text-rating-easy',
} as const satisfies Record<Rating, string>;

const BRAIN_SLOTS = [1, 2, 3, 4] as const;

// Los cuatro cerebros en fila: la opción N enciende N cerebros en su color (el conteo diferencia
// sin depender del color), dice cuándo volvería la tarjeta (si hay previsualización) y emite su
// grado. Solo emite 1-4: cambiar su aspecto no toca la programación ni el modelo.
@Component({
  selector: 'app-rating-bar',
  imports: [IconComponent],
  templateUrl: './rating-bar.component.html',
  styleUrl: './rating-bar.component.scss',
})
export class RatingBarComponent {
  /** Sin previsualizaciones (una práctica sin programación) no se dice cuándo volvería. */
  readonly previews = input<Record<Rating, SchedulingPreview> | null>(null);
  readonly suggested = input<Rating | null>(null);
  /** El instante con que se calcularon las previsualizaciones. */
  readonly now = input<Date>(new Date(0));
  readonly showKeyHints = input(true);
  readonly graded = output<Rating>();

  protected readonly copy = REPASO_COPY;
  protected readonly brainSlots = BRAIN_SLOTS;
  protected readonly options = computed(() =>
    RATINGS.map((rating) => {
      const label = this.copy.ratingLabels[rating];
      const preview = this.previews()?.[rating];
      const interval = preview ? formatInterval(preview.due, this.now()) : null;
      const suggested = this.suggested() === rating;
      return {
        rating,
        label,
        interval,
        suggested,
        colorClass: RATING_COLOR_CLASS[rating],
        ariaLabel: ratingAriaLabel(label, interval, suggested),
      };
    }),
  );
}
