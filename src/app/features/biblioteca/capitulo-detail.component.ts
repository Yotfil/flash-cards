import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Card, CardContentDraft } from '@domain/models';
import { CardsService } from '@services/cards.service';
import { ChaptersService } from '@services/chapters.service';
import { findDuplicateCardIds, sortCardsForDisplay } from '@services/card-duplicates';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { CardFormDialogComponent } from './card-form-dialog.component';
import { CardImportDialogComponent } from './card-import-dialog.component';
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
    IconComponent,
    CardFormDialogComponent,
    CardImportDialogComponent,
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
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              (click)="openImport()"
              class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
            >
              Importar
            </button>
            <button
              type="button"
              (click)="openCreate()"
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Nueva tarjeta
            </button>
          </div>
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
              @for (card of sortedCards(); track card.id) {
                <li
                  class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-raised p-4"
                >
                  <div class="flex min-w-0 items-center gap-2 text-sm">
                    <span class="truncate font-medium text-text-primary">{{ card.front }}</span>
                    <span class="shrink-0 text-text-muted" aria-hidden="true">→</span>
                    <span class="truncate text-text-secondary">{{ card.back }}</span>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    @if (duplicateIds().has(card.id)) {
                      <span class="group relative flex items-center">
                        <button
                          type="button"
                          aria-label="Tarjeta repetida"
                          (click)="toggleTooltip(card.id)"
                          class="flex items-center rounded-md p-1 text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          <app-icon name="alert" size="sm" />
                        </button>
                        <span
                          role="tooltip"
                          class="pointer-events-none absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-xs font-medium text-surface opacity-0 transition-opacity group-hover:opacity-100"
                          [class.opacity-100]="openTooltipId() === card.id"
                        >
                          Repetida
                        </span>
                      </span>
                    }
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
      <app-card-form-dialog
        [card]="editing()"
        [pending]="saving()"
        (saved)="onSave($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (pendingDelete(); as card) {
      <app-confirm-dialog
        title="¿Borrar esta tarjeta?"
        [message]="'Se eliminará «' + card.front + '» y no se puede deshacer.'"
        [pending]="deleting()"
        (confirmed)="confirmDelete(card)"
        (cancelled)="pendingDelete.set(null)"
      />
    }

    @if (showImport()) {
      <app-card-import-dialog
        [defaultChapterName]="chapter()?.name ?? 'Importadas'"
        [pending]="importing()"
        (imported)="onImport($event)"
        (cancelled)="showImport.set(false)"
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

  // Lista ordenada por anverso (agrupa misma palabra) e ids de las tarjetas repetidas (idénticas).
  protected readonly sortedCards = computed(() => sortCardsForDisplay(this.cards()));
  protected readonly duplicateIds = computed(() => findDuplicateCardIds(this.cards()));
  // Tooltip "Repetida" abierto (para móvil, donde no hay hover): id de la tarjeta o null.
  protected readonly openTooltipId = signal<string | null>(null);

  protected readonly skeletons = [0, 1, 2];

  protected readonly showForm = signal(false);
  protected readonly editing = signal<Card | null>(null);
  protected readonly pendingDelete = signal<Card | null>(null);
  protected readonly showImport = signal(false);
  protected readonly actionError = signal<string | null>(null);
  // En vuelo: bloquean los botones de los diálogos para evitar acciones duplicadas.
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly importing = signal(false);

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

  protected openImport(): void {
    this.showImport.set(true);
  }

  /** Alterna el tooltip "Repetida" de una tarjeta (en móvil se abre con tap; en escritorio basta el
   *  hover, pero esto no estorba). */
  protected toggleTooltip(cardId: string): void {
    this.openTooltipId.update((current) => (current === cardId ? null : cardId));
  }

  protected async onImport(drafts: CardContentDraft[]): Promise<void> {
    if (this.importing()) {
      return;
    }
    this.actionError.set(null);
    this.importing.set(true);
    try {
      await this.cardsService.createMany(this.bookId, this.chapterId, drafts);
      this.showImport.set(false);
    } catch (error) {
      console.error('No se pudieron importar las tarjetas', error);
      this.actionError.set('No se pudieron importar las tarjetas. Inténtalo de nuevo.');
    } finally {
      this.importing.set(false);
    }
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
    if (this.saving()) {
      return;
    }
    this.actionError.set(null);
    this.saving.set(true);
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
    } finally {
      this.saving.set(false);
    }
  }

  protected askDelete(card: Card): void {
    this.pendingDelete.set(card);
  }

  protected async confirmDelete(card: Card): Promise<void> {
    if (this.deleting()) {
      return;
    }
    this.actionError.set(null);
    this.deleting.set(true);
    try {
      await this.cardsService.remove(this.bookId, card.id);
    } catch (error) {
      console.error('No se pudo borrar la tarjeta', error);
      this.actionError.set('No se pudo borrar la tarjeta. Inténtalo de nuevo.');
    } finally {
      this.deleting.set(false);
      this.pendingDelete.set(null);
    }
  }
}
