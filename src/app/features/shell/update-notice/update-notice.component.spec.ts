import { TestBed } from '@angular/core/testing';

import { AppUpdatePort } from '@domain/ports/app-update.port';
import { FakeAppUpdate } from '@testing/fake-app-update';

import { UpdateNoticeComponent } from './update-notice.component';

function render(update: FakeAppUpdate) {
  TestBed.configureTestingModule({ providers: [{ provide: AppUpdatePort, useValue: update }] });
  const fixture = TestBed.createComponent(UpdateNoticeComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('UpdateNoticeComponent', () => {
  it('sin versión nueva no pinta nada', () => {
    const { element } = render(new FakeAppUpdate());

    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('con una versión lista, avisa sólido con "Recargar", y recargar la estrena', () => {
    const update = new FakeAppUpdate();
    const { fixture, element } = render(update);

    update.setReady(true);
    fixture.detectChanges();

    const status = element.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent).toContain('Hay una versión nueva');
    // Sólido: con el aviso "sin conexión" y la navegación ya hay dos capas de vidrio.
    expect(
      ['glass', 'glass-soft', 'glass-nav'].some((layer) => status?.classList.contains(layer)),
    ).toBe(false);
    expect(status?.classList).toContain('bg-surface');
    const reload = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Recargar',
    );
    reload?.click();
    expect(update.reloads).toBe(1);
  });
});
