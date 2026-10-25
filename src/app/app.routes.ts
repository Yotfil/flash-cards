import type { Routes } from '@angular/router';

// Mapa de rutas completo desde ya. Cada pantalla carga bajo demanda; mientras su capacidad no
// llega, la ruta pinta la página provisional y cada change sustituye su `loadComponent`.
// `autenticacion-y-acceso` añade los guards.

const pendingPage = () =>
  import('@features/shell/pending-page/pending-page.component').then(
    (module) => module.PendingPageComponent,
  );

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hoy' },

  // Pantallas completas, fuera del caparazón (sin navegación).
  { path: 'login', loadComponent: pendingPage },
  { path: 'sin-acceso', loadComponent: pendingPage },
  { path: 'repaso', loadComponent: pendingPage },
  { path: 'practicar', loadComponent: pendingPage },

  // Las cuatro secciones y sus rutas hijas, dentro del caparazón.
  {
    path: '',
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
