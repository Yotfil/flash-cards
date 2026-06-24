import { TestBed } from '@angular/core/testing';

import { BookFormDialogComponent } from './book-form-dialog.component';

describe('BookFormDialogComponent', () => {
  it('se crea', () => {
    const fixture = TestBed.createComponent(BookFormDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('siembra las nuevas/día con el default recibido al crear', () => {
    const fixture = TestBed.createComponent(BookFormDialogComponent);
    fixture.componentRef.setInput('defaultNewCardsPerDay', 7);
    fixture.detectChanges();

    let emitted: { newCardsPerDay?: number } | undefined;
    fixture.componentInstance.saved.subscribe((value) => (emitted = value));

    const component = fixture.componentInstance as unknown as {
      form: { get(name: string): { setValue(v: string): void } | null };
      submit(): void;
    };
    component.form.get('name')?.setValue('Inglés');
    component.submit();

    expect(emitted?.newCardsPerDay).toBe(7);
  });
});
