import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { BooksService } from '@services/books.service';
import { BibliotecaComponent } from './biblioteca.component';

describe('BibliotecaComponent', () => {
  it('se crea', () => {
    const stub: Partial<BooksService> = {
      books: signal([]).asReadonly(),
      status: signal('idle' as const).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: BooksService, useValue: stub }],
    });

    const fixture = TestBed.createComponent(BibliotecaComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
