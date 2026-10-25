import { TestBed } from '@angular/core/testing';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FakeConnectivity } from '@testing/fake-connectivity';

import { OfflineIndicatorComponent } from './offline-indicator.component';

const OFFLINE_TEXT = 'Sin conexión. Tus repasos se guardan aquí y se sincronizan al volver.';

function render(connectivity: FakeConnectivity) {
  TestBed.configureTestingModule({
    providers: [{ provide: ConnectivityPort, useValue: connectivity }],
  });
  const fixture = TestBed.createComponent(OfflineIndicatorComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('OfflineIndicatorComponent', () => {
  it('sin red anuncia el modo sin conexión como estado, con el texto de la spec', () => {
    const { element } = render(new FakeConnectivity(false));

    const status = element.querySelector('[role="status"]');
    expect(status?.textContent?.trim()).toBe(OFFLINE_TEXT);
  });

  it('con red no pinta nada', () => {
    const { element } = render(new FakeConnectivity(true));

    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('desaparece al volver la conexión', () => {
    const connectivity = new FakeConnectivity(false);
    const { fixture, element } = render(connectivity);

    connectivity.setOnline(true);
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')).toBeNull();
  });
});
