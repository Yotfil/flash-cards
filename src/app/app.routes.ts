import type { Routes } from '@angular/router';

import { guestOnlyGuard, requireSessionGuard } from '@core/session.guards';
import { practiceHandoffGuard } from '@features/practica/practice-handoff.guard';
import { practiceAiHandoffGuard } from '@features/practica-ia/practice-ai-handoff.guard';
import { studyHandoffGuard } from '@features/repaso/study-handoff.guard';

// Mapa de rutas completo. Cada pantalla carga bajo demanda. Todo exige sesión activa salvo
// `/login` (solo invitados) y `/sin-acceso` (abierta: su pantalla redirige sola según el estado de
// la sesión). Repaso y práctica, a pantalla completa, solo se abren con lo que se les entregó.

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
  {
    path: 'practica-ia',
    canActivate: [requireSessionGuard, practiceAiHandoffGuard],
    loadComponent: () =>
      import('@features/practica-ia/practice-ai-page/practice-ai-page.component').then(
        (module) => module.PracticeAiPageComponent,
      ),
  },
  {
    path: 'practicar',
    canActivate: [requireSessionGuard, practiceHandoffGuard],
    loadComponent: () =>
      import('@features/practica/practica-page/practica-page.component').then(
        (module) => module.PracticaPageComponent,
      ),
  },

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
      // Los paquetes de práctica viven en la Biblioteca ("completados" antes que el id).
      {
        path: 'paquetes/completados',
        loadComponent: () =>
          import('@features/practica-ia/completed-packages-page/completed-packages-page.component').then(
            (module) => module.CompletedPackagesPageComponent,
          ),
      },
      {
        path: 'paquetes/:id',
        loadComponent: () =>
          import('@features/practica-ia/package-detail-page/package-detail-page.component').then(
            (module) => module.PackageDetailPageComponent,
          ),
      },
      {
        path: 'importar',
        loadComponent: () =>
          import('@features/importacion/importar-libro-page/importar-libro-page.component').then(
            (module) => module.ImportarLibroPageComponent,
          ),
      },
      {
        path: 'progreso',
        loadComponent: () =>
          import('@features/progreso/progreso-page/progreso-page.component').then(
            (module) => module.ProgresoPageComponent,
          ),
      },
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
