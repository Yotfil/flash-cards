import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { RatingCounts } from '@domain/models/daily-stats.model';

import { reviewedCardsLabel } from '../repaso.copy';
import { SessionSummaryComponent } from './session-summary.component';

@Component({
  imports: [SessionSummaryComponent],
  template: `
    <app-session-summary
      [title]="title"
      [countLabel]="countLabel"
      [note]="note"
      [backLabel]="backLabel"
      [distinctCount]="distinctCount"
      [ratingCounts]="ratingCounts"
      [rejectedAfterFinish]="rejected"
      (back)="home = home + 1"
    >
      <p practice>Bloque de práctica</p>
    </app-session-summary>
  `,
})
class HostComponent {
  title = 'Sesión terminada';
  countLabel = reviewedCardsLabel;
  note: string | null = 'Las que más te costaron volverán antes.';
  backLabel = 'Volver a Hoy';
  distinctCount = 20;
  ratingCounts: RatingCounts = { again: 3, hard: 2, good: 10, easy: 7 };
  rejected = 0;
  home = 0;
}

function render(
  overrides: Partial<
    Pick<
      HostComponent,
      'distinctCount' | 'rejected' | 'title' | 'countLabel' | 'note' | 'backLabel'
    >
  > = {},
) {
  // Reducir movimiento: el número aparece completo de inmediato.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const fixture = TestBed.createComponent(HostComponent);
  Object.assign(fixture.componentInstance, overrides);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('SessionSummaryComponent', () => {
  beforeAll(() => {
    // jsdom no implementa matchMedia: se crea para poder espiarlo.
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.restoreAllMocks());

  it('"Sesión terminada" con las tarjetas distintas y la nota', () => {
    const { element } = render();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Sesión terminada');
    expect(element.textContent).toContain('Repasaste 20 tarjetas.');
    expect(element.textContent).toContain('Las que más te costaron volverán antes.');
  });

  it('con una sola tarjeta, en singular', () => {
    expect(render({ distinctCount: 1 }).element.textContent).toContain('Repasaste 1 tarjeta.');
  });

  it('las calificaciones por grado, con su color y su número', () => {
    const { element } = render();

    const pills = Array.from(element.querySelectorAll('[data-rating-count]'));
    expect(pills.map((pill) => pill.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Otra vez 3',
      'Difícil 2',
      'Bien 10',
      'Fácil 7',
    ]);
    expect(pills.map((pill) => pill.querySelector('[class*="bg-rating-"]')?.className)).toEqual([
      expect.stringContaining('bg-rating-again'),
      expect.stringContaining('bg-rating-hard'),
      expect.stringContaining('bg-rating-good'),
      expect.stringContaining('bg-rating-easy'),
    ]);
  });

  it('avisa de las calificaciones que no se guardaron', () => {
    const { element } = render({ rejected: 1 });

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      '1 calificación no se guardó. Esa tarjeta sigue pendiente.',
    );
  });

  it('deja un hueco para el bloque de práctica', () => {
    expect(render().element.textContent).toContain('Bloque de práctica');
  });

  it('"Volver a Hoy" lo pide', () => {
    const { fixture, element } = render();

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Volver a Hoy')
      ?.click();

    expect(fixture.componentInstance.home).toBe(1);
  });

  it('los textos son de quien la usa: otro título, otro conteo, sin nota y otro botón', () => {
    const { fixture, element } = render({
      title: 'Práctica terminada',
      countLabel: (count: number) => `Practicaste ${count} ítems`,
      note: null,
      backLabel: 'Volver al paquete',
      distinctCount: 8,
    });

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Práctica terminada');
    expect(element.textContent).toContain('Practicaste 8 ítems');
    expect(element.textContent).not.toContain('volverán antes');
    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Volver al paquete')
      ?.click();
    expect(fixture.componentInstance.home).toBe(1);
  });
});
