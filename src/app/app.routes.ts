import type { Routes } from '@angular/router';

import { guestOnlyGuard, requireSessionGuard } from '@core/session.guards';

// Mapa de rutas completo desde ya. Cada pantalla carga bajo demanda; mientras su capacidad no
// llega, la ruta pinta la página provisional y cada change sustituye su `loadComponent`. Todo
// exige sesión activa salvo `/login` (solo invitados) y `/sin-acceso` (abierta: su pantalla
// redirige sola según el estado de la sesión).

const pendingPage = () =>
  import('@features/shell/pending-page/pending-page.component').then(
    (module) => module.PendingPageComponent,
  );

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hoy' },

  // Pantallas completas, fuera del caparazón (sin navegación).
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('@features/auth/login-page/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('@features/auth/no-access-page/no-access-page.component').then(
        (module) => module.NoAccessPageComponent,
      ),
  },
  { path: 'repaso', canActivate: [requireSessionGuard], loadComponent: pendingPage },
  { path: 'practicar', canActivate: [requireSessionGuard], loadComponent: pendingPage },

  // Las cuatro secciones y sus rutas hijas, dentro del caparazón.
  {
    path: '',
    canActivate: [requireSessionGuard],
    loadComponent: () =>
      import('@features/shell/shell/shell.component').then((module) => module.ShellComponent),
    children: [
      { path: 'hoy', loadComponent: pendingPage },
      { path: 'biblioteca', loadComponent: pendingPage },
      { path: 'biblioteca/:bookId', loadComponent: pendingPage },
      { path: 'biblioteca/:bookId/:chapterId', loadComponent: pendingPage },
      { path: 'importar', loadComponent: pendingPage },
      { path: 'progreso', loadComponent: pendingPage },
      { path: 'ajustes', loadComponent: pendingPage },
    ],
  },

  // A Hoy directamente: redirigir a '' no basta, porque la URL vacía casa con el padre del
  // caparazón (también '') y la redirección de la raíz ya no se vuelve a aplicar.
  { path: '**', redirectTo: 'hoy' },
];
