import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SessionService } from '@services/session/session.service';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { App } from './app';

@Component({ template: '' })
class BlankPageComponent {}

function render(session = new FakeSessionService({ kind: 'active', user: aUser() })) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'hoy', component: BlankPageComponent },
        { path: 'sin-acceso', component: BlankPageComponent },
      ]),
      { provide: SessionService, useValue: session },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, session, settle, router: TestBed.inject(Router) };
}

describe('App', () => {
  it('aloja el router y el aviso de fallos no previstos (que se ve en cualquier pantalla)', () => {
    const { fixture } = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.querySelector('app-unexpected-error-notice')).not.toBeNull();
    expect(element.children).toHaveLength(2);
  });

  it('si la sesión queda sin acceso con la app abierta, lleva a la pantalla de sin acceso', async () => {
    const { session, settle, router } = render();
    await router.navigateByUrl('/hoy');
    await settle();

    session.setState({ kind: 'noAccess', email: 'ada@ejemplo.com' });
    await settle();

    expect(router.url).toBe('/sin-acceso');
  });

  it('con sesión activa no se mueve', async () => {
    const { settle, router } = render();
    await router.navigateByUrl('/hoy');
    await settle();

    expect(router.url).toBe('/hoy');
  });
});
