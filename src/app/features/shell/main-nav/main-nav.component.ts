import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { IconComponent } from '@shared/icon/icon.component';

import { NAV_DESTINATIONS, SHELL_COPY } from '../shell.copy';

// Navegación principal: barra inferior de acrílico en móvil y columna lateral con la marca en
// escritorio (variantes `md:`, sin JS). El único estado en JS es qué destino está activo, que
// mueve la píldora con la variable CSS `--nav-index` (-1 = ninguno, la píldora se oculta).
@Component({
  selector: 'app-main-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss',
  host: { class: 'safe-bottom shrink-0' },
})
export class MainNavComponent {
  private readonly router = inject(Router);

  protected readonly copy = SHELL_COPY;
  protected readonly destinations = NAV_DESTINATIONS;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Posición del destino activo según el primer segmento de la ruta (rutas hijas incluidas). */
  protected readonly activeIndex = computed(() => {
    const section = this.url().split(/[/?#]/)[1] ?? '';
    return this.destinations.findIndex((destination) => destination.section === section);
  });
}
