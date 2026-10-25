import { TestBed } from '@angular/core/testing';

import { SessionTopBarComponent } from './session-top-bar.component';

function render(inputs: { progress: number; label: string; exitLabel?: string }) {
  const fixture = TestBed.createComponent(SessionTopBarComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  const exit = vi.fn();
  fixture.componentInstance.exit.subscribe(exit);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, exit };
}

describe('SessionTopBarComponent', () => {
  it('una barra de progreso accesible en acrílico suave y el texto de la página', () => {
    const { element } = render({ progress: 0.4, label: 'Quedan 3' });
    const bar = element.querySelector('[role="progressbar"]');

    expect(element.querySelector('.glass-soft')).not.toBeNull();
    expect(bar?.getAttribute('aria-valuenow')).toBe('40');
    expect(bar?.getAttribute('aria-label')).toBe('Progreso de la sesión');
    expect(bar?.querySelector<HTMLElement>('[data-progress-fill]')?.style.width).toBe('40%');
    expect(element.textContent).toContain('Quedan 3');
  });

  it('el progreso se redondea a un entero', () => {
    const { element } = render({ progress: 1 / 3, label: '1 / 3' });

    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('33');
  });

  it('"Salir" (o el texto que se pida) emite exit', () => {
    const { element, exit } = render({ progress: 0, label: 'Quedan 5' });
    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Salir')
      ?.click();
    expect(exit).toHaveBeenCalledTimes(1);

    const custom = render({ progress: 0, label: '1 / 2', exitLabel: 'Terminar' });
    expect(custom.element.querySelector('button')?.textContent?.trim()).toBe('Terminar');
  });
});
