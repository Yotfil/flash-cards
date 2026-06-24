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
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <h1 class="text-2xl font-semibold text-text-primary">Hoy</h1>

      @switch (status()) {
        @case ('loading') {
          <div class="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Cargando tu cola">
            <div
              class="h-28 animate-pulse rounded-2xl border border-border bg-surface-sunken"
            ></div>
            <div
              class="h-16 animate-pulse rounded-2xl border border-border bg-surface-sunken"
            ></div>
          </div>
        }
        @case ('error') {
          <app-error-state
            title="No pudimos cargar tu cola"
            [message]="errorMessage() ?? ''"
            (retry)="reload()"
          />
        }
        @case ('ready') {
          @if (total() === 0) {
            <app-empty-state
              title="Estás al día"
              message="No tienes tarjetas para repasar ahora. Agrega o importa más cuando quieras."
            >
              <a
                routerLink="/biblioteca"
                class="mt-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
              >
                Ir a la Biblioteca
              </a>
            </app-empty-state>
          } @else {
            <div class="mt-6 rounded-2xl border border-border bg-surface-raised p-6">
              <p class="text-lg font-medium text-text-primary">
                Tienes {{ total() }} tarjeta(s) para repasar hoy
              </p>
              <p class="mt-1 text-sm text-text-secondary">
                {{ dueCount() }} por repasar · {{ newCount() }} nuevas
              </p>
              <button
                type="button"
                [disabled]="starting()"
                (click)="study()"
                class="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                @if (starting()) {
                  Preparando…
                } @else {
                  Estudiar ahora
                }
              </button>
            </div>

            @if (perBook().length > 0) {
              <ul class="mt-4 flex flex-col gap-2">
                @for (book of perBook(); track book.bookId) {
                  <li>
                    <a
                      [routerLink]="['/biblioteca', book.bookId]"
                      class="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-raised px-4 py-3 transition-colors hover:bg-surface-sunken"
                    >
                      <span class="min-w-0 truncate font-medium text-text-primary">
                        {{ book.name }}
                      </span>
                      <span class="shrink-0 text-sm text-text-muted">
                        {{ book.due }} por repasar · {{ book.new }} nuevas
                      </span>
                    </a>
                  </li>
                }
              </ul>
            }
          }

          <a
            routerLink="/biblioteca"
            class="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            Crear o importar un libro
          </a>
        }
      }
    </section>
  `,
})
export class HoyComponent implements OnInit {
  private readonly queueService = inject(QueueService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly status = this.queueService.status;
  protected readonly dueCount = this.queueService.dueCount;
  protected readonly newCount = this.queueService.newCount;
  protected readonly perBook = this.queueService.perBook;
  protected readonly errorMessage = this.queueService.errorMessage;
  protected readonly total = computed(() => this.dueCount() + this.newCount());
  protected readonly starting = signal(false);

  ngOnInit(): void {
    void this.queueService.load();
  }

  protected reload(): void {
    void this.queueService.load();
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
