import { TestBed } from '@angular/core/testing';

import { CardFormDialogComponent } from './card-form-dialog.component';

describe('CardFormDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(CardFormDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
