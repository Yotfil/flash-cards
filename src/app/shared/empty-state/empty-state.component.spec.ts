import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Título');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
