import { TestBed } from '@angular/core/testing';

import { collectionShares } from '@services/progress/collection-shares';
import type { CollectionStatus } from '@services/progress/progress.service';

import { CollectionOverviewComponent } from './collection-overview.component';

function render(status: CollectionStatus, counts = { newCards: 3, learning: 2, review: 5 }) {
  const fixture = TestBed.createComponent(CollectionOverviewComponent);
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('shares', status === 'ready' ? collectionShares(counts) : null);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('CollectionOverviewComponent', () => {
  it('lista: total, barra apilada legible y los tres conteos en matices del acento', () => {
    const { element } = render('ready');
    const section = element.querySelector('section');
    const bar = element.querySelector('[role="img"]');
    const segments = Array.from(element.querySelectorAll<HTMLElement>('[data-collection-segment]'));
    const counts = Array.from(element.querySelectorAll('[data-collection-count]')).map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(section?.querySelector('h2')?.textContent?.trim()).toBe('Tu colección');
    expect(element.textContent).toContain('10 tarjetas en total');
    expect(bar?.getAttribute('aria-label')).toBe('3 nuevas, 2 en aprendizaje, 5 dominadas');
    expect(segments.map((segment) => segment.style.width)).toEqual(['30%', '20%', '50%']);
    expect(segments.map((segment) => segment.className.match(/bar-accent-\w+/)?.[0])).toEqual([
      'bar-accent-new',
      'bar-accent-learning',
      'bar-accent-review',
    ]);
    expect(counts).toEqual(['3 Nuevas', '2 En aprendizaje', '5 Dominadas']);
  });

  it('una sola tarjeta: "1 tarjeta en total"', () => {
    const { element } = render('ready', { newCards: 1, learning: 0, review: 0 });

    expect(element.textContent).toContain('1 tarjeta en total');
  });

  it('cargando: su propio esqueleto ocupado', () => {
    const { element } = render('loading');

    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.querySelector('[role="img"]')).toBeNull();
  });

  it('sin red: el aviso, sin cifras ni barra', () => {
    const { element } = render('offline');

    expect(element.textContent).toContain('Necesitas conexión para contar tu colección.');
    expect(element.textContent).not.toMatch(/\d/);
    expect(element.querySelector('[role="img"]')).toBeNull();
  });

  it('con error: el aviso y "Reintentar", que emite retry', () => {
    const { fixture, element } = render('error');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(element.textContent).toContain('No pudimos contar tu colección.');
    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Reintentar',
    );
    button?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
