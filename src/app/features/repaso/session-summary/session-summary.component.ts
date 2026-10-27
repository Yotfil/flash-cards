import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import type { RatingCounts } from '@domain/models/daily-stats.model';
import { ratingCountKey } from '@domain/models/daily-stats.model';
import { RATINGS } from '@domain/models/rating';
import { IconComponent } from '@shared/icon/icon.component';

import { REPASO_COPY, rejectedAfterFinishLabel } from '../repaso.copy';

const RATING_DOT_CLASS = {
  1: 'bg-rating-again',
  2: 'bg-rating-hard',
  3: 'bg-rating-good',
  4: 'bg-rating-easy',
} as const;

// El cierre de una sesión: un anillo que se completa, la marca, el título, cuántas se estudiaron
// (el número sube mientras el anillo se cierra) y el conteo por calificación. Los textos los pone
// quien la usa (el repaso, la práctica con IA). Con reducir movimiento todo aparece completo de
// inmediato. El hueco `[practice]` es para el bloque de práctica con IA. Al aparecer, el foco va
// al título: el lector de pantalla anuncia el cierre y Tab sigue por sus controles.
@Component({
  selector: 'app-session-summary',
  imports: [IconComponent],
  templateUrl: './session-summary.component.html',
  styleUrl: './session-summary.component.scss',
})
export class SessionSummaryComponent {
  readonly title = input.required<string>();
  /** El texto del conteo para un número dado ("Repasaste 20 tarjetas."). */
  readonly countLabel = input.required<(count: number) => string>();
  readonly note = input<string | null>(null);
  readonly backLabel = input.required<string>();
  readonly distinctCount = input.required<number>();
  readonly ratingCounts = input.required<RatingCounts>();
  readonly rejectedAfterFinish = input(0);
  readonly back = output<void>();

  private readonly document = inject(DOCUMENT);
  protected readonly copy = REPASO_COPY;
  /** El número que se muestra mientras sube hasta el total. */
  private readonly shownCount = signal(0);
  protected readonly countText = computed(() => this.countLabel()(this.shownCount()));
  protected readonly rejectedText = computed(() =>
    this.rejectedAfterFinish() > 0 ? rejectedAfterFinishLabel(this.rejectedAfterFinish()) : null,
  );
  protected readonly pills = computed(() =>
    RATINGS.map((rating) => ({
      rating,
      label: this.copy.ratingLabels[rating],
      count: this.ratingCounts()[ratingCountKey(rating)],
      dotClass: RATING_DOT_CLASS[rating],
    })),
  );

  private readonly titleHeading =
    viewChild.required<ElementRef<HTMLHeadingElement>>('titleHeading');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.titleHeading().nativeElement.focus();
      const stop = this.countUp();
      destroyRef.onDestroy(stop);
    });
  }

  /** Sube el número hasta el total en la duración del anillo; directo si no hay movimiento. */
  private countUp(): () => void {
    const view = this.document.defaultView;
    const total = this.distinctCount();
    const duration = Number.parseFloat(
      view?.getComputedStyle(this.document.documentElement).getPropertyValue('--duration-ring') ??
        '',
    );
    const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!view?.requestAnimationFrame || reduced || !(duration > 0)) {
      this.shownCount.set(total);
      return () => undefined;
    }
    const start = view.performance.now();
    let frame = 0;
    const step = (time: number) => {
      const done = Math.min(1, (time - start) / duration);
      this.shownCount.set(Math.round(total * done));
      if (done < 1) {
        frame = view.requestAnimationFrame(step);
      }
    };
    frame = view.requestAnimationFrame(step);
    return () => view.cancelAnimationFrame(frame);
  }
}
