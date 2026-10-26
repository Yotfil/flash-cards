import type { AuthIdentity } from '@domain/models/auth-identity.model';
import {
  AuthPort,
  type EmailCredentials,
  type GoogleSignIn,
  type Registration,
} from '@domain/ports/auth.port';

type FailableMethod =
  | 'registerWithEmail'
  | 'signInWithEmail'
  | 'signInWithGoogle'
  | 'signOut'
  | 'deleteCurrentIdentity';

// Fake del proveedor de identidad: la prueba decide qué identidad avisa el observador (`emit`),
// qué método falla (`failWith`) y si la ventana de Google dice que la cuenta es nueva
// (`googleIdentityIsNew`). Como el proveedor real, cerrar sesión y borrar la identidad actual
// avisan `null` al observador.
export class FakeAuthPort extends AuthPort {
  readonly registrations: Registration[] = [];
  readonly emailSignIns: EmailCredentials[] = [];
  googleSignIns = 0;
  signOuts = 0;
  deletions = 0;
  googleIdentityIsNew = true;
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};

  private listener: ((identity: AuthIdentity | null) => void) | null = null;
  private gate: Promise<void> | null = null;

  /** Deja colgadas las llamadas siguientes (como un proveedor lento) hasta soltar. */
  hold(): () => void {
    let release!: () => void;
    this.gate = new Promise((resolve) => (release = resolve));
    return () => {
      this.gate = null;
      release();
    };
  }

  observeAuthState(onChange: (identity: AuthIdentity | null) => void): () => void {
    this.listener = onChange;
    return () => {
      this.listener = null;
    };
  }

  /** Simula el aviso del proveedor con una identidad (o `null` = sin sesión). */
  emit(identity: AuthIdentity | null): void {
    this.listener?.(identity);
  }

  async registerWithEmail(registration: Registration): Promise<void> {
    this.registrations.push(registration);
    await this.gate;
    this.throwIfFailing('registerWithEmail');
  }

  async signInWithEmail(credentials: EmailCredentials): Promise<void> {
    this.emailSignIns.push(credentials);
    await this.gate;
    this.throwIfFailing('signInWithEmail');
  }

  async signInWithGoogle(): Promise<GoogleSignIn> {
    this.googleSignIns++;
    await this.gate;
    this.throwIfFailing('signInWithGoogle');
    return { isNewIdentity: this.googleIdentityIsNew };
  }

  async signOut(): Promise<void> {
    this.signOuts++;
    this.throwIfFailing('signOut');
    this.emit(null);
  }

  async deleteCurrentIdentity(): Promise<void> {
    this.deletions++;
    this.throwIfFailing('deleteCurrentIdentity');
    this.emit(null);
  }

  private throwIfFailing(method: FailableMethod): void {
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

/** Identidad de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function anIdentity(overrides: Partial<AuthIdentity> = {}): AuthIdentity {
  return {
    uid: 'u1',
    email: 'ada@ejemplo.com',
    displayName: null,
    photoURL: null,
    ...overrides,
  };
}
