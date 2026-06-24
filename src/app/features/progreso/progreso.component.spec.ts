import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ProgressService } from '@services/stats';
import { ProgresoComponent } from './progreso.component';

describe('ProgresoComponent', () => {
  it('se crea', () => {
    const stub: Partial<ProgressService> = {
      status: signal('idle' as const).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      reviewsToday: signal(0).asReadonly(),
      collection: signal({ newCards: 0, learning: 0, review: 0 }).asReadonly(),
      totalCards: signal(0).asReadonly(),
      isEmpty: signal(true).asReadonly(),
      pendingDue: signal(0).asReadonly(),
      pendingNew: signal(0).asReadonly(),
      ratingCounts: signal({ again: 0, hard: 0, good: 0, easy: 0 }).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ProgressService, useValue: stub }],
    });

    const fixture = TestBed.createComponent(ProgresoComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
