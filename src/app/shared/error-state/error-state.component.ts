import { Component, input, output } from '@angular/core';

/** Estado de error reutilizable (especificación §9): algo falló y se comunica con voz
 *  serena, ofreciendo reintentar. El padre escucha `retry` para volver a cargar. */
@Component({
  selector: 'app-error-state',
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      role="alert"
    >
      <h2 class="text-lg font-medium text-text-primary">{{ title() }}</h2>
      @if (message(); as text) {
        <p class="max-w-sm text-sm text-text-secondary">{{ text }}</p>
      }
      <button
        type="button"
        (click)="retry.emit()"
        class="mt-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
      >
        Reintentar
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input('Algo salió mal');
  readonly message = input<string>();
  readonly retry = output<void>();
}
