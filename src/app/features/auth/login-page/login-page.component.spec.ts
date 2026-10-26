import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthError } from '@domain/models/auth-error';
import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import { AuthPort } from '@domain/ports/auth.port';
import { Logger } from '@domain/ports/logger.port';
import { UserRepository } from '@domain/ports/user.repository';
import { FakeAllowlistRepository } from '@testing/fake-allowlist-repository';
import { FakeAuthPort, anIdentity } from '@testing/fake-auth-port';
import { FakeLogger } from '@testing/fake-logger';
import { FakeUserRepository, aUser } from '@testing/fake-user-repository';

import { LoginPageComponent } from './login-page.component';

const settle = () => new Promise((resolve) => setTimeout(resolve));

async function render() {
  const authPort = new FakeAuthPort();
  const allowlist = new FakeAllowlistRepository(['ada@ejemplo.com']);
  const logger = new FakeLogger();
  const users = new FakeUserRepository();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthPort, useValue: authPort },
      { provide: UserRepository, useValue: users },
      { provide: AllowlistRepository, useValue: allowlist },
      { provide: Logger, useValue: logger },
    ],
  });
  const fixture = TestBed.createComponent(LoginPageComponent);
  authPort.emit(null);
  await settle();
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;

  const query = <T extends Element>(selector: string) => element.querySelector<T>(selector);
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const type = (selector: string, value: string) => {
    const input = query<HTMLInputElement>(selector);
    if (!input) throw new Error(`No existe ${selector}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = () => query<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
  const update = async () => {
    await settle();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return {
    fixture,
    element,
    authPort,
    allowlist,
    users,
    logger,
    query,
    button,
    type,
    submit,
    update,
  };
}

describe('LoginPageComponent · formulario', () => {
  it('arranca en "Iniciar sesión" con correo, contraseña, Google y el enlace para crear cuenta', async () => {
    const { query, button, element } = await render();

    expect(query('h1')?.textContent?.trim()).toBe('Iniciar sesión');
    expect(query('input#email')).not.toBeNull();
    expect(query('input#password')).not.toBeNull();
    expect(query('input#displayName')).toBeNull();
    expect(button('Continuar con Google')).toBeDefined();
    expect(button('Crear una')).toBeDefined();
    expect(element.textContent).not.toContain('acceso anticipado');
  });

  it('"Crear una" pasa a crear cuenta con el nombre, la nota de acceso anticipado y sin alertas', async () => {
    const { query, button, type, submit, update, element, authPort } = await render();
    authPort.failWith.signInWithEmail = new AuthError('invalidCredentials');
    type('#email', 'nuevo@ejemplo.com');
    type('#password', 'secreta');
    submit();
    await update();
    expect(query('[role="alert"]')).not.toBeNull();

    button('Crear una')?.click();
    await update();

    expect(query('h1')?.textContent?.trim()).toBe('Crear cuenta');
    expect(query('label[for="displayName"]')?.textContent?.trim()).toBe('Nombre');
    expect(element.textContent).toContain(
      'Cadence está en acceso anticipado: solo puedes crear cuenta si tu correo está en la lista.',
    );
    expect(query('[role="alert"]')).toBeNull();
  });

  it('con datos inválidos marca los campos y no contacta al proveedor', async () => {
    const { query, type, submit, update, authPort } = await render();
    type('#email', 'correo-sin-arroba');
    type('#password', '1234');

    submit();
    await update();

    expect(query('#email')?.getAttribute('aria-invalid')).toBe('true');
    expect(query('#password')?.getAttribute('aria-invalid')).toBe('true');
    expect(authPort.emailSignIns).toEqual([]);
  });

  it('un doble envío solo se procesa una vez y bloquea los tres controles mientras tanto', async () => {
    const { button, type, submit, update, authPort, query } = await render();
    const release = authPort.hold();
    type('#email', 'ada@ejemplo.com');
    type('#password', 'secreta');

    submit();
    submit();
    await update();

    expect(authPort.emailSignIns).toHaveLength(1);
    const main = query<HTMLButtonElement>('button[type="submit"]');
    expect(main?.textContent?.trim()).toBe('Iniciando sesión…');
    expect(main?.disabled).toBe(true);
    expect(button('Continuar con Google')?.disabled).toBe(true);
    expect(button('Crear una')?.disabled).toBe(true);

    release();
    await update();
    expect(main?.disabled).toBe(false);
  });
});

describe('LoginPageComponent · avisos', () => {
  it('un correo fuera de la lista se avisa en el formulario y la pantalla no se mueve', async () => {
    const { button, type, submit, update, query, authPort } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    button('Crear una')?.click();
    await update();
    type('#email', 'nuevo@ejemplo.com');
    type('#password', 'secreta');

    submit();
    await update();

    expect(query('[role="alert"]')?.textContent?.trim()).toBe(
      'Este correo no está en la lista de acceso anticipado. Pídele acceso a quien administra la app.',
    );
    expect(authPort.registrations).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['invalidCredentials', 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.'],
    ['emailInUse', 'Ese correo ya tiene una cuenta. Inicia sesión.'],
    ['offline', 'Sin conexión. Inténtalo cuando vuelva la red.'],
    ['unknown', 'No pudimos completar la acción. Inténtalo de nuevo.'],
  ] as const)('el fallo %s muestra su mensaje y registra el detalle', async (kind, message) => {
    const { type, submit, update, query, authPort, logger } = await render();
    const cause = new Error(`auth/${kind}`);
    authPort.failWith.signInWithEmail = new AuthError(kind, cause);
    type('#email', 'ada@ejemplo.com');
    type('#password', 'secreta');

    submit();
    await update();

    expect(query('[role="alert"]')?.textContent?.trim()).toBe(message);
    expect(logger.entries).toContainEqual(expect.objectContaining({ level: 'error', cause }));
  });

  it('cerrar la ventana de Google no muestra ningún aviso', async () => {
    const { button, update, query, authPort, logger } = await render();
    authPort.failWith.signInWithGoogle = new AuthError('cancelled');

    button('Continuar con Google')?.click();
    await update();

    expect(query('[role="alert"]')).toBeNull();
    expect(logger.entries).toEqual([]);
    expect(button('Continuar con Google')?.disabled).toBe(false);
  });

  it('con error de perfil ofrece Reintentar y Cerrar sesión', async () => {
    const { button, update, element, authPort, users } = await render();
    users.seed(aUser({ id: 'u1' }));
    users.failOnFind = new Error('offline');
    authPort.emit(anIdentity({ uid: 'u1' }));
    await update();

    expect(element.textContent).toContain('No pudimos cargar tu perfil.');
    users.failOnFind = null;
    button('Reintentar')?.click();
    await update();
    expect(element.textContent).not.toContain('No pudimos cargar tu perfil.');

    users.failOnFind = new Error('offline');
    authPort.emit(anIdentity({ uid: 'u1' }));
    await update();
    button('Cerrar sesión')?.click();
    await update();
    expect(authPort.signOuts).toBe(1);
    expect(element.textContent).not.toContain('No pudimos cargar tu perfil.');
  });
});

describe('LoginPageComponent · navegación reactiva', () => {
  @Component({ template: '' })
  class BlankPageComponent {}

  async function openLogin() {
    const authPort = new FakeAuthPort();
    const users = new FakeUserRepository();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: LoginPageComponent },
          { path: 'sin-acceso', component: BlankPageComponent },
          { path: '', component: BlankPageComponent },
        ]),
        { provide: AuthPort, useValue: authPort },
        { provide: UserRepository, useValue: users },
        {
          provide: AllowlistRepository,
          useValue: new FakeAllowlistRepository(['ada@ejemplo.com']),
        },
        { provide: Logger, useValue: new FakeLogger() },
      ],
    });
    const harness = await RouterTestingHarness.create();
    authPort.emit(null);
    await harness.navigateByUrl('/login');
    return { harness, authPort, users, router: TestBed.inject(Router) };
  }

  it('cuando la sesión queda activa lleva al inicio', async () => {
    const { harness, authPort, users, router } = await openLogin();
    users.seed(aUser({ id: 'u1' }));

    authPort.emit(anIdentity({ uid: 'u1', email: 'ada@ejemplo.com' }));
    await settle();
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/');
  });

  it('cuando la sesión queda sin acceso lleva a /sin-acceso', async () => {
    const { harness, authPort, router } = await openLogin();

    authPort.emit(anIdentity({ email: 'nuevo@ejemplo.com' }));
    await settle();
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/sin-acceso');
  });
});
