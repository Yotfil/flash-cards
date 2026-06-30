import { Routes } from '@angular/router';

import { authGuard, guestGuard } from '@core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
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
          import('@features/biblioteca/biblioteca/biblioteca.component').then(
            (m) => m.BibliotecaComponent,
          ),
      },
      {
        path: 'importar',
        loadComponent: () =>
          import('@features/biblioteca/importar-libro/importar-libro.component').then(
            (m) => m.ImportarLibroComponent,
          ),
      },
      {
        path: 'biblioteca/:bookId',
        loadComponent: () =>
          import('@features/biblioteca/libro-detail/libro-detail.component').then(
            (m) => m.LibroDetailComponent,
          ),
      },
      {
        path: 'biblioteca/:bookId/:chapterId',
        loadComponent: () =>
          import('@features/biblioteca/capitulo-detail/capitulo-detail.component').then(
            (m) => m.CapituloDetailComponent,
          ),
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
  {
    // Pantalla completa, fuera del shell: sesión autenticada pero sin acceso (early access).
    path: 'sin-acceso',
    loadComponent: () =>
      import('@features/sin-acceso/sin-acceso.component').then((m) => m.SinAccesoComponent),
  },
  {
    // Pantalla completa, fuera del shell (sin la navegación): la sesión de repaso (§8.6).
    path: 'repaso',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/review/review-session/review-session.component').then(
        (m) => m.ReviewSessionComponent,
      ),
  },
  {
    // Pantalla completa, fuera del shell: el modo Practicar (mini-quiz, Fase 2).
    path: 'practicar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/quiz/practice-session/practice-session.component').then(
        (m) => m.PracticeSessionComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
