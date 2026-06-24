import { Routes } from '@angular/router';

import { authGuard, guestGuard } from '@core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hoy' },
      {
        path: 'hoy',
        loadComponent: () => import('@features/hoy/hoy.component').then((m) => m.HoyComponent),
      },
      {
        path: 'biblioteca',
        loadComponent: () =>
          import('@features/biblioteca/biblioteca.component').then((m) => m.BibliotecaComponent),
      },
      {
        path: 'biblioteca/:bookId',
        loadComponent: () =>
          import('@features/biblioteca/libro-detail.component').then((m) => m.LibroDetailComponent),
      },
      {
        path: 'progreso',
        loadComponent: () =>
          import('@features/progreso/progreso.component').then((m) => m.ProgresoComponent),
      },
      {
        path: 'ajustes',
        loadComponent: () =>
          import('@features/ajustes/ajustes.component').then((m) => m.AjustesComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
