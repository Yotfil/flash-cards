import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FakeConnectivity } from '@testing/fake-connectivity';

import { routes } from './app.routes';

async function navigate(url: string): Promise<{ element: HTMLElement; finalUrl: string }> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
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
const FULL_SCREEN_ROUTES = ['/login', '/sin-acceso', '/repaso', '/practicar'];

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
    expect(element.querySelector('app-shell main app-pending-page')).not.toBeNull();
  });

  it.each(FULL_SCREEN_ROUTES)('%s se pinta a pantalla completa, sin navegación', async (url) => {
    const { element, finalUrl } = await navigate(url);

    expect(finalUrl).toBe(url);
    expect(element.querySelector('app-pending-page')).not.toBeNull();
    expect(element.querySelector('app-main-nav')).toBeNull();
  });
});
