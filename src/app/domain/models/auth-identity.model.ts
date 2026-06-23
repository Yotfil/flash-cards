// Identidad que devuelve el proveedor de autenticación (Firebase Auth). Es lo MÍNIMO que
// identifica a quien inició sesión. El perfil completo, con ajustes, es `User` en Firestore.

export interface AuthIdentity {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
