import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { SessionState } from '@domain/models/session-state';
import { SessionService } from '@services/session/session.service';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { NoAccessPageComponent } from './no-access-page.component';

@Component({ template: '' })
class BlankPageComponent {}

const settle = () => new Promise((resolve) => setTimeout(resolve));

async function open(state?: SessionState) {
  const session = new FakeSessionService(state);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'sin-acceso', component: NoAccessPageComponent },
        { path: 'login', component: BlankPageComponent },
        { path: '', component: BlankPageComponent },
      ]),
      { provide: SessionService, useValue: session },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/sin-acceso');
  const update = async () => {
    await settle();
    harness.detectChanges();
    await harness.fixture.whenStable();
  };
  await update();
  const element = harness.fixture.nativeElement as HTMLElement;
  return { harness, session, element, update, router: TestBed.inject(Router) };
}

describe('NoAccessPageComponent', () => {
  it('explica la situación y muestra el correo pendiente', async () => {
    const { element } = await open({ kind: 'noAccess', email: 'nuevo@ejemplo.com' });

    expect(element.querySelector('h1')?.textContent?.trim()).toBe(
      'Tu cuenta está pendiente de acceso',
    );
    expect(element.textContent).toContain('acceso anticipado');
    expect(element.textContent).toContain('nuevo@ejemplo.com');
    expect(element.textContent).toContain('comparte este correo con quien administra la app');
    expect(element.textContent).toContain(
      'Cuando te den acceso, vuelve a entrar con Google o crea tu cuenta.',
    );
  });

  it('"Cerrar sesión" muestra "Cerrando sesión…" hasta terminar y luego lleva a /login', async () => {
    const { element, session, update, router } = await open({
      kind: 'noAccess',
      email: 'nuevo@ejemplo.com',
    });
    const release = session.holdSignOut();
    const button = element.querySelector<HTMLButtonElement>('button');

    button?.click();
    await update();
    expect(button?.textContent?.trim()).toBe('Cerrando sesión…');
    expect(button?.disabled).toBe(true);

    release();
    await update();
    expect(session.signOuts).toBe(1);
    expect(router.url).toBe('/login');
  });

  it('sin sesión lleva a /login', async () => {
    const { router } = await open({ kind: 'signedOut' });

    expect(router.url).toBe('/login');
  });

  it('con acceso concedido lleva al inicio', async () => {
    const { router } = await open({ kind: 'active', user: aUser() });

    expect(router.url).toBe('/');
  });

  it('mientras la sesión se resuelve no navega', async () => {
    const { router, element } = await open();

    expect(router.url).toBe('/sin-acceso');
    expect(element.querySelector('h1')).not.toBeNull();
  });
});
