import type { AuthIdentity } from '../models/auth-identity.model';

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface Registration extends EmailCredentials {
  /** Nombre visible elegido; vacío si el usuario no lo indicó. */
  displayName: string;
}

/** Lo que cuenta la ventana de Google al cerrarse. */
export interface GoogleSignIn {
  /** El proveedor creó la identidad en este acceso (si no lo sabe, `false`). */
  readonly isNewIdentity: boolean;
}

// Puerto del proveedor de identidad. La sesión de la app NO sale del resultado de estos métodos
// sino del observador: el proveedor avisa cada vez que la identidad cambia. Los fallos se lanzan
// como `AuthError` ya clasificado. Callback y no Observable: el dominio no depende de librerías.
export abstract class AuthPort {
  /** Avisa la identidad actual y cada cambio (`null` = sin sesión). Devuelve cómo dejar de oír. */
  abstract observeAuthState(onChange: (identity: AuthIdentity | null) => void): () => void;
  /** Crea la identidad y fija su nombre visible en el proveedor. */
  abstract registerWithEmail(registration: Registration): Promise<void>;
  abstract signInWithEmail(credentials: EmailCredentials): Promise<void>;
  /** Pide al proveedor que envíe el correo con el enlace para crear una contraseña nueva. */
  abstract sendPasswordReset(email: string): Promise<void>;
  /**
   * Abre la ventana emergente de Google; la identidad llega por el observador (a veces antes de
   * que la ventana resuelva). Dice si la identidad es nueva.
   */
  abstract signInWithGoogle(): Promise<GoogleSignIn>;
  abstract signOut(): Promise<void>;
  /** Borra del proveedor la identidad con sesión (solo justo después de iniciarla). */
  abstract deleteCurrentIdentity(): Promise<void>;
}
