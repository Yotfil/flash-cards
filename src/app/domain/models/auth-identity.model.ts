// Identidad que entrega el proveedor de autenticación, ya traducida a un modelo propio: el resto
// de la app no conoce el tipo `User` de Firebase.
export interface AuthIdentity {
  uid: string;
  /** Exactamente como lo entrega el proveedor; `null` si la identidad no tiene correo. */
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
