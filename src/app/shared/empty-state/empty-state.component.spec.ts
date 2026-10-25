import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state title="Tu biblioteca está vacía" message="Crea tu primer libro.">
      <button type="button">Crear libro</button>
    </app-empty-state>
  `,
})
class HostWithActionComponent {}

describe('EmptyStateComponent', () => {
  it('con solo título pinta el título y nada más', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Sin tarjetas');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Sin tarjetas');
    expect(element.querySelector('p')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('pinta título, mensaje y la acción proyectada, en ese orden', () => {
    const fixture = TestBed.createComponent(HostWithActionComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const texts = Array.from(element.querySelectorAll('h2, p, button')).map((node) =>
      node.textContent?.trim(),
    );
    expect(texts).toEqual(['Tu biblioteca está vacía', 'Crea tu primer libro.', 'Crear libro']);
  });
});
