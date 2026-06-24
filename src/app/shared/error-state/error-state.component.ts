import { Component, input, output } from '@angular/core';

/** Estado de error reutilizable (especificación §9): algo falló y se comunica con voz
 *  serena, ofreciendo reintentar. El padre escucha `retry` para volver a cargar. */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly title = input('Algo salió mal');
  readonly message = input<string>();
  readonly retry = output<void>();
}
