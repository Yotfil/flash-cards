import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/** Pantalla "pendiente de acceso": se muestra cuando alguien inicia sesión correctamente pero su
 *  email no está en la lista de acceso del early access. Queda autenticado en Firebase pero sin
 *  permiso para usar la app (las reglas le niegan toda lectura/escritura). A pantalla completa,
 *  fuera del shell. Solo pinta y captura eventos; la lógica vive en `AuthService`. */
@Component({
  selector: 'app-sin-acceso',
  imports: [],
  templateUrl: './sin-acceso.component.html',
  styleUrl: './sin-acceso.component.scss',
})
export class SinAccesoComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = this.authService.accessDeniedEmail;
  protected readonly signingOut = signal(false);

  constructor() {
    // Mantiene la pantalla coherente con la sesión: si el usuario obtiene acceso (lo agregaron a
    // la lista y vuelve a entrar) va a la app; si cierra sesión, al login. Espera a que la sesión
    // inicial esté resuelta para no redirigir antes de tiempo.
    effect(() => {
      if (!this.authService.sessionResolved()) {
        return;
      }
      if (this.authService.isAuthenticated()) {
        void this.router.navigate(['/']);
      } else if (!this.authService.accessDenied()) {
        void this.router.navigate(['/login']);
      }
    });
  }

  protected async signOut(): Promise<void> {
    if (this.signingOut()) {
      return;
    }
    this.signingOut.set(true);
    try {
      await this.authService.signOut();
      await this.router.navigate(['/login']);
    } finally {
      this.signingOut.set(false);
    }
  }
}
