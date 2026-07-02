import { Component, computed, input, output } from '@angular/core';

/** Preajustes de tamaño del diálogo. `lg` además limita la altura y apila en columna (para
 *  contenidos largos con scroll interno, como la previsualización de importación). */
export type ModalSize = 'sm' | 'md' | 'lg';

const DIALOG_CLASSES: Record<ModalSize, string> = {
  sm: 'w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 shadow-xl',
  md: 'w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-xl',
  lg: 'flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface-raised p-6 shadow-xl',
};

/** Cascarón común de los diálogos modales: backdrop + contenedor accesible (role="dialog",
 *  aria-modal, aria-label, aria-busy) + cierre con Escape (bloqueado mientras `pending`).
 *  El contenido (título, formulario, botones) lo pone cada diálogo vía ng-content; este
 *  componente no sabe nada de formularios. Cerrar = el padre reacciona a `dismissed`. */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  /** Nombre accesible del diálogo (aria-label). */
  readonly label = input.required<string>();
  /** True mientras el padre persiste: bloquea el cierre con Escape y marca aria-busy. */
  readonly pending = input(false);
  readonly size = input<ModalSize>('md');
  /** El usuario pidió cerrar (Escape). El padre decide (normalmente, cancelar). */
  readonly dismissed = output<void>();

  protected readonly dialogClasses = computed(() => DIALOG_CLASSES[this.size()]);

  protected onEscape(): void {
    if (!this.pending()) {
      this.dismissed.emit();
    }
  }
}
