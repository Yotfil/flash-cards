import { AllowlistRepository } from '@domain/ports/allowlist.repository';

// Fake de la lista de acceso: un conjunto de correos con comparación literal. `failWith` simula
// una consulta que falla (sin red).
export class FakeAllowlistRepository extends AllowlistRepository {
  failWith: unknown = null;
  private readonly emails: Set<string>;

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

  async isAllowed(email: string): Promise<boolean> {
    if (this.failWith !== null) {
      throw this.failWith;
    }
    return this.emails.has(email);
  }
}
