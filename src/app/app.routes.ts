import { Routes } from '@angular/router';

import { authGuard } from '@core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@features/home/home.component').then((m) => m.HomeComponent),
  },
  { path: '**', redirectTo: '' },
];
