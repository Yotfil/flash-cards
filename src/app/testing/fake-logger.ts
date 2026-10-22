import { Logger } from '@domain/ports/logger.port';

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  cause?: unknown;
}

// Fake en memoria del puerto Logger: acumula lo registrado para que una prueba lo inspeccione.
export class FakeLogger extends Logger {
  readonly entries: LogEntry[] = [];

  info(message: string): void {
    this.entries.push({ level: 'info', message });
  }

  warn(message: string, cause?: unknown): void {
    this.entries.push(
      cause === undefined ? { level: 'warn', message } : { level: 'warn', message, cause },
    );
  }

  error(message: string, cause?: unknown): void {
    this.entries.push(
      cause === undefined ? { level: 'error', message } : { level: 'error', message, cause },
    );
  }
}
