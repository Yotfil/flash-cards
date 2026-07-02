// Helper de sesión compartido por los servicios de negocio. Antes cada servicio copiaba su propio
// `requireUid()`/`requireUser()`; esta es la fuente única de ese chequeo. Convierte el "no debería
// pasar" (operar sin sesión tras el guard de rutas) en un error explícito (contrato: errores visibles).

import type { User } from '@domain/models';

/** El usuario de la sesión actual; sin sesión es un error explícito. Uso típico:
 *  `requireSessionUser(this.authService.currentUser())`. */
export function requireSessionUser(user: User | null | undefined): User {
  if (!user) {
    throw new Error('No hay una sesión activa.');
  }
  return user;
}

/** Atajo de {@link requireSessionUser} para cuando solo se necesita el uid. */
export function requireSessionUid(user: User | null | undefined): string {
  return requireSessionUser(user).id;
}
