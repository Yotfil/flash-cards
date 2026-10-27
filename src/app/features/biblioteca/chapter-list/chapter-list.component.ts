import { Component, computed, inject, input, output, signal, type OnInit } from '@angular/core';

import type { Chapter } from '@domain/models/chapter.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ChaptersService } from '@services/chapters/chapters.service';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '@shared/confirm-dialog/confirm-dialog.component';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { BIBLIOTECA_COPY, chapterDeletionDetail, chapterDisplayName } from '../biblioteca.copy';
import {
  ChapterFormDialogComponent,
  type ChapterFormDialogData,
} from '../chapter-form-dialog/chapter-form-dialog.component';
import { ChapterRowComponent } from '../chapter-row/chapter-row.component';

type ListView = 'loading' | 'error' | 'empty' | 'list';

// Lista de capítulos del detalle del libro: relee al abrirse y pinta esqueleto, error con
// Reintentar, bienvenida vacía o las filas con "Añadir un capítulo" al final. Avisa con
// `contentsChanged` cuando un borrado cambió las tarjetas del libro (el detalle relee sus totales).
@Component({
  selector: 'app-chapter-list',
  imports: [ChapterRowComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  templateUrl: './chapter-list.component.html',
  styleUrl: './chapter-list.component.scss',
})
export class ChapterListComponent implements OnInit {
  readonly bookId = input.required<string>();
  readonly contentsChanged = output<void>();

  private readonly chaptersService = inject(ChaptersService);
  private readonly dialogs = inject(DialogService);
  private readonly logger = inject(Logger);
  private readonly online = inject(ConnectivityPort).online;

  protected readonly copy = BIBLIOTECA_COPY;
  protected readonly chapters = computed(() =>
    this.chaptersService.chapters.hasValue() ? this.chaptersService.chapters.value() : [],
  );
  protected readonly view = computed<ListView>(() => {
    const status = this.chaptersService.chapters.status();
    if (status === 'error') {
      return 'error';
    }
    // Mientras carga o se relee, lo que ya hay se queda (sin volver al esqueleto); el vacío solo
    // lo decide una lectura terminada.
    if (status !== 'resolved' && status !== 'local') {
      return this.chapters().length > 0 ? 'list' : 'loading';
    }
    return this.chapters().length === 0 ? 'empty' : 'list';
  });
  /** El capítulo cuyo borrado se está preparando (contando sus tarjetas). */
  protected readonly preparingDelete = signal<string | null>(null);

  ngOnInit(): void {
    this.chaptersService.openBook(this.bookId());
  }

  protected retry(): void {
    this.chaptersService.openBook(this.bookId());
  }

  protected create(): void {
    this.dialogs.open<Chapter, ChapterFormDialogData>(ChapterFormDialogComponent, {
      label: this.copy.chapterForm.createTitle,
      data: { mode: 'create' },
    });
  }

  protected rename(chapter: Chapter): void {
    this.dialogs.open<Chapter, ChapterFormDialogData>(ChapterFormDialogComponent, {
      label: this.copy.chapterForm.renameTitle,
      data: { mode: 'rename', chapter },
    });
  }

  /** Con red cuenta sus tarjetas para la confirmación; sin red o si falla, el texto va sin número. */
  protected async askDelete(chapter: Chapter): Promise<void> {
    if (this.preparingDelete() !== null) {
      return;
    }
    this.preparingDelete.set(chapter.id);
    const cards = this.online() ? await this.countCards(chapter) : null;
    this.preparingDelete.set(null);
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteChapter.title,
      size: 'sm',
      data: {
        title: this.copy.deleteChapter.title,
        message: this.copy.deleteChapter.message(chapterDisplayName(chapter)),
        detail: chapterDeletionDetail(cards),
        confirmLabel: this.copy.deleteChapter.confirm,
        pendingLabel: this.copy.deleteChapter.pending,
        errorMessage: this.copy.deleteChapter.error,
        action: async () => {
          await this.chaptersService.remove(chapter.id);
        },
      },
    });
    if (await ref.closed) {
      this.contentsChanged.emit();
    }
  }

  private async countCards(chapter: Chapter): Promise<number | null> {
    try {
      return await this.chaptersService.countCards(chapter.id);
    } catch (error) {
      this.logger.warn('No se pudo contar las tarjetas del capítulo antes de borrarlo', error);
      return null;
    }
  }
}
