import { Component, computed, input, output } from '@angular/core';

import type { CollectionGroup, CollectionShares } from '@services/progress/collection-shares';
import type { CollectionStatus } from '@services/progress/progress.service';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { barWidth } from '../bar-width';
import { PROGRESO_COPY, collectionBarLabel, collectionTotal } from '../progreso.copy';

/** Matices del acento por grupo: la escala de calificación no pinta la colección. */
const SEGMENT_CLASS: Readonly<Record<CollectionGroup, string>> = {
  new: 'bar-accent-new',
  learning: 'bar-accent-learning',
  review: 'bar-accent-review',
};

const SEGMENT_LABEL: Readonly<Record<CollectionGroup, string>> = {
  new: PROGRESO_COPY.newCards,
  learning: PROGRESO_COPY.learning,
  review: PROGRESO_COPY.review,
};

// "Tu colección": total, barra apilada y tres conteos. Tiene sus propios estados (cargando, sin
// red, error con Reintentar) para que un conteo que falla o espera no tumbe los paneles del día.
@Component({
  selector: 'app-collection-overview',
  imports: [SkeletonComponent],
  templateUrl: './collection-overview.component.html',
  styleUrl: './collection-overview.component.scss',
})
export class CollectionOverviewComponent {
  readonly status = input.required<CollectionStatus>();
  readonly shares = input.required<CollectionShares | null>();
  readonly retry = output<void>();

  protected readonly copy = PROGRESO_COPY;
  protected readonly total = computed(() => collectionTotal(this.shares()?.total ?? 0));
  protected readonly segments = computed(() =>
    (this.shares()?.segments ?? []).map((segment) => ({
      key: segment.key,
      count: segment.count,
      label: SEGMENT_LABEL[segment.key],
      width: barWidth(segment.share),
      segmentClass: SEGMENT_CLASS[segment.key],
    })),
  );
  protected readonly barLabel = computed(() => {
    const [newCards, learning, review] = this.segments().map((segment) => segment.count);
    return collectionBarLabel(newCards ?? 0, learning ?? 0, review ?? 0);
  });
}
