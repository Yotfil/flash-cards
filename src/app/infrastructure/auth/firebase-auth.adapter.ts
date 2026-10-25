import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

import type { AuthIdentity } from '@domain/models/auth-identity.model';
import { AuthPort, type EmailCredentials, type Registration } from '@domain/ports/auth.port';

import { toAuthError } from './auth-error.mapper';

// Adaptador del proveedor de identidad sobre Firebase Auth. Traduce el `User` de Firebase a una
// identidad propia y cada fallo a un `AuthError` clasificado. Google va por ventana emergente (la
// redirección se rompe con el particionado de almacenamiento de los navegadores); la cabecera
// COOP `same-origin-allow-popups` permite que la ventana devuelva el resultado.
export class FirebaseAuthAdapter extends AuthPort {
  constructor(private readonly auth: Auth) {
    super();
  }

  observeAuthState(onChange: (identity: AuthIdentity | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => onChange(user ? toIdentity(user) : null));
  }

  async registerWithEmail({ email, password, displayName }: Registration): Promise<void> {
    await this.translateErrors(async () => {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(credential.user, { displayName });
    });
  }

  async signInWithEmail({ email, password }: EmailCredentials): Promise<void> {
    await this.translateErrors(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  async signInWithGoogle(): Promise<void> {
    await this.translateErrors(() => signInWithPopup(this.auth, new GoogleAuthProvider()));
  }

  async signOut(): Promise<void> {
    await this.translateErrors(() => signOut(this.auth));
  }

  async deleteCurrentIdentity(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await this.translateErrors(() => deleteUser(user));
    }
  }

  private async translateErrors(operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      throw toAuthError(error instanceof FirebaseError ? error.code : '', error);
    }
  }
}

function toIdentity(user: FirebaseUser): AuthIdentity {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}
