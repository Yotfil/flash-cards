// El servidor negó el permiso a una escritura del propio usuario: las reglas solo lo hacen cuando su
// correo ya no está en la lista de acceso. Es permanente (reintentar no sirve): quien lo recibe
// cierra lo que esté haciendo y lleva a "sin acceso". El detalle técnico viaja en `cause`.
export class AccessRevokedError extends Error {
  override readonly name = 'AccessRevokedError';

  constructor(cause?: unknown) {
    super('El servidor negó el permiso: la cuenta ya no tiene acceso.', { cause });
  }
}
