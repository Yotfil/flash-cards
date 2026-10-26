import { Component, inject } from '@angular/core';

import { UnexpectedErrorNotice } from '@services/notices/unexpected-error-notice.service';
import { IconComponent } from '@shared/icon/icon.component';

import { SHELL_COPY } from '../shell.copy';

// El aviso de un fallo que ninguna pantalla previó: discreto, abajo y por encima de la navegación,
// en cualquier pantalla (vive en la raíz de la app). Sólido, no acrílico: puede quedar sobre la
// navegación o sobre algo que anima (ADR 0003). Se queda hasta cerrarlo: uno que desaparece solo
// puede no leerse, y como no se apila, no estorba.
@Component({
  selector: 'app-unexpected-error-notice',
  imports: [IconComponent],
  templateUrl: './unexpected-error-notice.component.html',
  styleUrl: './unexpected-error-notice.component.scss',
})
export class UnexpectedErrorNoticeComponent {
  protected readonly notice = inject(UnexpectedErrorNotice);
  protected readonly copy = SHELL_COPY;
}
