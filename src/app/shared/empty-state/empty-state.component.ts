import { Component, input } from '@angular/core';

/** Estado vacío reutilizable (especificación §9): cuando no hay datos que mostrar, pero no
 *  es un error. Presentacional. La acción opcional (CTA) se proyecta con <ng-content>. */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
