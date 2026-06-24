import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'books');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
