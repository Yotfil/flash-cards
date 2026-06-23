// Puerto de autenticación: el contrato que el dominio necesita para registrar, iniciar y
// cerrar sesión, SIN saber que detrás está Firebase. La implementación vive en
// `infrastructure/auth`. Es una clase abstracta para servir además como token de DI de
// Angular (clase pura, sin importar Angular).

import type { AuthIdentity } from '../models';

export interface RegisterWithEmailInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInWithEmailInput {
  email: string;
  password: string;
}

export abstract class AuthPort {
  /**
   * Observa la sesión: invoca `onChange` con la identidad actual (o null si no hay sesión)
   * en el arranque y en cada cambio. Devuelve una función para dejar de observar.
   * Se usa callback (no Observable) para que el dominio no dependa de ninguna librería.
   */
  abstract observeAuthState(onChange: (identity: AuthIdentity | null) => void): () => void;

  abstract registerWithEmail(input: RegisterWithEmailInput): Promise<AuthIdentity>;
  abstract signInWithEmail(input: SignInWithEmailInput): Promise<AuthIdentity>;
  /**
   * Inicia sesión con Google. No devuelve la identidad: la sesión se entrega después por
   * `observeAuthState`.
   */
  abstract signInWithGoogle(): Promise<void>;
  abstract signOut(): Promise<void>;
}
