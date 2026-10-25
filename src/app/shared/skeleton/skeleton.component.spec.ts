import { TestBed } from '@angular/core/testing';

import { SkeletonComponent } from './skeleton.component';

function render(inputs: { lines?: number; variant?: 'text' | 'card' } = {}): HTMLElement {
  const fixture = TestBed.createComponent(SkeletonComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SkeletonComponent', () => {
  it('pinta tres siluetas por defecto, ocupado y sin texto', () => {
    const element = render();

    expect(element.getAttribute('aria-busy')).toBe('true');
    const blocks = element.querySelectorAll('[data-skeleton-block]');
    expect(blocks).toHaveLength(3);
    blocks.forEach((block) => expect(block.getAttribute('aria-hidden')).toBe('true'));
    expect(element.textContent?.trim()).toBe('');
  });

  it('pinta tantas siluetas como líneas se piden', () => {
    expect(render({ lines: 5 }).querySelectorAll('[data-skeleton-block]')).toHaveLength(5);
  });

  it('la variante tarjeta pinta bloques con forma de tarjeta', () => {
    const element = render({ variant: 'card', lines: 2 });

    const blocks = element.querySelectorAll('[data-skeleton-block]');
    expect(blocks).toHaveLength(2);
    blocks.forEach((block) => expect(block.getAttribute('data-skeleton-block')).toBe('card'));
  });
});
