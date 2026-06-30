// Adaptador Firestore del puerto AllowlistRepository. Comprueba la existencia del documento
// `allowlist/{email}` (lista de acceso del early access). NO lee campos del documento: solo su
// existencia, así que no hay datos externos que validar (no aplica Zod aquí).
//
// El email se usa TAL CUAL como id del documento, igual que lo hacen las reglas con
// `request.auth.token.email`, para que la decisión de la app y la de las reglas coincidan.
// (Al administrar la lista en la consola, agrega el email exactamente como inicia sesión el
// usuario; los correos de Google vienen en minúsculas.)

import { Injectable, inject } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';

import { AllowlistRepository } from '@domain/ports';
import { FIRESTORE } from '@infrastructure/firebase';

const ALLOWLIST_COLLECTION = 'allowlist';

@Injectable()
export class FirestoreAllowlistRepository extends AllowlistRepository {
  private readonly firestore = inject(FIRESTORE);

  override async isAllowed(email: string): Promise<boolean> {
    const snapshot = await getDoc(doc(this.firestore, ALLOWLIST_COLLECTION, email));
    return snapshot.exists();
  }
}
