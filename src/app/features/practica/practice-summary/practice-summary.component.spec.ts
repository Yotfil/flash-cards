import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PracticeSummaryComponent } from './practice-summary.component';

function render(originKind: 'chapter' | 'book') {
  const fixture = TestBed.createComponent(PracticeSummaryComponent);
  fixture.componentRef.setInput('score', 1);
  fixture.componentRef.setInput('total', 2);
  fixture.componentRef.setInput('originKind', originKind);
  const back = vi.fn();
  fixture.componentInstance.back.subscribe(back);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, back };
}

describe('PracticeSummaryComponent', () => {
  it('el cierre con el puntaje y volver al capítulo', () => {
    const { element, back } = render('chapter');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('¡Práctica completada!');
    expect(element.textContent).toContain('Acertaste 1 de 2.');
    const button = element.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Volver al capítulo');
    button?.click();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('al aparecer, el foco va a su título (que no es una parada de Tab)', async () => {
    const { element } = render('chapter');
    await TestBed.inject(ApplicationRef).whenStable();
    const title = element.querySelector('h1');

    expect(document.activeElement).toBe(title);
    expect(title?.getAttribute('tabindex')).toBe('-1');
  });

  it('desde un libro, vuelve al libro', () => {
    expect(render('book').element.querySelector('button')?.textContent?.trim()).toBe(
      'Volver al libro',
    );
  });
});
