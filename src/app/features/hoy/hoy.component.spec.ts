import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { QueueService, ReviewService } from '@services/review';
import { HoyComponent } from './hoy.component';

describe('HoyComponent', () => {
  it('se crea', () => {
    const queueStub: Partial<QueueService> = {
      status: signal('idle' as const).asReadonly(),
      dueCount: signal(0).asReadonly(),
      newCount: signal(0).asReadonly(),
      availableNew: signal(0).asReadonly(),
      perBook: signal([]).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      queue: signal([]).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
      applyNewLimit: () => {
        // sin efecto en la prueba
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: QueueService, useValue: queueStub },
        { provide: ReviewService, useValue: { startWith: () => 0 } },
      ],
    });

    const fixture = TestBed.createComponent(HoyComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
