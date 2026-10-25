import { Component, computed, inject, signal, type Signal } from '@angular/core';

import type { Card, CardContentDraft, CardFace } from '@domain/models/card.model';
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
import {
  CARD_WORDING,
  IMPORTACION_COPY,
  importLabel,
  replaceWarning,
  type PreviewWording,
} from '../importacion.copy';

/** Importar a un capítulo: agrega o reemplaza sus tarjetas. */
export interface ChapterImportTarget {
  readonly kind: 'chapter';
  readonly bookId: string;
  readonly chapterId: string;
  readonly chapterName: string;
  /** Las tarjetas ya cargadas del capítulo (para contar repetidas y avisar del reemplazo). */
  readonly chapterCards: Signal<Card[]>;
}

/** Importar a un paquete de práctica: solo agrega, hasta lo que cabe, y lo guarda quien abre. */
export interface PackageImportTarget {
  readonly kind: 'package';
  readonly packageName: string;
  readonly existing: Signal<readonly CardFace[]>;
  /** Cuántos caben todavía: se importan las primeras válidas hasta ese número. */
  readonly remaining: number;
  readonly save: (drafts: readonly CardContentDraft[]) => Promise<void>;
  /** Los textos que nombran el destino (la importación no conoce los paquetes). */
  readonly texts: {
    readonly title: string;
    readonly remaining: string;
    readonly error: string;
    readonly wording: PreviewWording;
  };
}

export interface CardImportDialogData {
  readonly target: ChapterImportTarget | PackageImportTarget;
}

// "Importar tarjetas" en un capítulo: pegar el texto, ver qué entra y elegir si se agregan a las
// existentes o las reemplazan. Reemplazar un capítulo con tarjetas pide una confirmación extra.
// En un paquete solo se agrega, hasta lo que cabe. Se cierra con `true` solo si importó; si
// falla, el error se ve dentro y el texto se conserva.
@Component({
  selector: 'app-card-import-dialog',
  imports: [ImportPreviewComponent],
  templateUrl: './card-import-dialog.component.html',
  styleUrl: './card-import-dialog.component.scss',
})
export class CardImportDialogComponent {
  private readonly target = inject<CardImportDialogData>(DIALOG_DATA).target;
  private readonly dialogRef = inject<AppDialogRef<boolean>>(AppDialogRef);
  private readonly dialogs = inject(DialogService);
  private readonly importService = inject(ImportService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = IMPORTACION_COPY;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly text = signal('');
  protected readonly mode = signal<ImportMode>('append');
  protected readonly isPackage = this.target.kind === 'package';
  protected readonly title =
    this.target.kind === 'package' ? this.target.texts.title : this.copy.cardsTitle;
  protected readonly wording =
    this.target.kind === 'package' ? this.target.texts.wording : CARD_WORDING;
  protected readonly errorMessage =
    this.target.kind === 'package' ? this.target.texts.error : this.copy.cardsError;
  protected readonly preview = computed(() =>
    this.importService.previewForChapter(this.text(), this.destinationName(), this.existing()),
  );
  private readonly drafts = computed(() =>
    this.preview().parse.package.chapters.flatMap((chapter) => chapter.cards),
  );
  /** Lo que entra de verdad: en un paquete, las primeras válidas hasta lo que cabe. */
  private readonly importable = computed(() =>
    this.target.kind === 'package' ? this.drafts().slice(0, this.target.remaining) : this.drafts(),
  );
  protected readonly overCapacity = computed(
    () => this.target.kind === 'package' && this.drafts().length > this.target.remaining,
  );
  protected readonly remainingText =
    this.target.kind === 'package' ? this.target.texts.remaining : '';
  protected readonly importing = signal(false);
  protected readonly failed = signal(false);
  protected readonly canImport = computed(
    () => this.importable().length > 0 && !this.importing() && this.online(),
  );
  protected readonly importText = computed(() =>
    this.importing() ? this.copy.importing : importLabel(this.importable().length),
  );

  protected typeText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canImport()) {
      return;
    }
    const target = this.target;
    if (
      target.kind === 'chapter' &&
      this.mode() === 'replace' &&
      target.chapterCards().length > 0
    ) {
      await this.confirmReplace(target);
      return;
    }
    this.importing.set(true);
    this.failed.set(false);
    this.dialogRef.setPending(true);
    try {
      if (target.kind === 'package') {
        await target.save(this.importable());
      } else {
        await this.importService.importIntoChapter(
          target.bookId,
          target.chapterId,
          this.importable(),
          this.mode(),
        );
      }
      this.dialogRef.close(true);
    } catch (error) {
      this.logger.error(this.errorMessage, error);
      this.failed.set(true);
      this.importing.set(false);
      this.dialogRef.setPending(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private destinationName(): string {
    return this.target.kind === 'package' ? this.target.packageName : this.target.chapterName;
  }

  private existing(): readonly CardFace[] {
    return this.target.kind === 'package' ? this.target.existing() : this.target.chapterCards();
  }

  /** La confirmación ejecuta el reemplazo ella misma: si falla, el error se ve en ella. */
  private async confirmReplace(target: ChapterImportTarget): Promise<void> {
    const drafts = this.drafts();
    const ref = this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.replaceTitle,
      size: 'sm',
      data: {
        title: this.copy.replaceTitle,
        message: replaceWarning(target.chapterCards().length),
        confirmLabel: this.copy.replaceConfirm,
        pendingLabel: this.copy.replacing,
        errorMessage: this.copy.cardsError,
        action: () =>
          this.importService.importIntoChapter(target.bookId, target.chapterId, drafts, 'replace'),
      },
    });
    if (await ref.closed) {
      this.dialogRef.close(true);
    }
  }
}
