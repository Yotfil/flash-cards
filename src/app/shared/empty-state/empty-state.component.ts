import { Component, input } from '@angular/core';

// Estado vacío reutilizable: un título, un mensaje opcional y, si la pantalla la proyecta, la
// acción que saca al usuario del vacío. Sin acrílico: va sobre el contenido.
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
