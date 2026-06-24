import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { CardsService } from '@services/cards.service';
import { ChaptersService } from '@services/chapters.service';
import { ReviewService } from '@services/review';
import { CapituloDetailComponent } from './capitulo-detail.component';

describe('CapituloDetailComponent', () => {
  it('se crea', () => {
    const cardsStub: Partial<CardsService> = {
      cards: signal([]).asReadonly(),
      status: signal('idle' as const).asReadonly(),
      errorMessage: signal<string | null>(null).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
    };
    const chaptersStub: Partial<ChaptersService> = {
      chapters: signal([]).asReadonly(),
      load: async () => {
        // sin efecto en la prueba
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CardsService, useValue: cardsStub },
        { provide: ChaptersService, useValue: chaptersStub },
        { provide: ReviewService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(CapituloDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
