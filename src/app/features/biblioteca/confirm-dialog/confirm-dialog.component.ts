import { Component, input, output } from '@angular/core';

import { ModalComponent } from '@shared/modal/modal.component';

/** Diálogo de confirmación para acciones destructivas (espec.: no se borra sin confirmar).
 *  Presentacional: el padre decide el texto y reacciona a `confirm`/`cancel`. El cascarón
 *  accesible (role="dialog", aria-modal, cierre con Escape) lo pone ModalComponent. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly confirmLabel = input('Borrar');
  /** Texto del botón de confirmar mientras la acción está en vuelo. */
  readonly pendingLabel = input('Borrando…');
  readonly cancelLabel = input('Cancelar');
  /** El padre lo pone en true mientras procesa; bloquea botones y el cierre por Escape. */
  readonly pending = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
