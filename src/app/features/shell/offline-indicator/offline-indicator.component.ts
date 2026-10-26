import { Component, inject } from '@angular/core';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { IconComponent } from '@shared/icon/icon.component';

import { SHELL_COPY } from '../shell.copy';

// Sin conexión es un modo, no un error: mientras no hay red, un aviso discreto (segunda capa de
// vidrio permitida junto a la navegación, estática) explica que el repaso sigue y se sincroniza.
@Component({
  selector: 'app-offline-indicator',
  imports: [IconComponent],
  templateUrl: './offline-indicator.component.html',
  styleUrl: './offline-indicator.component.scss',
})
export class OfflineIndicatorComponent {
  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = SHELL_COPY;
}
