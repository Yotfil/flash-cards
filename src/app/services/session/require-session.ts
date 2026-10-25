import type { User } from '@domain/models/user.model';

// Las operaciones de negocio necesitan saber de quién son los datos. Si llegan sin sesión es un
// error de programación (las rutas están protegidas), así que se lanza de forma explícita.

const NO_SESSION = 'No hay una sesión activa.';

export function requireSessionUser(user: User | null | undefined): User {
  if (!user) {
    throw new Error(NO_SESSION);
  }
  return user;
}

export function requireSessionUid(user: User | null | undefined): string {
  return requireSessionUser(user).id;
}
