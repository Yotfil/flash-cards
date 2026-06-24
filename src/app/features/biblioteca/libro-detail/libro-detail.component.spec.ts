import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { BooksService } from '@services/books.service';
import { ChaptersService } from '@services/chapters.service';
import { ReviewService } from '@services/review';
import { LibroDetailComponent } from './libro-detail.component';

describe('LibroDetailComponent', () => {
  it('se crea', () => {
    const booksStub: Partial<BooksService> = {
      books: signal([]).asReadonly(),
      status: signal('idle' as const).asReadonly(),
      ensureLoaded: async () => {
        // sin efecto en la prueba
      },
    };
    const chaptersStub: Partial<ChaptersService> = {
      chapters: signal([]).asReadonly(),
      status: signal('idle' as const).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BooksService, useValue: booksStub },
        { provide: ChaptersService, useValue: chaptersStub },
        { provide: ReviewService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(LibroDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
