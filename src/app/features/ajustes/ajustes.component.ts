import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/** Pantalla "Ajustes": sesión y preferencias. Placeholder de Fase 0 con la info de la sesión
 *  y el cierre de sesión; el resto de ajustes (tema, día de estudio…) llega después. */
@Component({
  selector: 'app-ajustes',
  imports: [],
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <h1 class="text-2xl font-semibold text-text-primary">Ajustes</h1>

      @if (user(); as currentUser) {
        <div class="mt-4 rounded-2xl border border-border bg-surface-raised p-5">
          <p class="text-sm text-text-secondary">Sesión iniciada como</p>
          <p class="font-medium text-text-primary">{{ currentUser.displayName }}</p>
          <p class="text-sm text-text-muted">{{ currentUser.email }}</p>
        </div>
      }

      <button
        type="button"
        (click)="signOut()"
        class="mt-4 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
      >
        Cerrar sesión
      </button>

      <p class="mt-8 text-sm text-text-muted">
        Más ajustes (tema claro/oscuro, día de estudio, importación) llegarán pronto.
      </p>
    </section>
  `,
})
export class AjustesComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;

  protected async signOut(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
