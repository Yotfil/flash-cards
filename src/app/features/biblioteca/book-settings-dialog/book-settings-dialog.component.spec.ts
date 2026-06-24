import { TestBed } from '@angular/core/testing';

import type { Book } from '@domain/models';
import { BookSettingsDialogComponent } from './book-settings-dialog.component';

function fakeBook(): Book {
  return {
    id: 'b1',
    name: 'Inglés',
    subject: 'general',
    studyDirection: 'forward',
    newCardsPerDay: 12,
    maxReviewsPerDay: 150,
    order: 0,
    cardCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('BookSettingsDialogComponent', () => {
  it('se crea y precarga los valores del libro', () => {
    const fixture = TestBed.createComponent(BookSettingsDialogComponent);
    fixture.componentRef.setInput('book', fakeBook());
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { get(name: string): { value: number } | null };
    };
    expect(fixture.componentInstance).toBeTruthy();
    expect(component.form.get('newCardsPerDay')?.value).toBe(12);
    expect(component.form.get('maxReviewsPerDay')?.value).toBe(150);
  });

  it('emite sólo los ajustes de tarjetas al guardar', () => {
    const fixture = TestBed.createComponent(BookSettingsDialogComponent);
    fixture.componentRef.setInput('book', fakeBook());
    fixture.detectChanges();

    let emitted: Partial<Book> | undefined;
    fixture.componentInstance.saved.subscribe((value) => (emitted = value));

    const component = fixture.componentInstance as unknown as {
      form: { get(name: string): { setValue(n: number): void } | null };
      submit(): void;
    };
    component.form.get('newCardsPerDay')?.setValue(5);
    component.submit();

    expect(emitted).toEqual({ newCardsPerDay: 5, maxReviewsPerDay: 150 });
  });
});
