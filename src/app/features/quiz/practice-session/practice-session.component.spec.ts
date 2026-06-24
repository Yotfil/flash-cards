import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { QuizService } from '@services/quiz';
import { PracticeSessionComponent } from './practice-session.component';

describe('PracticeSessionComponent', () => {
  it('se crea', () => {
    const stub: Partial<QuizService> = {
      // 'active' evita que ngOnInit navegue fuera (sólo 'idle' redirige).
      status: signal('active' as const).asReadonly(),
      current: signal(null).asReadonly(),
      answered: signal(false).asReadonly(),
      lastCorrect: signal<boolean | null>(null).asReadonly(),
      lastAnswer: signal<string | null>(null).asReadonly(),
      position: signal(0).asReadonly(),
      total: signal(0).asReadonly(),
      summary: signal({ correct: 0, total: 0 }).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: QuizService, useValue: stub }],
    });

    const fixture = TestBed.createComponent(PracticeSessionComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
