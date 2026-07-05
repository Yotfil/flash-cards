import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Card, CardContentDraft } from '@domain/models';
import { CardsService } from '@services/cards.service';
import { ChaptersService } from '@services/chapters.service';
import { ReviewService } from '@services/review';
import { QuizService } from '@services/quiz';
import { clozeQuestion } from '@services/cloze';
import { findDuplicateCardIds, sortCardsForDisplay } from '@services/card-duplicates';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { CardFormDialogComponent } from '../card-form-dialog/card-form-dialog.component';
import {
  CardImportDialogComponent,
  type CardImportRequest,
} from '../card-import-dialog/card-import-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Pantalla "detalle de un capítulo": cabecera del capítulo + CRUD de sus tarjetas (vista compacta
 *  anverso → reverso) + importar y estudiar. Sólo pinta y captura eventos; la lógica vive en los
 *  servicios. */
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
  templateUrl: './capitulo-detail.component.html',
  styleUrl: './capitulo-detail.component.scss',
})
export class CapituloDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chaptersService = inject(ChaptersService);
  private readonly cardsService = inject(CardsService);
  private readonly reviewService = inject(ReviewService);
  private readonly quizService = inject(QuizService);

  protected readonly bookId = this.route.snapshot.paramMap.get('bookId') ?? '';
  private readonly chapterId = this.route.snapshot.paramMap.get('chapterId') ?? '';
  protected readonly studying = signal(false);
  protected readonly studyMessage = signal<string | null>(null);
  protected readonly practicing = signal(false);
  protected readonly practiceMessage = signal<string | null>(null);

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

  // Selección múltiple para acciones masivas: modo activo, ids marcados y borrado en lote.
  protected readonly selectionMode = signal(false);
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly pendingBulkDelete = signal(false);
  protected readonly bulkDeleting = signal(false);

  protected readonly allSelected = computed(
    () => this.cards().length > 0 && this.selectedIds().size === this.cards().length,
  );

  protected readonly bulkDeleteMessage = computed(() => {
    const count = this.selectedIds().size;
    return count === 1
      ? 'Se eliminará 1 tarjeta de este capítulo, con su progreso de estudio. No se puede deshacer.'
      : `Se eliminarán ${count} tarjetas de este capítulo, con su progreso de estudio. No se puede deshacer.`;
  });

  /** ¿La tarjeta es cloze? Decide cómo se pinta en el listado (pregunta con huecos vs anverso→reverso). */
  protected isCloze(card: Card): boolean {
    return card.cardType === 'cloze';
  }

  /** Texto compacto de una tarjeta cloze para el listado: el texto con los huecos como `[…]`. */
  protected clozePreview(card: Card): string {
    return clozeQuestion(card.front);
  }

  ngOnInit(): void {
    // Carga los capítulos del libro (para el nombre en la cabecera) y las tarjetas del capítulo.
    void this.chaptersService.load(this.bookId);
    void this.cardsService.load(this.chapterId);
  }

  protected reload(): void {
    void this.cardsService.load(this.chapterId);
  }

  /** Inicia una sesión con las tarjetas listas del capítulo; si no hay, avisa sin entrar. */
  protected async studyChapter(): Promise<void> {
    if (this.studying()) {
      return;
    }
    this.studyMessage.set(null);
    this.studying.set(true);
    try {
      const count = await this.reviewService.startChapter(this.chapterId);
      if (count === 0) {
        this.studyMessage.set(
          'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
        );
        return;
      }
      await this.router.navigate(['/repaso']);
    } finally {
      this.studying.set(false);
    }
  }

  /** Inicia un mini-quiz con las tarjetas del capítulo; si no se puede armar, avisa sin entrar. */
  protected async practiceChapter(): Promise<void> {
    if (this.practicing()) {
      return;
    }
    this.practiceMessage.set(null);
    this.practicing.set(true);
    try {
      const count = await this.quizService.startChapter(this.chapterId);
      if (count === 0) {
        this.practiceMessage.set(
          'Necesitas algunas tarjetas básicas en este capítulo para practicar.',
        );
        return;
      }
      await this.router.navigate(['/practicar']);
    } finally {
      this.practicing.set(false);
    }
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

  protected async onImport(request: CardImportRequest): Promise<void> {
    if (this.importing()) {
      return;
    }
    this.actionError.set(null);
    this.importing.set(true);
    try {
      if (request.mode === 'replace') {
        await this.cardsService.replaceAllInChapter(this.bookId, this.chapterId, request.drafts);
      } else {
        await this.cardsService.createMany(this.bookId, this.chapterId, request.drafts);
      }
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

  /** Entra o sale del modo selección; al cambiar de modo se limpia lo marcado. */
  protected toggleSelectionMode(): void {
    this.selectionMode.update((active) => !active);
    this.selectedIds.set(new Set());
  }

  protected toggleCardSelection(cardId: string): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  protected toggleSelectAll(): void {
    this.selectedIds.set(
      this.allSelected() ? new Set() : new Set(this.cards().map((card) => card.id)),
    );
  }

  protected askBulkDelete(): void {
    if (this.selectedIds().size === 0) {
      return;
    }
    this.pendingBulkDelete.set(true);
  }

  protected async confirmBulkDelete(): Promise<void> {
    if (this.bulkDeleting()) {
      return;
    }
    this.actionError.set(null);
    this.bulkDeleting.set(true);
    try {
      await this.cardsService.removeMany(this.bookId, [...this.selectedIds()]);
      this.selectionMode.set(false);
      this.selectedIds.set(new Set());
    } catch (error) {
      console.error('No se pudieron borrar las tarjetas seleccionadas', error);
      this.actionError.set('No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo.');
    } finally {
      this.bulkDeleting.set(false);
      this.pendingBulkDelete.set(false);
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
