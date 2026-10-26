import { TestBed } from '@angular/core/testing';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import { RATINGS, type Rating } from '@domain/models/rating';
import type { SchedulingPreview } from '@domain/ports/scheduling.port';

import { RatingBarComponent } from './rating-bar.component';

const T0 = new Date('2026-10-24T15:00:00Z');
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function previews(dueIn: Record<Rating, number>): Record<Rating, SchedulingPreview> {
  return Object.fromEntries(
    RATINGS.map((rating) => {
      const due = new Date(T0.getTime() + dueIn[rating]);
      return [
        rating,
        {
          scheduling: { ...initialCardScheduling(T0), due },
          intervalDays: Math.floor(dueIn[rating] / DAY_MS),
          due,
          log: {
            state: 0,
            due: T0,
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            lastElapsedDays: 0,
            scheduledDays: 0,
          },
        },
      ];
    }),
  ) as Record<Rating, SchedulingPreview>;
}

const MINUTES_AND_DAYS = previews({
  1: MINUTE_MS,
  2: 6 * MINUTE_MS,
  3: 10 * MINUTE_MS,
  4: 8 * DAY_MS,
});

function render(
  inputs: {
    previews?: Record<Rating, SchedulingPreview>;
    suggested?: Rating | null;
    keys?: boolean;
  } = {},
) {
  const fixture = TestBed.createComponent(RatingBarComponent);
  fixture.componentRef.setInput('previews', inputs.previews ?? MINUTES_AND_DAYS);
  fixture.componentRef.setInput('suggested', inputs.suggested ?? null);
  fixture.componentRef.setInput('now', T0);
  fixture.componentRef.setInput('showKeyHints', inputs.keys ?? true);
  const graded = vi.fn();
  fixture.componentInstance.graded.subscribe(graded);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const options = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
  return { element, options, graded };
}

describe('RatingBarComponent', () => {
  it('pregunta "¿Qué tan bien la recordaste?" y ofrece las cuatro opciones en orden', () => {
    const { element, options } = render();

    expect(element.textContent).toContain('¿Qué tan bien la recordaste?');
    expect(
      options().map((option) => option.querySelector('[data-label]')?.textContent?.trim()),
    ).toEqual(['Otra vez', 'Difícil', 'Bien', 'Fácil']);
  });

  it('cada opción N tiene exactamente N cerebros encendidos en su color', () => {
    const { options } = render();

    const lit = options().map(
      (option) =>
        option.querySelectorAll('app-icon[data-icon="brain"][class*="text-rating-"]').length,
    );
    expect(lit).toEqual([1, 2, 3, 4]);
    expect(options()[0]?.querySelectorAll('app-icon[data-icon="brain"]')).toHaveLength(4);
  });

  it('un toque emite su grado', () => {
    const { options, graded } = render();

    options()[2]?.click();

    expect(graded).toHaveBeenCalledWith(3);
  });

  it('cada opción dice cuándo volvería', () => {
    const { options } = render();

    expect(
      options().map((option) => option.querySelector('[data-interval]')?.textContent?.trim()),
    ).toEqual(['1 min', '6 min', '10 min', '8 días']);
  });

  it('la etiqueta accesible dice el intervalo y, si aplica, que es la sugerida', () => {
    const threeDays = previews({ 1: MINUTE_MS, 2: DAY_MS, 3: 3 * DAY_MS, 4: 9 * DAY_MS });

    expect(render({ previews: threeDays }).options()[2]?.getAttribute('aria-label')).toBe(
      'Bien, vuelve en 3 días',
    );
    TestBed.resetTestingModule();

    const suggested = render({ previews: threeDays, suggested: 3 });
    expect(suggested.options()[2]?.getAttribute('aria-label')).toBe(
      'Bien, vuelve en 3 días (sugerido)',
    );
    expect(suggested.options()[2]?.textContent).toContain('sugerido');
    expect(suggested.options()[1]?.textContent).not.toContain('sugerido');
  });

  it('las pistas de teclado se pueden apagar', () => {
    expect(render({ keys: true }).element.querySelectorAll('kbd')).toHaveLength(4);
    TestBed.resetTestingModule();

    expect(render({ keys: false }).element.querySelector('kbd')).toBeNull();
  });
});
