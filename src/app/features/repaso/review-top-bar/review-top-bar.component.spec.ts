import { TestBed } from '@angular/core/testing';

import { ReviewTopBarComponent } from './review-top-bar.component';

function render(progress: number, remaining: number) {
  const fixture = TestBed.createComponent(ReviewTopBarComponent);
  fixture.componentRef.setInput('progress', progress);
  fixture.componentRef.setInput('remaining', remaining);
  const exitRequested = vi.fn();
  fixture.componentInstance.exitRequested.subscribe(exitRequested);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, exitRequested };
}

describe('ReviewTopBarComponent', () => {
  it('una barra de progreso accesible y cuántas quedan', () => {
    const { element } = render(40, 3);

    const bar = element.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-valuenow')).toBe('40');
    expect(bar?.getAttribute('aria-label')).toBe('Progreso de la sesión');
    expect(element.textContent).toContain('Quedan 3');
  });

  it('"Salir" pide salir', () => {
    const { element, exitRequested } = render(0, 5);

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Salir')
      ?.click();

    expect(exitRequested).toHaveBeenCalledTimes(1);
  });
});
