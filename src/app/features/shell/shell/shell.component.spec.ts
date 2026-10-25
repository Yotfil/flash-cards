import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FakeConnectivity } from '@testing/fake-connectivity';

import { ShellComponent } from './shell.component';

function render(connectivity: FakeConnectivity): HTMLElement {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: ConnectivityPort, useValue: connectivity }],
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

  it('no pinta el pie de versión', () => {
    const element = render(new FakeConnectivity(true));

    expect(element.querySelector('app-version-footer')).toBeNull();
  });
});
