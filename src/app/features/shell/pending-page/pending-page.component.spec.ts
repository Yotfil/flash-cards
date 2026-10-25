import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';

import { PendingPageComponent } from './pending-page.component';

describe('PendingPageComponent', () => {
  it('muestra "Pronto" y el mensaje provisional con el estado vacío', () => {
    const fixture = TestBed.createComponent(PendingPageComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(
      fixture.debugElement.query((node) => node.componentInstance instanceof EmptyStateComponent),
    ).not.toBeNull();
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Pronto');
    expect(element.querySelector('p')?.textContent?.trim()).toBe(
      'Esta pantalla llega en un próximo paso.',
    );
  });
});
