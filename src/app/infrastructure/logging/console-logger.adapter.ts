import { Injectable } from '@angular/core';

import { Logger } from '@domain/ports/logger.port';

const PREFIX = '[Cadence]';

// Adaptador del puerto Logger sobre la consola del navegador. Único lugar de la app donde
// se llama a `console`.
@Injectable()
export class ConsoleLoggerAdapter extends Logger {
  info(message: string): void {
    console.info(`${PREFIX} ${message}`);
  }

  warn(message: string, cause?: unknown): void {
    if (cause === undefined) {
      console.warn(`${PREFIX} ${message}`);
      return;
    }
    console.warn(`${PREFIX} ${message}`, cause);
  }

  error(message: string, cause?: unknown): void {
    if (cause === undefined) {
      console.error(`${PREFIX} ${message}`);
      return;
    }
    console.error(`${PREFIX} ${message}`, cause);
  }
}
