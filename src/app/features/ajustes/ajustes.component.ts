import { Component, type OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { DEFAULT_NEW_CARDS_PER_DAY } from '@domain/models';
import { AuthService } from '@services/auth.service';

/** Estado del guardado del default de nuevas, para dar feedback claro (contrato: errores visibles). */
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Pantalla "Ajustes": sesión y preferencias. Por ahora expone el cierre de sesión y el default
 *  global de tarjetas nuevas por día (la perilla del ritmo de estudio). El resto (tema, día de
 *  estudio…) llega después. Solo pinta y captura eventos; la lógica vive en `AuthService`. */
@Component({
  selector: 'app-ajustes',
  imports: [ReactiveFormsModule],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.scss',
})
export class AjustesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly signingOut = signal(false);

  // Default global de tarjetas nuevas por día.
  protected readonly newCardsControl = new FormControl<number>(DEFAULT_NEW_CARDS_PER_DAY, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(999)],
  });
  protected readonly saveState = signal<SaveState>('idle');

  ngOnInit(): void {
    const current = this.user();
    if (current) {
      this.newCardsControl.setValue(current.settings.defaultNewCardsPerDay);
    }
  }

  protected async saveDefaultNewCards(): Promise<void> {
    if (this.saveState() === 'saving') {
      return;
    }
    if (this.newCardsControl.invalid) {
      this.newCardsControl.markAsTouched();
      return;
    }
    this.saveState.set('saving');
    try {
      await this.authService.updateSettings({
        defaultNewCardsPerDay: Number(this.newCardsControl.value),
      });
      this.saveState.set('saved');
    } catch (error) {
      console.error('No se pudo guardar el default de tarjetas nuevas', error);
      this.saveState.set('error');
    }
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
