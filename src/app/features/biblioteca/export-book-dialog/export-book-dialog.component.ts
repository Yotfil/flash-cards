import { Component, DestroyRef, computed, inject, resource, signal } from '@angular/core';

import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { ExportService, type ExportPreview } from '@services/export/export.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import {
  COPIED,
  EXPORT_ACTIONS,
  EXPORT_COPY_ERROR,
  EXPORT_ERROR,
  EXPORT_READ_ERROR,
  exportDialogTitle,
  exportSummary,
} from '../biblioteca.copy';

export interface ExportBookDialogData {
  readonly bookId: string;
  readonly bookName: string;
}

/** Cuánto se ve "Copiado" junto al botón. */
const COPIED_VISIBLE_MS = 2000;

// "Exportar «libro»": lee el libro entero del servidor, resume qué se va a exportar y lo entrega
// compartiendo o descargando (nunca las dos) o copiando el texto. Se cierra con `true` solo tras
// compartir o descargar; cerrar la hoja de compartir no es un error y deja el diálogo abierto.
@Component({
  selector: 'app-export-book-dialog',
  imports: [ErrorStateComponent, SkeletonComponent],
  templateUrl: './export-book-dialog.component.html',
  styleUrl: './export-book-dialog.component.scss',
})
export class ExportBookDialogComponent {
  private readonly data = inject<ExportBookDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<boolean>>(AppDialogRef);
  private readonly exportService = inject(ExportService);

  protected readonly title = exportDialogTitle(this.data.bookName);
  protected readonly actions = EXPORT_ACTIONS;
  protected readonly readError = EXPORT_READ_ERROR;
  protected readonly copiedText = COPIED;
  /** Se decide una vez al abrir: nunca se ofrecen compartir y descargar a la vez. */
  protected readonly canShare = inject(FileDeliveryPort).canShareFiles();

  protected readonly preview = resource({
    loader: () => this.exportService.loadPackage(this.data.bookId),
  });
  protected readonly loaded = computed(() =>
    this.preview.hasValue() ? this.preview.value() : undefined,
  );
  protected readonly summary = computed(() => {
    const preview = this.loaded();
    return preview ? exportSummary(preview.chapterCount, preview.cardCount) : '';
  });
  protected readonly readFailed = computed(() => this.preview.status() === 'error');
  protected readonly busy = signal(false);
  protected readonly canDeliver = computed(() => this.loaded() !== undefined && !this.busy());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  /** Compartir o descargar: con éxito cierra; si el usuario cerró la hoja, sigue abierto. */
  protected async deliver(): Promise<void> {
    const preview = this.start();
    if (!preview) {
      return;
    }
    try {
      const result = await this.exportService.deliver(
        preview,
        this.canShare ? 'share' : 'download',
      );
      if (result === 'done') {
        this.dialogRef.close(true);
        return;
      }
    } catch {
      // El servicio ya registró el fallo: aquí solo se avisa dentro del diálogo.
      this.errorMessage.set(EXPORT_ERROR);
    }
    this.finish();
  }

  protected async copyText(): Promise<void> {
    const preview = this.start();
    if (!preview) {
      return;
    }
    try {
      await this.exportService.deliver(preview, 'copy');
      this.showCopied();
    } catch {
      // El servicio ya registró el fallo: aquí solo se avisa dentro del diálogo.
      this.errorMessage.set(EXPORT_COPY_ERROR);
    }
    this.finish();
  }

  protected retry(): void {
    this.preview.reload();
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /** Marca el diálogo ocupado; sin paquete o ya ocupado no hay entrega (un clic, un envío). */
  private start(): ExportPreview | undefined {
    const preview = this.loaded();
    if (!preview || this.busy()) {
      return undefined;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    this.dialogRef.setPending(true);
    return preview;
  }

  private finish(): void {
    this.busy.set(false);
    this.dialogRef.setPending(false);
  }

  private showCopied(): void {
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_VISIBLE_MS);
  }
}
