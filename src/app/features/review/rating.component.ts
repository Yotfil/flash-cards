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
  template: `
    <div role="group" aria-label="Calificación">
      <p class="mb-3 text-center text-sm text-text-secondary">¿Qué tan bien la recordaste?</p>
      <div class="grid grid-cols-4 gap-2">
        @for (option of options; track option.rating) {
          <button
            type="button"
            (click)="graded.emit(option.rating)"
            [attr.aria-label]="option.label + ', vuelve en ' + interval(option.rating)"
            class="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-2 py-3 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <span class="flex gap-0.5" aria-hidden="true">
              @for (slot of slots; track slot) {
                <app-icon
                  name="brain"
                  size="sm"
                  [class]="
                    slot <= option.rating ? option.activeClass : 'text-text-muted opacity-30'
                  "
                />
              }
            </span>
            <span class="text-sm font-medium text-text-primary">{{ option.label }}</span>
            <span class="text-xs text-text-muted">{{ interval(option.rating) }}</span>
            <kbd
              class="rounded border border-border px-1.5 text-xs text-text-muted"
              aria-hidden="true"
              >{{ option.rating }}</kbd
            >
          </button>
        }
      </div>
    </div>
  `,
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
