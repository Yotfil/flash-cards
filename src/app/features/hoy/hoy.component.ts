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
          @if (!hasStudyMaterial()) {
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

              @if (availableNew() > 0) {
                <div class="mt-4 flex items-center justify-between gap-3">
                  <span class="text-sm text-text-secondary">Tarjetas nuevas hoy</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Menos nuevas"
                      [disabled]="sessionNew() === 0"
                      (click)="adjustNew(-1)"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-40"
                    >
                      −
                    </button>
                    <span class="w-8 text-center text-sm font-medium text-text-primary">
                      {{ sessionNew() }}
                    </span>
                    <button
                      type="button"
                      aria-label="Más nuevas"
                      [disabled]="sessionNew() >= availableNew()"
                      (click)="adjustNew(1)"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
                @if (showNudge()) {
                  <p class="mt-2 text-xs text-text-muted">
                    Tienes muchos repasos hoy; considera menos tarjetas nuevas para no acumular
                    carga.
                  </p>
                }
              }

              <button
                type="button"
                [disabled]="starting() || total() === 0"
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
