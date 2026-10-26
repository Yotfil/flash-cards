import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { SessionService } from '@services/session/session.service';
import { IconComponent } from '@shared/icon/icon.component';

import { AUTH_COPY } from '../auth.copy';

// Pantalla "sin acceso": la identidad existe pero su correo no está en la lista. Explica la
// situación y deja cerrar sesión. Sin guard: navega sola según la sesión (con acceso → inicio;
// sin sesión → `/login`), y no decide nada mientras la sesión inicial se resuelve.
@Component({
  selector: 'app-no-access-page',
  imports: [IconComponent],
  templateUrl: './no-access-page.component.html',
  styleUrl: './no-access-page.component.scss',
})
export class NoAccessPageComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly copy = AUTH_COPY;
  protected readonly email = computed(() => {
    const state = this.session.state();
    return state.kind === 'noAccess' ? state.email : null;
  });
  protected readonly signingOut = signal(false);

  constructor() {
    effect(() => {
      if (!this.session.resolved()) {
        return;
      }
      const { kind } = this.session.state();
      if (kind === 'active') {
        void this.router.navigateByUrl('/');
      } else if (kind === 'signedOut') {
        void this.router.navigateByUrl('/login');
      }
    });
  }

  protected async signOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.session.signOut();
    } finally {
      this.signingOut.set(false);
    }
  }
}
