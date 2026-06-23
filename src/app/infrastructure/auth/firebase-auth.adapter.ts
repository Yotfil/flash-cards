// Adaptador del puerto AuthPort sobre Firebase Auth. ÚNICA pieza que importa 'firebase/auth'.
// Traduce el usuario de Firebase a la `AuthIdentity` del dominio; nada de Firebase escapa de
// esta capa.

import { Injectable, inject } from '@angular/core';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

import { AuthPort, type RegisterWithEmailInput, type SignInWithEmailInput } from '@domain/ports';
import type { AuthIdentity } from '@domain/models';
import { FIREBASE_AUTH } from '@infrastructure/firebase';

function toAuthIdentity(user: FirebaseUser): AuthIdentity {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

@Injectable()
export class FirebaseAuthAdapter extends AuthPort {
  private readonly auth = inject(FIREBASE_AUTH);

  override observeAuthState(onChange: (identity: AuthIdentity | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      onChange(user ? toAuthIdentity(user) : null);
    });
  }

  override async registerWithEmail(input: RegisterWithEmailInput): Promise<AuthIdentity> {
    const credential = await createUserWithEmailAndPassword(this.auth, input.email, input.password);
    // Firebase no fija el nombre al registrar por email: lo establecemos explícitamente.
    await updateProfile(credential.user, { displayName: input.displayName });
    return toAuthIdentity(credential.user);
  }

  override async signInWithEmail(input: SignInWithEmailInput): Promise<AuthIdentity> {
    const credential = await signInWithEmailAndPassword(this.auth, input.email, input.password);
    return toAuthIdentity(credential.user);
  }

  override async signInWithGoogle(): Promise<void> {
    // Popup (no redirección: esta rompe en navegadores con particionado de almacenamiento).
    // El warning de Cross-Origin-Opener-Policy sobre `window.closed` se resuelve con la
    // cabecera del dev-server `same-origin-allow-popups` (ver angular.json). La sesión llega
    // por onAuthStateChanged y el observer carga el perfil.
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  override async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}
