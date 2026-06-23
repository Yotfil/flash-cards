import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/** Aterrizaje tras iniciar sesión. Placeholder de la Fase 0: la navegación real
 *  (Hoy · Biblioteca · Progreso · Ajustes) y la sesión de repaso llegan más adelante. */
@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;

  protected async signOut(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
