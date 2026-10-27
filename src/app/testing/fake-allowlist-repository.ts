import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import type { ReadSource } from '@domain/ports/read-source';

// Fake de la lista de acceso: un conjunto de correos con comparación literal. `failWith` simula
// una consulta al servidor que falla (sin red). Lo guardado en el dispositivo va aparte
// (`seedOnDevice`), como en el real: solo lo que se leyó antes.
export class FakeAllowlistRepository extends AllowlistRepository {
  failWith: unknown = null;
  /** Lecturas de lo guardado (las del servidor no se cuentan). */
  readonly deviceCalls = { isAllowed: 0 };
  private readonly emails: Set<string>;
  private readonly onDevice = new Set<string>();

  constructor(emails: readonly string[] = []) {
    super();
    this.emails = new Set(emails);
  }

  allow(email: string): void {
    this.emails.add(email);
  }

  revoke(email: string): void {
    this.emails.delete(email);
  }

  seedOnDevice(...emails: string[]): void {
    emails.forEach((email) => this.onDevice.add(email));
  }

  async isAllowed(email: string, source: ReadSource = 'server'): Promise<boolean> {
    if (source === 'device') {
      this.deviceCalls.isAllowed++;
      return this.onDevice.has(email);
    }
    if (this.failWith !== null) {
      throw this.failWith;
    }
    return this.emails.has(email);
  }
}
