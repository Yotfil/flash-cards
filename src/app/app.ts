import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { UnexpectedErrorNoticeComponent } from '@features/shell/unexpected-error-notice/unexpected-error-notice.component';
import { SessionService } from '@services/session/session.service';

/** La pantalla a la que lleva quedar sin acceso. */
const NO_ACCESS_URL = '/sin-acceso';

// Componente raíz: aloja el router (el caparazón y las pantallas completas son rutas) y el aviso de
// fallo no previsto, que así se ve en cualquier pantalla, también en el repaso y la práctica. Si la
// sesión queda sin acceso con la app abierta (la confirmación del servidor llega tarde, o un
// guardado se rechaza por permisos), lleva a la pantalla de sin acceso desde donde esté.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UnexpectedErrorNoticeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const { kind } = this.session.state();
      if (kind === 'noAccess' && !this.router.url.startsWith(NO_ACCESS_URL)) {
        // Reemplaza: detrás no queda una pantalla que ya no se puede usar.
        void this.router.navigateByUrl(NO_ACCESS_URL, { replaceUrl: true });
      }
    });
  }
}
