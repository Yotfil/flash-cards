import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { AuthError } from '@domain/models/auth-error';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { IconComponent } from '@shared/icon/icon.component';

import { AUTH_COPY, AUTH_ERROR_MESSAGES } from '../auth.copy';
import { authFormSchema, type AuthFormValue } from '../auth-form.schema';

type LoginMode = 'signIn' | 'register' | 'reset';
type LoginNotice = { kind: 'notAllowlisted' } | { kind: 'authError'; error: AuthError };

// Pantalla única de acceso: iniciar sesión o crear cuenta, con correo o con Google, y pedir el
// enlace para restablecer la contraseña. No decide a dónde ir según lo que devuelve cada método:
// navega cuando el ESTADO de la sesión cambia (con sesión → inicio; sin acceso → `/sin-acceso`),
// porque la ventana de Google puede no avisar nada.
@Component({
  selector: 'app-login-page',
  imports: [FormField, IconComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly logger = inject(Logger);

  protected readonly copy = AUTH_COPY;
  protected readonly mode = signal<LoginMode>('signIn');
  protected readonly modeCopy = computed(() => AUTH_COPY[this.mode()]);
  /** Qué envío está en curso: bloquea los tres botones y elige el texto de progreso. */
  protected readonly pending = signal<'email' | 'google' | null>(null);
  protected readonly notice = signal<LoginNotice | null>(null);
  /** Se pidió el enlace de restablecimiento: la pantalla lo dice sin revelar si hay cuenta. */
  protected readonly resetSent = signal(false);
  protected readonly noticeMessage = computed(() => {
    const notice = this.notice();
    if (notice === null || (notice.kind === 'authError' && notice.error.kind === 'cancelled')) {
      return null;
    }
    return notice.kind === 'notAllowlisted'
      ? AUTH_COPY.notAllowlisted
      : AUTH_ERROR_MESSAGES[notice.error.kind as keyof typeof AUTH_ERROR_MESSAGES];
  });
  protected readonly hasProfileError = computed(() => this.session.state().kind === 'profileError');

  private readonly model = signal<AuthFormValue>({ email: '', password: '', displayName: '' });
  protected readonly authForm = form(this.model, (path) =>
    validateStandardSchema(path, authFormSchema),
  );

  constructor() {
    effect(() => {
      const { kind } = this.session.state();
      if (kind === 'active') {
        void this.router.navigateByUrl('/');
      } else if (kind === 'noAccess') {
        void this.router.navigateByUrl('/sin-acceso');
      }
    });
  }

  /** Entre iniciar sesión y crear cuenta; desde restablecer, de vuelta a iniciar sesión. */
  protected toggleMode(): void {
    this.mode.update((mode) => (mode === 'signIn' ? 'register' : 'signIn'));
    this.clearMessages();
  }

  /** "Olvidé mi contraseña": el modo de restablecer, con el correo ya escrito. */
  protected forgotPassword(): void {
    this.mode.set('reset');
    this.clearMessages();
  }

  /** Un formulario inválido solo marca sus campos; uno en curso ignora el segundo envío. */
  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    if (this.mode() === 'reset') {
      await this.requestPasswordReset();
      return;
    }
    await submit(this.authForm, async () => {
      await this.attempt('email', () => this.submitCredentials());
      return undefined;
    });
  }

  protected async continueWithGoogle(): Promise<void> {
    if (this.pending()) {
      return;
    }
    await this.attempt('google', () => this.session.signInWithGoogle());
  }

  private async submitCredentials(): Promise<void> {
    const { email, password, displayName } = this.model();
    if (this.mode() === 'signIn') {
      await this.session.signInWithEmail({ email, password });
      return;
    }
    const result = await this.session.register({ email, password, displayName });
    if (result === 'notAllowlisted') {
      this.notice.set({ kind: 'notAllowlisted' });
    }
  }

  /**
   * Solo cuenta el correo (el formulario entero exigiría la contraseña): si no vale se marca y no
   * se envía nada.
   */
  private async requestPasswordReset(): Promise<void> {
    const email = this.authForm.email();
    email.markAsTouched();
    if (email.invalid()) {
      return;
    }
    this.resetSent.set(false);
    await this.attempt('email', async () => {
      await this.session.sendPasswordReset(this.model().email);
      this.resetSent.set(true);
    });
  }

  private clearMessages(): void {
    this.notice.set(null);
    this.resetSent.set(false);
  }

  private async attempt(kind: 'email' | 'google', operation: () => Promise<void>): Promise<void> {
    this.pending.set(kind);
    this.notice.set(null);
    try {
      await operation();
    } catch (error) {
      this.showFailure(error);
    } finally {
      this.pending.set(null);
    }
  }

  /** El mensaje es humano; el detalle técnico va al registro, nunca a la pantalla. */
  private showFailure(error: unknown): void {
    const authError = error instanceof AuthError ? error : new AuthError('unknown', error);
    if (authError.kind === 'cancelled') {
      return;
    }
    this.logger.error('No se pudo completar el acceso', authError.cause ?? authError);
    this.notice.set({ kind: 'authError', error: authError });
  }
}
