import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { SessionState } from '@domain/models/session-state';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { routes } from './app.routes';

const ACTIVE: SessionState = { kind: 'active', user: aUser() };
const SIGNED_OUT: SessionState = { kind: 'signedOut' };
const NO_ACCESS: SessionState = { kind: 'noAccess', email: 'nuevo@ejemplo.com' };

async function navigate(
  url: string,
  session: SessionState = ACTIVE,
): Promise<{ element: HTMLElement; finalUrl: string }> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: SessionService, useValue: new FakeSessionService(session) },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  return {
    element: harness.fixture.nativeElement as HTMLElement,
    finalUrl: TestBed.inject(Router).url,
  };
}

const SHELL_ROUTES = [
  '/hoy',
  '/biblioteca',
  '/importar',
  '/biblioteca/b1',
  '/biblioteca/b1/c1',
  '/progreso',
  '/ajustes',
];

describe('mapa de rutas', () => {
  it('abrir la app lleva a Hoy', async () => {
    expect((await navigate('/')).finalUrl).toBe('/hoy');
  });

  it('una URL inexistente lleva a Hoy', async () => {
    expect((await navigate('/esto-no-existe')).finalUrl).toBe('/hoy');
  });

  it.each(SHELL_ROUTES)('%s se pinta dentro del caparazón, con la navegación', async (url) => {
    const { element, finalUrl } = await navigate(url);

    expect(finalUrl).toBe(url);
    expect(element.querySelector('app-shell app-main-nav nav')).not.toBeNull();
    expect(element.querySelector('app-shell main router-outlet + *')).not.toBeNull();
  });

  it.each([
    ['/login', SIGNED_OUT],
    ['/sin-acceso', NO_ACCESS],
    ['/repaso', ACTIVE],
    ['/practicar', ACTIVE],
  ] as const)('%s se pinta a pantalla completa, sin navegación', async (url, session) => {
    const { element, finalUrl } = await navigate(url, session);

    expect(finalUrl).toBe(url);
    expect(element.querySelector('app-main-nav')).toBeNull();
  });
});

describe('pantallas de acceso', () => {
  it('/login pinta la pantalla de acceso', async () => {
    const { element } = await navigate('/login', SIGNED_OUT);

    expect(element.querySelector('app-login-page h1')?.textContent?.trim()).toBe('Iniciar sesión');
  });
});

describe('rutas protegidas por la sesión', () => {
  it.each(['/biblioteca', '/repaso', '/practicar'])(
    'sin sesión, %s lleva a /login',
    async (url) => {
      expect((await navigate(url, SIGNED_OUT)).finalUrl).toBe('/login');
    },
  );

  it('sin acceso, /hoy lleva a /sin-acceso', async () => {
    expect((await navigate('/hoy', NO_ACCESS)).finalUrl).toBe('/sin-acceso');
  });

  it('con sesión, /login lleva a /hoy', async () => {
    expect((await navigate('/login', ACTIVE)).finalUrl).toBe('/hoy');
  });

  it('sin sesión, una URL inexistente termina en /login', async () => {
    expect((await navigate('/no-existe', SIGNED_OUT)).finalUrl).toBe('/login');
  });
});
