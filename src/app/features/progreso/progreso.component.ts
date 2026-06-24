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
  templateUrl: './progreso.component.html',
  styleUrl: './progreso.component.scss',
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
