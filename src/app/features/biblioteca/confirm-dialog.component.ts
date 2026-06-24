import { Component, input, output } from '@angular/core';

/** Diálogo de confirmación para acciones destructivas (espec.: no se borra sin confirmar).
 *  Presentacional: el padre decide el texto y reacciona a `confirm`/`cancel`. Accesible:
 *  role="dialog", aria-modal, cierre con Escape y foco inicial en el botón de confirmar. */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="title()"
        class="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 shadow-xl"
        (keydown.escape)="cancelled.emit()"
      >
        <h2 class="text-lg font-semibold text-text-primary">{{ title() }}</h2>
        @if (message(); as text) {
          <p class="mt-2 text-sm text-text-secondary">{{ text }}</p>
        }
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            (click)="cancelled.emit()"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
          >
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            (click)="confirmed.emit()"
            class="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly confirmLabel = input('Borrar');
  readonly cancelLabel = input('Cancelar');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
