import { Component, inject, signal } from '@angular/core';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';

import { AppDialogRef, DIALOG_DATA } from '../dialog/dialog.service';
import { CLOSE_LABEL, NEEDS_CONNECTION_MESSAGE } from '../text/connection.copy';
import { CONFIRM_DIALOG_COPY } from './confirm-dialog.copy';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
  readonly confirmLabel: string;
  /** Texto del botón mientras la acción corre ("Borrando…"). */
  readonly pendingLabel: string;
  /** Lo que se muestra dentro si la acción falla; el diálogo sigue abierto para reintentar. */
  readonly errorMessage: string;
  readonly action: () => Promise<void>;
  /**
   * Si la acción no confirma en unos segundos, este aviso y dejar cerrar. Solo para acciones que
   * siguen solas al volver la red (reemplazar al importar); un borrado no lo lleva.
   */
  readonly slowNotice?: string;
}

// Confirmación reutilizable de una acción que no se puede deshacer. Ejecuta la acción ella misma:
// así la política "solo se cierra con éxito" vive en un único sitio. Devuelve `true` si la acción
// terminó bien y `false` si se canceló. Sin red, confirmar no se ofrece (la escritura quedaría
// pendiente sin fin); cancelar siempre.
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<boolean>>(AppDialogRef);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = CONFIRM_DIALOG_COPY;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly closeLabel = CLOSE_LABEL;
  protected readonly savingTooLong = this.dialogRef.savingTooLong;
  protected readonly pending = signal(false);
  protected readonly failed = signal(false);

  protected async confirm(): Promise<void> {
    if (this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failed.set(false);
    this.dialogRef.setPending(true, { releaseWhenSlow: this.data.slowNotice !== undefined });
    try {
      await this.data.action();
      this.dialogRef.close(true);
    } catch (error) {
      this.logger.error(this.data.errorMessage, error);
      this.failed.set(true);
      this.pending.set(false);
      this.dialogRef.setPending(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}
