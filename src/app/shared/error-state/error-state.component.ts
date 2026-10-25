import { Component, input, output } from '@angular/core';

import { ERROR_STATE_COPY } from './error-state.copy';

// Estado de error reutilizable: se anuncia como alerta y ofrece "Reintentar", que la pantalla
// conecta a repetir su lectura. Un fallo nunca se pinta como vacío ni como "al día".
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly title = input<string>(ERROR_STATE_COPY.defaultTitle);
  readonly message = input<string>();
  readonly retry = output<void>();

  protected readonly copy = ERROR_STATE_COPY;
}
