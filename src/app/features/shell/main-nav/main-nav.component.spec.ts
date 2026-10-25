import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MainNavComponent } from './main-nav.component';

async function navigateTo(url: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: MainNavComponent }])],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness.routeNativeElement as HTMLElement;
}

function links(element: HTMLElement): HTMLAnchorElement[] {
  return Array.from(element.querySelectorAll('a'));
}

function navIndex(element: HTMLElement): string {
  return element.querySelector('nav')?.style.getPropertyValue('--nav-index') ?? '';
}

describe('MainNavComponent', () => {
  it('ofrece los cuatro destinos en orden, con icono y etiqueta, en una región con nombre', async () => {
    const element = await navigateTo('/hoy');

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Navegación principal');
    expect(links(element).map((link) => link.textContent?.trim())).toEqual([
      'Hoy',
      'Biblioteca',
      'Progreso',
      'Ajustes',
    ]);
    expect(links(element).map((link) => link.getAttribute('href'))).toEqual([
      '/hoy',
      '/biblioteca',
      '/progreso',
      '/ajustes',
    ]);
    links(element).forEach((link) => expect(link.querySelector('app-icon svg')).not.toBeNull());
  });

  it('muestra la marca Cadence con el icono de chispa', async () => {
    const element = await navigateTo('/hoy');

    const brand = element.querySelector('[data-brand]');
    expect(brand?.textContent?.trim()).toBe('Cadence');
    expect(brand?.querySelector('app-icon')?.getAttribute('data-icon')).toBe('spark');
  });

  it('marca la sección activa con el acento, aria-current y la píldora bajo ella', async () => {
    const element = await navigateTo('/progreso');

    const current = links(element).filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent?.trim())).toEqual(['Progreso']);
    expect(current[0]?.classList).toContain('text-accent-text');
    expect(navIndex(element)).toBe('2');
  });

  it('una ruta hija mantiene activa su sección', async () => {
    const element = await navigateTo('/biblioteca/b1/c1');

    const current = links(element).filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent?.trim())).toEqual(['Biblioteca']);
    expect(navIndex(element)).toBe('1');
  });

  it('una ruta sin destino propio no activa ninguno y esconde la píldora', async () => {
    const element = await navigateTo('/importar');

    expect(links(element).some((link) => link.hasAttribute('aria-current'))).toBe(false);
    expect(navIndex(element)).toBe('-1');
  });
});
