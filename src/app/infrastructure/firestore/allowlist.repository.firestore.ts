import { doc, type Firestore } from 'firebase/firestore';

import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import type { ReadSource } from '@domain/ports/read-source';

import { readDocFrom } from './read-from';

// Lista de acceso anticipado: `allowlist/{correo}`. Solo importa si la entrada existe, así que no
// lee campos (no necesita esquema). El correo se usa tal cual: la comparación es literal.
export class FirestoreAllowlistRepository extends AllowlistRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async isAllowed(email: string, source: ReadSource = 'server'): Promise<boolean> {
    const snapshot = await readDocFrom(doc(this.firestore, 'allowlist', email), source);
    return snapshot?.exists() ?? false;
  }
}
