import { TestBed } from '@angular/core/testing';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('title', '¿Borrar?');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
