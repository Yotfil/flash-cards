import { TestBed } from '@angular/core/testing';

import { BookFormDialogComponent } from './book-form-dialog.component';

describe('BookFormDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(BookFormDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
