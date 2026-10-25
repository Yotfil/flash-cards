import { doc, getDoc, type Firestore } from 'firebase/firestore';

import { AllowlistRepository } from '@domain/ports/allowlist.repository';

// Lista de acceso anticipado: `allowlist/{correo}`. Solo importa si la entrada existe, así que no
// lee campos (no necesita esquema). El correo se usa tal cual: la comparación es literal.
export class FirestoreAllowlistRepository extends AllowlistRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async isAllowed(email: string): Promise<boolean> {
    const snapshot = await getDoc(doc(this.firestore, 'allowlist', email));
    return snapshot.exists();
  }
}
