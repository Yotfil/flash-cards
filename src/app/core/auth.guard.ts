// Guard de rutas: protege las pantallas que requieren sesión. Espera a que la sesión inicial
// se resuelva (evita redirigir mientras Firebase aún determina si hay usuario) y, si no hay
// sesión, manda al login.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenInitialized();
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
