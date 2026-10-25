// Fallo de acceso clasificado por categoría: la pantalla elige su mensaje por `kind` y el detalle
// técnico viaja en `cause` hacia el registro de errores, nunca a la pantalla.
export type AuthErrorKind =
  | 'invalidCredentials'
  | 'emailInUse'
  | 'offline'
  | 'cancelled'
  | 'unknown';

export class AuthError extends Error {
  override readonly name = 'AuthError';

  constructor(
    readonly kind: AuthErrorKind,
    cause?: unknown,
  ) {
    super(`Fallo de acceso: ${kind}`, { cause });
  }
}
