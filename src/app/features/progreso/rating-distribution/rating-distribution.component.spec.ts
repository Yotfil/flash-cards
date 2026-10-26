import { TestBed } from '@angular/core/testing';

import type { RatingRow } from '@services/progress/rating-rows';

import { RatingDistributionComponent } from './rating-distribution.component';

const ROWS: RatingRow[] = [
  { rating: 1, count: 1, share: 1 / 7 },
  { rating: 2, count: 1, share: 1 / 7 },
  { rating: 3, count: 4, share: 4 / 7 },
  { rating: 4, count: 1, share: 1 / 7 },
];

function render(rows: RatingRow[], total: number) {
  const fixture = TestBed.createComponent(RatingDistributionComponent);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('total', total);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RatingDistributionComponent', () => {
  it('cuatro filas en orden con la etiqueta de los cerebros, el número y su barra en la escala', () => {
    const element = render(ROWS, 7);
    const section = element.querySelector('section');
    const heading = section?.querySelector(`#${section.getAttribute('aria-labelledby')}`);
    const items = Array.from(element.querySelectorAll('li'));

    expect(heading?.textContent?.trim()).toBe('Calificaciones de hoy');
    expect(
      items.map((item) => item.querySelector('[data-rating-label]')?.textContent?.trim()),
    ).toEqual(['Otra vez', 'Difícil', 'Bien', 'Fácil']);
    expect(
      items.map((item) => item.querySelector('[data-rating-count]')?.textContent?.trim()),
    ).toEqual(['1', '1', '4', '1']);
    const bars = items.map((item) => item.querySelector<HTMLElement>('[data-rating-bar]'));
    expect(bars.map((bar) => bar?.style.width)).toEqual(['14.3%', '14.3%', '57.1%', '14.3%']);
    expect(bars.map((bar) => bar?.className.match(/bar-rating-\w+/)?.[0])).toEqual([
      'bar-rating-again',
      'bar-rating-hard',
      'bar-rating-good',
      'bar-rating-easy',
    ]);
    expect(bars.every((bar) => bar?.closest('[aria-hidden="true"]'))).toBe(true);
  });

  it('sin repasos hoy, el aviso en lugar de las barras', () => {
    const element = render(
      ROWS.map((row) => ({ ...row, count: 0, share: 0 })),
      0,
    );

    expect(element.textContent).toContain('Aún no has calificado tarjetas hoy.');
    expect(element.querySelector('li')).toBeNull();
  });
});
