import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Card, CardContentDraft } from '@domain/models';
import { CardsService } from '@services/cards.service';
import { ChaptersService } from '@services/chapters.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { CardFormDialogComponent } from './card-form-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Pantalla "detalle de un capítulo": cabecera del capítulo + CRUD de sus tarjetas (vista compacta
 *  anverso → reverso). Sólo pinta y captura eventos; la lógica vive en los servicios. Suspender,
 *  campos opcionales y tarjeta inversa llegan en ramas siguientes. */
@Component({
  selector: 'app-capitulo-detail',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    CardFormDialogComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <a
        [routerLink]="['/biblioteca', bookId]"
        class="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Volver al libro
      </a>

      <header class="mt-3 flex items-start justify-between gap-4">
        <h1 class="min-w-0 truncate text-2xl font-semibold text-text-primary">
          {{ chapter()?.name ?? 'Capítulo' }}
        </h1>
        @if (cardsStatus() === 'ready') {
          <button
            type="button"
            (click)="openCreate()"
            class="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Nueva tarjeta
          </button>
        }
      </header>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg border border-border bg-surface-sunken px-4 py-2.5 text-sm text-text-secondary"
        >
          {{ message }}
        </p>
      }

      @switch (cardsStatus()) {
        @case ('loading') {
          <div class="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Cargando tarjetas">
            @for (placeholder of skeletons; track placeholder) {
              <div
                class="h-16 animate-pulse rounded-2xl border border-border bg-surface-sunken"
              ></div>
            }
          </div>
        }
        @case ('error') {
          <app-error-state
            title="No pudimos cargar las tarjetas"
            [message]="cardsError() ?? ''"
            (retry)="reload()"
          />
        }
        @case ('ready') {
          @if (cards().length === 0) {
            <app-empty-state
              title="Este capítulo no tiene tarjetas"
              message="Crea una tarjeta con su anverso y reverso para empezar a estudiar."
            >
              <button
                type="button"
                (click)="openCreate()"
                class="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Crear tarjeta
              </button>
            </app-empty-state>
          } @else {
            <ul class="mt-6 flex flex-col gap-3">
              @for (card of cards(); track card.id) {
                <li
                  class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-raised p-4"
                >
                  <div class="flex min-w-0 items-center gap-2 text-sm">
                    <span class="truncate font-medium text-text-primary">{{ card.front }}</span>
                    <span class="shrink-0 text-text-muted" aria-hidden="true">→</span>
                    <span class="truncate text-text-secondary">{{ card.back }}</span>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      (click)="openEdit(card)"
                      class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      [attr.aria-label]="'Borrar tarjeta ' + card.front"
                      (click)="askDelete(card)"
                      class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      }
    </section>

    @if (showForm()) {
      <app-card-form-dialog [card]="editing()" (saved)="onSave($event)" (cancelled)="closeForm()" />
    }

    @if (pendingDelete(); as card) {
      <app-confirm-dialog
        title="¿Borrar esta tarjeta?"
        [message]="'Se eliminará «' + card.front + '» y no se puede deshacer.'"
        (confirmed)="confirmDelete(card)"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class CapituloDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly chaptersService = inject(ChaptersService);
  private readonly cardsService = inject(CardsService);

  protected readonly bookId = this.route.snapshot.paramMap.get('bookId') ?? '';
  private readonly chapterId = this.route.snapshot.paramMap.get('chapterId') ?? '';

  protected readonly chapter = computed(() =>
    this.chaptersService.chapters().find((candidate) => candidate.id === this.chapterId),
  );

  protected readonly cards = this.cardsService.cards;
  protected readonly cardsStatus = this.cardsService.status;
  protected readonly cardsError = this.cardsService.errorMessage;

  protected readonly skeletons = [0, 1, 2];

  protected readonly showForm = signal(false);
  protected readonly editing = signal<Card | null>(null);
  protected readonly pendingDelete = signal<Card | null>(null);
  protected readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    // Carga los capítulos del libro (para el nombre en la cabecera) y las tarjetas del capítulo.
    void this.chaptersService.load(this.bookId);
    void this.cardsService.load(this.chapterId);
  }

  protected reload(): void {
    void this.cardsService.load(this.chapterId);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  protected openEdit(card: Card): void {
    this.editing.set(card);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  protected async onSave(draft: CardContentDraft): Promise<void> {
    this.actionError.set(null);
    const editingCard = this.editing();
    try {
      if (editingCard) {
        await this.cardsService.update(editingCard.id, draft);
      } else {
        await this.cardsService.create(this.bookId, this.chapterId, draft);
      }
      this.closeForm();
    } catch (error) {
      console.error('No se pudo guardar la tarjeta', error);
      this.actionError.set('No se pudo guardar la tarjeta. Inténtalo de nuevo.');
    }
  }

  protected askDelete(card: Card): void {
    this.pendingDelete.set(card);
  }

  protected async confirmDelete(card: Card): Promise<void> {
    this.actionError.set(null);
    try {
      await this.cardsService.remove(this.bookId, card.id);
    } catch (error) {
      console.error('No se pudo borrar la tarjeta', error);
      this.actionError.set('No se pudo borrar la tarjeta. Inténtalo de nuevo.');
    } finally {
      this.pendingDelete.set(null);
    }
  }
}
