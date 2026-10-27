import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppUpdatePort } from '@domain/ports/app-update.port';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FakeAppUpdate } from '@testing/fake-app-update';
import { FakeConnectivity } from '@testing/fake-connectivity';

import { ShellComponent } from './shell.component';

function render(connectivity: FakeConnectivity, update = new FakeAppUpdate()): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: AppUpdatePort, useValue: update },
    ],
  });
  const fixture = TestBed.createComponent(ShellComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ShellComponent', () => {
  it('contiene la navegación y una única región principal con el router-outlet', () => {
    const element = render(new FakeConnectivity(true));

    expect(element.querySelector('app-main-nav nav')).not.toBeNull();
    expect(element.querySelectorAll('main')).toHaveLength(1);
    expect(element.querySelector('main router-outlet')).not.toBeNull();
  });

  it('sin red muestra el indicador sin conexión dentro del contenido', () => {
    const element = render(new FakeConnectivity(false));

    expect(element.querySelector('main app-offline-indicator [role="status"]')).not.toBeNull();
  });

  it('con una versión nueva lista, muestra su aviso dentro del contenido', () => {
    const update = new FakeAppUpdate();
    update.setReady(true);
    const element = render(new FakeConnectivity(true), update);

    expect(element.querySelector('main app-update-notice [role="status"]')?.textContent).toContain(
      'Hay una versión nueva',
    );
  });

  it('no pinta el pie de versión', () => {
    const element = render(new FakeConnectivity(true));

    expect(element.querySelector('app-version-footer')).toBeNull();
  });
});
