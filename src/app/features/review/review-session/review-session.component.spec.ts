import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ReviewService } from '@services/review';
import { ReviewSessionComponent } from './review-session.component';

describe('ReviewSessionComponent', () => {
  it('se crea', () => {
    const stub: Partial<ReviewService> = {
      // 'active' evita que ngOnInit navegue fuera (sólo 'idle' redirige).
      status: signal('active' as const).asReadonly(),
      current: signal(null).asReadonly(),
      revealed: signal(false).asReadonly(),
      suggestedRating: signal(null).asReadonly(),
      previews: signal(null).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      position: signal(0).asReadonly(),
      total: signal(0).asReadonly(),
      summary: signal({
        reviewed: 0,
        ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 },
      }).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ReviewService, useValue: stub }],
    });

    const fixture = TestBed.createComponent(ReviewSessionComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
