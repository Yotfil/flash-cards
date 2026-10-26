import { TestBed } from '@angular/core/testing';

import { UnexpectedErrorNotice } from '@services/notices/unexpected-error-notice.service';

import { UnexpectedErrorNoticeComponent } from './unexpected-error-notice.component';

function render() {
  const fixture = TestBed.createComponent(UnexpectedErrorNoticeComponent);
  fixture.detectChanges();
  const notice = TestBed.inject(UnexpectedErrorNotice);
  const element = fixture.nativeElement as HTMLElement;
  const update = () => {
    TestBed.tick();
    fixture.detectChanges();
  };
  return { element, notice, update };
}

describe('UnexpectedErrorNoticeComponent', () => {
  it('sin fallos no pinta nada', () => {
    const { element } = render();

    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('ante un fallo no previsto avisa, como alerta, con una sola línea aunque haya varios', () => {
    const { element, notice, update } = render();

    notice.report();
    notice.report();
    update();

    const alerts = element.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.textContent).toContain('Algo salió mal. Si se repite, recarga la app.');
  });

  it('«Cerrar aviso» lo quita', () => {
    const { element, notice, update } = render();
    notice.report();
    update();

    element.querySelector<HTMLButtonElement>('button[aria-label="Cerrar aviso"]')?.click();
    update();

    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
