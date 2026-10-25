import { Component, computed, input, output } from '@angular/core';

import { SESSION_TOP_BAR_COPY } from './session-top-bar.copy';

// La barra discreta de una sesión a pantalla completa (repaso, práctica): progreso, el texto que
// elija la pantalla ("Quedan 5", "4 / 10") y "Salir". Acrílico tenue y estático.
@Component({
  selector: 'app-session-top-bar',
  templateUrl: './session-top-bar.component.html',
  styleUrl: './session-top-bar.component.scss',
})
export class SessionTopBarComponent {
  /** Cuánto se avanzó, de 0 a 1. */
  readonly progress = input.required<number>();
  readonly label = input.required<string>();
  readonly exitLabel = input<string>(SESSION_TOP_BAR_COPY.exit);
  readonly exit = output<void>();

  protected readonly copy = SESSION_TOP_BAR_COPY;
  protected readonly percent = computed(() => Math.round(this.progress() * 100));
}
