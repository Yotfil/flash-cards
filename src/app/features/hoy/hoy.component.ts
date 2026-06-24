import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { QueueService, ReviewService } from '@services/review';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';

/** Pantalla "Hoy" (spec §8.2): la cola del día. Responde a "¿qué estudio ahora?" con un bloque
 *  protagonista (Estudiar ahora) y el desglose por libro. Sólo pinta; la cola la arma QueueService y
 *  la sesión la lleva ReviewService. */
@Component({
  selector: 'app-hoy',
  imports: [RouterLink, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './hoy.component.html',
  styleUrl: './hoy.component.scss',
})
export class HoyComponent implements OnInit {
  private readonly queueService = inject(QueueService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly status = this.queueService.status;
  protected readonly dueCount = this.queueService.dueCount;
  protected readonly newCount = this.queueService.newCount;
  protected readonly availableNew = this.queueService.availableNew;
  protected readonly perBook = this.queueService.perBook;
  protected readonly errorMessage = this.queueService.errorMessage;
  protected readonly total = computed(() => this.dueCount() + this.newCount());
  // Hay material de estudio (independiente del override de sesión): vencidas o nuevas disponibles.
  protected readonly hasStudyMaterial = computed(() => this.dueCount() + this.availableNew() > 0);
  protected readonly starting = signal(false);

  // Nuevas que el usuario eligió para esta sesión, y el default con que llegó la cola (para el nudge).
  protected readonly sessionNew = signal(0);
  private readonly defaultNew = signal(0);

  /** Sugerir reducir nuevas cuando hay muchos repasos hoy (carga de repasos alta vs. la tanda). */
  protected readonly showNudge = computed(
    () => this.availableNew() > 0 && this.dueCount() >= 2 * Math.max(this.defaultNew(), 10),
  );

  ngOnInit(): void {
    void this.refresh();
  }

  protected reload(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.queueService.load();
    this.defaultNew.set(this.newCount());
    this.sessionNew.set(this.newCount());
  }

  /** Ajusta cuántas tarjetas nuevas estudiar hoy (0..disponibles) y recomputa la cola. */
  protected adjustNew(delta: number): void {
    const next = Math.min(this.availableNew(), Math.max(0, this.sessionNew() + delta));
    this.sessionNew.set(next);
    this.queueService.applyNewLimit(next);
  }

  protected async study(): Promise<void> {
    if (this.starting()) {
      return;
    }
    this.starting.set(true);
    try {
      const count = this.reviewService.startWith(this.queueService.queue());
      if (count > 0) {
        await this.router.navigate(['/repaso']);
      }
    } finally {
      this.starting.set(false);
    }
  }
}
