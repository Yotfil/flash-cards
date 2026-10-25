import type { User } from './user.model';

// Estado de la sesión: exactamente uno de cinco valores. "Error de perfil" es un valor propio con
// salida (Reintentar o Cerrar sesión), no una combinación imposible de banderas.
export type SessionState =
  /** Todavía no se sabe si hay sesión (antes del primer aviso del proveedor). */
  | { readonly kind: 'resolving' }
  | { readonly kind: 'signedOut' }
  /** Con sesión y el perfil cargado. */
  | { readonly kind: 'active'; readonly user: User }
  /** Identidad conocida pero fuera de la lista de acceso anticipado. */
  | { readonly kind: 'noAccess'; readonly email: string | null }
  /** Identidad autorizada cuyo perfil no se pudo cargar ni crear. */
  | { readonly kind: 'profileError'; readonly cause: unknown };
