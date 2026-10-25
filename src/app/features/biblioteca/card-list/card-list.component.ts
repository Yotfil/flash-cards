import { Component, computed, inject, input, output, signal, type OnInit } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { CardsService } from '@services/cards/cards.service';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '@shared/confirm-dialog/confirm-dialog.component';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import {
  BIBLIOTECA_COPY,
  bulkDeleteLabel,
  bulkDeletionMessage,
  cardDisplayName,
} from '../biblioteca.copy';
import {
  CardFormDialogComponent,
  type CardFormDialogData,
} from '../card-form-dialog/card-form-dialog.component';
import { CardRowComponent } from '../card-row/card-row.component';

type ListView = 'loading' | 'error' | 'empty' | 'list';

// Tarjetas del capítulo: relee al abrirse y pinta esqueleto, error con Reintentar, bienvenida vacía
// o la cabecera de acciones con las filas. Gestiona el modo selección (vive en esta pantalla: salir
// de ella lo limpia) y abre el formulario y las confirmaciones. Avisa con `contentsChanged` cuando
// un borrado cambió las tarjetas, y con `importRequested` cuando se pide importar.
@Component({
  selector: 'app-card-list',
  imports: [CardRowComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  templateUrl: './card-list.component.html',
  styleUrl: './card-list.component.scss',
})
export class CardListComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly chapterId = input.required<string>();
  readonly contentsChanged = output<void>();
  readonly importRequested = output<void>();

  private readonly cardsService = inject(CardsService);
  private readonly dialogs = inject(DialogService);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY;
  protected readonly cards = this.cardsService.sorted;
  protected readonly duplicateIds = this.cardsService.duplicateIds;
  protected readonly view = computed<ListView>(() => {
    const status = this.cardsService.cards.status();
    if (status === 'error') {
      return 'error';
    }
    if (status !== 'resolved' && status !== 'local') {
      return 'loading';
    }
    return this.cards().length === 0 ? 'empty' : 'list';
  });

  protected readonly selectionMode = signal(false);
  private readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  /** Las marcadas que siguen en la lista, en el orden en que se ven. */
  private readonly selectedCards = computed(() =>
    this.cards().filter((card) => this.selectedIds().has(card.id)),
  );
  protected readonly selectedCount = computed(() => this.selectedCards().length);
  protected readonly allSelected = computed(
    () => this.cards().length > 0 && this.selectedCount() === this.cards().length,
  );

  ngOnInit(): void {
    this.cardsService.openChapter(this.chapterId());
  }

  protected retry(): void {
    this.cardsService.openChapter(this.chapterId());
  }

  protected isSelected(card: Card): boolean {
    return this.selectedIds().has(card.id);
  }

  protected create(): void {
    this.dialogs.open<Card, CardFormDialogData>(CardFormDialogComponent, {
      label: this.copy.cardForm.createTitle,
      size: 'lg',
      data: {
        mode: 'create',
        bookId: this.bookId(),
        chapterId: this.chapterId(),
        chapterCards: this.cards,
      },
    });
  }

  protected edit(card: Card): void {
    this.dialogs.open<Card, CardFormDialogData>(CardFormDialogComponent, {
      label: this.copy.cardForm.editTitle,
      size: 'lg',
      data: { mode: 'edit', card },
    });
  }

  protected async askDelete(card: Card): Promise<void> {
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteCard.title,
      size: 'sm',
      data: {
        title: this.copy.deleteCard.title,
        message: cardDisplayName(card),
        detail: this.copy.deleteCard.detail,
        confirmLabel: this.copy.deleteCard.confirm,
        pendingLabel: this.copy.deleteCard.pending,
        errorMessage: this.copy.deleteCard.error,
        action: () => this.cardsService.remove(this.bookId(), card.id),
      },
    });
    if (await ref.closed) {
      this.contentsChanged.emit();
    }
  }

  protected startSelection(): void {
    this.selectedIds.set(new Set());
    this.selectionMode.set(true);
  }

  protected cancelSelection(): void {
    this.selectionMode.set(false);
    this.selectedIds.set(new Set());
  }

  protected toggle(card: Card): void {
    this.selectedIds.update((selected) => {
      const next = new Set(selected);
      if (!next.delete(card.id)) {
        next.add(card.id);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.selectedIds.set(
      this.allSelected() ? new Set() : new Set(this.cards().map((card) => card.id)),
    );
  }

  protected async askDeleteSelected(): Promise<void> {
    const count = this.selectedCount();
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteCards.title,
      size: 'sm',
      data: {
        title: this.copy.deleteCards.title,
        message: bulkDeletionMessage(count),
        confirmLabel: bulkDeleteLabel(count),
        pendingLabel: this.copy.deleteCards.pending,
        errorMessage: this.copy.deleteCards.error,
        // Se calcula en cada intento: si uno se cortó a mitad, lo ya borrado salió de la lista y
        // reintentar pide solo lo que falta.
        action: async () => {
          const ids = this.selectedCards().map((card) => card.id);
          await this.cardsService.removeMany(this.bookId(), ids);
        },
      },
    });
    if (await ref.closed) {
      this.cancelSelection();
      this.contentsChanged.emit();
    }
  }
}
