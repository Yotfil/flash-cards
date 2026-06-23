import { Component, input } from '@angular/core';

/** Estado vacío reutilizable (especificación §9): cuando no hay datos que mostrar, pero no
 *  es un error. Presentacional. La acción opcional (CTA) se proyecta con <ng-content>. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h2 class="text-lg font-medium text-text-primary">{{ title() }}</h2>
      @if (message(); as text) {
        <p class="max-w-sm text-sm text-text-secondary">{{ text }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
