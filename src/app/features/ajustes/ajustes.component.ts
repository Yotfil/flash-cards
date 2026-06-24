import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/** Pantalla "Ajustes": sesión y preferencias. Placeholder de Fase 0 con la info de la sesión
 *  y el cierre de sesión; el resto de ajustes (tema, día de estudio…) llega después. */
@Component({
  selector: 'app-ajustes',
  imports: [],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.scss',
})
export class AjustesComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly signingOut = signal(false);

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
