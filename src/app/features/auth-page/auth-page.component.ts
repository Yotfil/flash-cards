import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/** Pantalla única de acceso: alterna entre iniciar sesión y crear cuenta. Solo pinta y
 *  captura eventos; la lógica vive en AuthService. */
@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly mode = signal<'signIn' | 'register'>('signIn');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // La sesión puede llegar por el observer y no por la promesa de cada método (p. ej. el
    // popup de Google, que por COOP no siempre resuelve su promesa). Navegamos de forma
    // reactiva en cuanto haya sesión: así no dependemos de que cada flujo "devuelva" el éxito.
    effect(() => {
      if (this.authService.isAuthenticated()) {
        void this.router.navigate(['/']);
      }
    });
  }

  protected toggleMode(): void {
    this.mode.update((current) => (current === 'signIn' ? 'register' : 'signIn'));
    this.errorMessage.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, displayName } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      if (this.mode() === 'register') {
        const name = displayName.trim() || (email.split('@')[0] ?? email);
        await this.authService.registerWithEmail(email, password, name);
      } else {
        await this.authService.signInWithEmail(email, password);
      }
      // La navegación la dispara el effect en cuanto la sesión queda activa.
    } catch (error) {
      this.errorMessage.set(this.toMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    this.submitting.set(true);
    try {
      // El popup puede no resolver su promesa por COOP; el effect navega al activarse la sesión.
      await this.authService.signInWithGoogle();
    } catch (error) {
      this.errorMessage.set(this.toMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private toMessage(error: unknown): string {
    // Voz del producto: mensaje humano y sereno; el detalle técnico va a consola para depurar.
    console.error('Error de autenticación', error);
    return 'No pudimos completar la acción. Revisa tus datos e inténtalo de nuevo.';
  }
}
