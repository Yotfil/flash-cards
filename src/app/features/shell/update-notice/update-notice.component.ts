import { Component, inject } from '@angular/core';

import { AppUpdatePort } from '@domain/ports/app-update.port';

import { SHELL_COPY } from '../shell.copy';

// Hay una versión nueva descargada: un aviso discreto que no obliga, con "Recargar" para
// estrenarla. Vive en el caparazón, así que nunca interrumpe el repaso ni las prácticas (pantallas
// completas) y aparece al volver. Sólido: junto al aviso "sin conexión" y la navegación, otra capa
// de vidrio pasaría del máximo de dos (ADR 0003).
@Component({
  selector: 'app-update-notice',
  templateUrl: './update-notice.component.html',
  styleUrl: './update-notice.component.scss',
})
export class UpdateNoticeComponent {
  protected readonly update = inject(AppUpdatePort);
  protected readonly copy = SHELL_COPY;
}
