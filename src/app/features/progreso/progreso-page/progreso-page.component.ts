import { Component, DestroyRef, computed, inject, type OnInit } from '@angular/core';

import { ProgressService } from '@services/progress/progress.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { CollectionOverviewComponent } from '../collection-overview/collection-overview.component';
import { PROGRESO_COPY } from '../progreso.copy';
import { RatingDistributionComponent } from '../rating-distribution/rating-distribution.component';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

type ProgresoView = 'loading' | 'error' | 'empty' | 'panels';

// Progreso: dónde estoy hoy (pendientes, repasadas, cómo califiqué) y cómo se reparte la colección.
// Carga el día en cada visita; la colección solo se cuenta si cambió. El error de toda la pantalla
// es solo el del día; la colección lleva sus propios estados dentro de su sección, y el vacío se
// decide solo con su conteo en la mano.
@Component({
  selector: 'app-progreso-page',
  imports: [
    CollectionOverviewComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    RatingDistributionComponent,
    SkeletonComponent,
    SummaryCardComponent,
  ],
  templateUrl: './progreso-page.component.html',
  styleUrl: './progreso-page.component.scss',
})
export class ProgresoPageComponent implements OnInit {
  protected readonly progress = inject(ProgressService);

  protected readonly copy = PROGRESO_COPY;
  protected readonly view = computed<ProgresoView>(() => {
    const status = this.progress.dayStatus();
    if (status !== 'ready') {
      return status;
    }
    return this.progress.isEmpty() ? 'empty' : 'panels';
  });

  constructor() {
    // Fuera de Progreso, la red que vuelve no debe contar la colección.
    inject(DestroyRef).onDestroy(() => this.progress.leave());
  }

  ngOnInit(): void {
    this.progress.enter();
  }
}
