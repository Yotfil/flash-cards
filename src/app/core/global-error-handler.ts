import { ErrorHandler, Injectable, inject } from '@angular/core';

import { Logger } from '@domain/ports/logger.port';
import { UnexpectedErrorNotice } from '@services/notices/unexpected-error-notice.service';

// Manejador global de Angular: todo error no capturado termina aquí. Lo enruta por el puerto
// Logger, avisa al usuario con el aviso discreto de fallo no previsto (lo pinta la raíz de la app,
// en cualquier pantalla) y no lo relanza, para que un fallo aislado no tumbe la app. Lo que una
// pantalla captura y explica con su propio mensaje nunca llega aquí: no hay avisos duplicados.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(Logger);
  private readonly notice = inject(UnexpectedErrorNotice);

  handleError(error: unknown): void {
    this.logger.error('Error no controlado', error);
    this.notice.report();
  }
}
