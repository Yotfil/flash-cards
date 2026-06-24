import { TestBed } from '@angular/core/testing';

import { BookFormDialogComponent } from './book-form-dialog.component';

describe('BookFormDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(BookFormDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('precarga las nuevas/día con el default recibido al crear', () => {
    const fixture = TestBed.createComponent(BookFormDialogComponent);
    fixture.componentRef.setInput('defaultNewCardsPerDay', 7);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { get(name: string): { value: number } | null };
    };
    expect(component.form.get('newCardsPerDay')?.value).toBe(7);
  });
});
