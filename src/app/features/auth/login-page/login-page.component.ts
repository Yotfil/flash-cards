import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { AuthError } from '@domain/models/auth-error';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { IconComponent } from '@shared/icon/icon.component';

import { AUTH_COPY, AUTH_ERROR_MESSAGES } from '../auth.copy';
import { authFormSchema, type AuthFormValue } from '../auth-form.schema';

type LoginMode = 'signIn' | 'register';
type LoginNotice = { kind: 'notAllowlisted' } | { kind: 'authError'; error: AuthError };

// Pantalla única de acceso: iniciar sesión o crear cuenta, con correo o con Google. No decide a
// dónde ir según lo que devuelve cada método: navega cuando el ESTADO de la sesión cambia (con
// sesión → inicio; sin acceso → `/sin-acceso`), porque la ventana de Google puede no avisar nada.
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

  protected toggleMode(): void {
    this.mode.update((mode) => (mode === 'signIn' ? 'register' : 'signIn'));
    this.notice.set(null);
  }

  /** Un formulario inválido solo marca sus campos; uno en curso ignora el segundo envío. */
  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) {
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
