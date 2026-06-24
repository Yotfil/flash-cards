import { TestBed } from '@angular/core/testing';

import { CardImportDialogComponent } from './card-import-dialog.component';

describe('CardImportDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(CardImportDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
