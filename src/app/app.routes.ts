import type { Routes } from '@angular/router';

import { guestOnlyGuard, requireSessionGuard } from '@core/session.guards';
import { studyHandoffGuard } from '@features/repaso/study-handoff.guard';

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
  {
    path: 'repaso',
    canActivate: [requireSessionGuard, studyHandoffGuard],
    loadComponent: () =>
      import('@features/repaso/repaso-page/repaso-page.component').then(
        (module) => module.RepasoPageComponent,
      ),
  },
  { path: 'practicar', canActivate: [requireSessionGuard], loadComponent: pendingPage },

  // Las cuatro secciones y sus rutas hijas, dentro del caparazón.
  {
    path: '',
    canActivate: [requireSessionGuard],
    loadComponent: () =>
      import('@features/shell/shell/shell.component').then((module) => module.ShellComponent),
    children: [
      {
        path: 'hoy',
        loadComponent: () =>
          import('@features/hoy/hoy-page/hoy-page.component').then(
            (module) => module.HoyPageComponent,
          ),
      },
      {
        path: 'biblioteca',
        loadComponent: () =>
          import('@features/biblioteca/biblioteca-page/biblioteca-page.component').then(
            (module) => module.BibliotecaPageComponent,
          ),
      },
      {
        path: 'biblioteca/:bookId',
        loadComponent: () =>
          import('@features/biblioteca/libro-detail-page/libro-detail-page.component').then(
            (module) => module.LibroDetailPageComponent,
          ),
      },
      {
        path: 'biblioteca/:bookId/:chapterId',
        loadComponent: () =>
          import('@features/biblioteca/capitulo-detail-page/capitulo-detail-page.component').then(
            (module) => module.CapituloDetailPageComponent,
          ),
      },
      { path: 'importar', loadComponent: pendingPage },
      { path: 'progreso', loadComponent: pendingPage },
      {
        path: 'ajustes',
        loadComponent: () =>
          import('@features/ajustes/ajustes-page/ajustes-page.component').then(
            (module) => module.AjustesPageComponent,
          ),
      },
    ],
  },

  // A Hoy directamente: redirigir a '' no basta, porque la URL vacía casa con el padre del
  // caparazón (también '') y la redirección de la raíz ya no se vuelve a aplicar.
  { path: '**', redirectTo: 'hoy' },
];
