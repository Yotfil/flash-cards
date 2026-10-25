import type { AuthIdentity } from '../models/auth-identity.model';

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface Registration extends EmailCredentials {
  /** Nombre visible elegido; vacío si el usuario no lo indicó. */
  displayName: string;
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
  /** Abre la ventana emergente de Google; la identidad llega por el observador. */
  abstract signInWithGoogle(): Promise<void>;
  abstract signOut(): Promise<void>;
  /** Borra del proveedor la identidad con sesión (solo justo después de iniciarla). */
  abstract deleteCurrentIdentity(): Promise<void>;
}
