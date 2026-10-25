import { AuthError, type AuthErrorKind } from '@domain/models/auth-error';

// Traduce los códigos de error del proveedor de identidad a las categorías que la pantalla sabe
// explicar. Lo que no se reconoce cae en `unknown`: mensaje genérico y el detalle al registro.
const KIND_BY_CODE: Readonly<Record<string, AuthErrorKind>> = {
  'auth/invalid-credential': 'invalidCredentials',
  'auth/wrong-password': 'invalidCredentials',
  'auth/user-not-found': 'invalidCredentials',
  'auth/invalid-email': 'invalidCredentials',
  'auth/email-already-in-use': 'emailInUse',
  'auth/network-request-failed': 'offline',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
};

export function toAuthError(code: string, cause: unknown): AuthError {
  return new AuthError(KIND_BY_CODE[code] ?? 'unknown', cause);
}
