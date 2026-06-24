import { Component, type OnInit, computed, inject } from '@angular/core';

import { ProgressService } from '@services/stats';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';

interface RatingRow {
  label: string;
  count: number;
  /** Clase de fondo de la barra (token rating-*; uso reservado a la calificación). */
  barClass: string;
}

/** Pantalla "Progreso" (spec §8.7): MVP sobrio y honesto — pendientes hoy, repasadas hoy, distribución
 *  de calificaciones del día y estado de la colección. Sólo pinta; ProgressService agrega los datos.
 *  El panel de debilidades (leeches, retención) es de fase posterior. */
@Component({
  selector: 'app-progreso',
  imports: [EmptyStateComponent, ErrorStateComponent],
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <h1 class="text-2xl font-semibold text-text-primary">Progreso</h1>

      @switch (status()) {
        @case ('loading') {
          <div class="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Cargando estadísticas">
            <div
              class="h-24 animate-pulse rounded-2xl border border-border bg-surface-sunken"
            ></div>
            <div
              class="h-40 animate-pulse rounded-2xl border border-border bg-surface-sunken"
            ></div>
          </div>
        }
        @case ('error') {
          <app-error-state
            title="No pudimos cargar tus estadísticas"
            [message]="errorMessage() ?? ''"
            (retry)="reload()"
          />
        }
        @case ('ready') {
          @if (isEmpty()) {
            <app-empty-state
              title="Aún no hay nada que mostrar"
              message="Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar."
            />
          } @else {
            <!-- Hoy -->
            <div class="mt-6 grid grid-cols-2 gap-3">
              <div class="rounded-2xl border border-border bg-surface-raised p-5">
                <p class="text-3xl font-semibold text-text-primary">{{ pendingToday() }}</p>
                <p class="mt-1 text-sm text-text-secondary">Pendientes hoy</p>
              </div>
              <div class="rounded-2xl border border-border bg-surface-raised p-5">
                <p class="text-3xl font-semibold text-text-primary">{{ reviewsToday() }}</p>
                <p class="mt-1 text-sm text-text-secondary">Repasadas hoy</p>
              </div>
            </div>

            <!-- Distribución de calificaciones de hoy -->
            <div class="mt-4 rounded-2xl border border-border bg-surface-raised p-5">
              <h2 class="text-sm font-medium text-text-secondary">Calificaciones de hoy</h2>
              @if (reviewsToday() === 0) {
                <p class="mt-3 text-sm text-text-muted">Aún no has calificado tarjetas hoy.</p>
              } @else {
                <ul class="mt-3 flex flex-col gap-2">
                  @for (row of ratingRows(); track row.label) {
                    <li class="flex items-center gap-3">
                      <span class="w-16 shrink-0 text-sm text-text-secondary">{{ row.label }}</span>
                      <span class="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <span
                          class="block h-full rounded-full"
                          [class]="row.barClass"
                          [style.width.%]="barWidth(row.count)"
                        ></span>
                      </span>
                      <span class="w-8 shrink-0 text-right text-sm text-text-muted">
                        {{ row.count }}
                      </span>
                    </li>
                  }
                </ul>
              }
            </div>

            <!-- Estado de la colección -->
            <div class="mt-4 rounded-2xl border border-border bg-surface-raised p-5">
              <h2 class="text-sm font-medium text-text-secondary">Tu colección</h2>
              <p class="mt-1 text-xs text-text-muted">{{ totalCards() }} tarjetas en total</p>
              <span class="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <span
                  class="block h-full bg-accent/40"
                  [style.width.%]="share(collection().newCards)"
                ></span>
                <span
                  class="block h-full bg-accent/70"
                  [style.width.%]="share(collection().learning)"
                ></span>
                <span
                  class="block h-full bg-accent"
                  [style.width.%]="share(collection().review)"
                ></span>
              </span>
              <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p class="text-xl font-semibold text-text-primary">{{ collection().newCards }}</p>
                  <p class="text-xs text-text-muted">Nuevas</p>
                </div>
                <div>
                  <p class="text-xl font-semibold text-text-primary">{{ collection().learning }}</p>
                  <p class="text-xs text-text-muted">En aprendizaje</p>
                </div>
                <div>
                  <p class="text-xl font-semibold text-text-primary">{{ collection().review }}</p>
                  <p class="text-xs text-text-muted">Dominadas</p>
                </div>
              </div>
            </div>
          }
        }
      }
    </section>
  `,
})
export class ProgresoComponent implements OnInit {
  private readonly progressService = inject(ProgressService);

  protected readonly status = this.progressService.status;
  protected readonly errorMessage = this.progressService.errorMessage;
  protected readonly reviewsToday = this.progressService.reviewsToday;
  protected readonly collection = this.progressService.collection;
  protected readonly totalCards = this.progressService.totalCards;
  protected readonly isEmpty = this.progressService.isEmpty;
  protected readonly pendingToday = computed(
    () => this.progressService.pendingDue() + this.progressService.pendingNew(),
  );

  protected readonly ratingRows = computed<RatingRow[]>(() => {
    const counts = this.progressService.ratingCounts();
    return [
      { label: 'Otra vez', count: counts.again, barClass: 'bg-rating-again' },
      { label: 'Difícil', count: counts.hard, barClass: 'bg-rating-hard' },
      { label: 'Bien', count: counts.good, barClass: 'bg-rating-good' },
      { label: 'Fácil', count: counts.easy, barClass: 'bg-rating-easy' },
    ];
  });

  ngOnInit(): void {
    void this.progressService.load();
  }

  protected reload(): void {
    void this.progressService.load();
  }

  /** Ancho de la barra de una calificación como porcentaje del total de calificaciones de hoy. */
  protected barWidth(count: number): number {
    return this.reviewsToday() === 0 ? 0 : (count / this.reviewsToday()) * 100;
  }

  /** Porcentaje de un grupo de la colección sobre el total de tarjetas. */
  protected share(count: number): number {
    return this.totalCards() === 0 ? 0 : (count / this.totalCards()) * 100;
  }
}
