import { Component, computed, inject, signal, type Signal } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ImportService, type ImportMode } from '@services/import/import.service';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '@shared/confirm-dialog/confirm-dialog.component';
import { AppDialogRef, DIALOG_DATA, DialogService } from '@shared/dialog/dialog.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { ImportPreviewComponent } from '../import-preview/import-preview.component';
import { IMPORTACION_COPY, importLabel, replaceWarning } from '../importacion.copy';

export interface CardImportDialogData {
  readonly bookId: string;
  readonly chapterId: string;
  readonly chapterName: string;
  /** Las tarjetas ya cargadas del capítulo (para contar repetidas y avisar del reemplazo). */
  readonly chapterCards: Signal<Card[]>;
}

// "Importar tarjetas" en un capítulo: pegar el texto, ver qué entra y elegir si se agregan a las
// existentes o las reemplazan. Reemplazar un capítulo con tarjetas pide una confirmación extra.
// Se cierra con `true` solo si importó; si falla, el error se ve dentro y el texto se conserva.
@Component({
  selector: 'app-card-import-dialog',
  imports: [ImportPreviewComponent],
  templateUrl: './card-import-dialog.component.html',
  styleUrl: './card-import-dialog.component.scss',
})
export class CardImportDialogComponent {
  private readonly data = inject<CardImportDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<boolean>>(AppDialogRef);
  private readonly dialogs = inject(DialogService);
  private readonly importService = inject(ImportService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = IMPORTACION_COPY;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly text = signal('');
  protected readonly mode = signal<ImportMode>('append');
  protected readonly preview = computed(() =>
    this.importService.previewForChapter(
      this.text(),
      this.data.chapterName,
      this.data.chapterCards(),
    ),
  );
  private readonly drafts = computed(() =>
    this.preview().parse.package.chapters.flatMap((chapter) => chapter.cards),
  );
  protected readonly importing = signal(false);
  protected readonly failed = signal(false);
  protected readonly canImport = computed(
    () => this.drafts().length > 0 && !this.importing() && this.online(),
  );
  protected readonly importText = computed(() =>
    this.importing() ? this.copy.importing : importLabel(this.drafts().length),
  );

  protected typeText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canImport()) {
      return;
    }
    if (this.mode() === 'replace' && this.data.chapterCards().length > 0) {
      await this.confirmReplace();
      return;
    }
    this.importing.set(true);
    this.failed.set(false);
    this.dialogRef.setPending(true);
    try {
      await this.importService.importIntoChapter(
        this.data.bookId,
        this.data.chapterId,
        this.drafts(),
        this.mode(),
      );
      this.dialogRef.close(true);
    } catch (error) {
      this.logger.error(this.copy.cardsError, error);
      this.failed.set(true);
      this.importing.set(false);
      this.dialogRef.setPending(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  /** La confirmación ejecuta el reemplazo ella misma: si falla, el error se ve en ella. */
  private async confirmReplace(): Promise<void> {
    const drafts = this.drafts();
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.replaceTitle,
      size: 'sm',
      data: {
        title: this.copy.replaceTitle,
        message: replaceWarning(this.data.chapterCards().length),
        confirmLabel: this.copy.replaceConfirm,
        pendingLabel: this.copy.replacing,
        errorMessage: this.copy.cardsError,
        action: () =>
          this.importService.importIntoChapter(
            this.data.bookId,
            this.data.chapterId,
            drafts,
            'replace',
          ),
      },
    });
    if (await ref.closed) {
      this.dialogRef.close(true);
    }
  }
}
