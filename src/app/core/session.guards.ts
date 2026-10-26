import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { SessionService } from '@services/session/session.service';

// Guards de sesión. Ambos esperan a que la sesión inicial se resuelva: decidir antes mandaría a
// `/login` a quien sí tiene una sesión guardada en el dispositivo.

/** Rutas de la app: solo con sesión activa. */
export const requireSessionGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.whenResolved();
  const { kind } = session.state();
  if (kind === 'active') {
    return true;
  }
  return router.parseUrl(kind === 'noAccess' ? '/sin-acceso' : '/login');
};

/** `/login`: solo para invitados. El error de perfil se muestra ahí, con su salida. */
export const guestOnlyGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  await session.whenResolved();
  const { kind } = session.state();
  if (kind === 'active') {
    return router.parseUrl('/');
  }
  if (kind === 'noAccess') {
    return router.parseUrl('/sin-acceso');
  }
  return true;
};
