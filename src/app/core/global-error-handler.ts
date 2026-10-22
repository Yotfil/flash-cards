import { ErrorHandler, Injectable, inject } from '@angular/core';

import { Logger } from '@domain/ports/logger.port';

// Manejador global de Angular: todo error no capturado termina aquí. Lo enruta por el puerto
// Logger y no lo relanza, para que un fallo aislado no tumbe la app. El aviso visible al
// usuario lo añade el caparazón (navegacion-y-shell); aquí solo se garantiza que nada se pierda.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(Logger);

  handleError(error: unknown): void {
    this.logger.error('Error no controlado', error);
  }
}
