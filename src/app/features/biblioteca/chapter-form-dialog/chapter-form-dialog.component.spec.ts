import { TestBed } from '@angular/core/testing';

import { ChapterFormDialogComponent } from './chapter-form-dialog.component';

describe('ChapterFormDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(ChapterFormDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
