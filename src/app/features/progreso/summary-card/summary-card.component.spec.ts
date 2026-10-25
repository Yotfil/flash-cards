import { TestBed } from '@angular/core/testing';

import { SummaryCardComponent } from './summary-card.component';

describe('SummaryCardComponent', () => {
  it('muestra la etiqueta y el número en una tarjeta de acrílico suave', () => {
    const fixture = TestBed.createComponent(SummaryCardComponent);
    fixture.componentRef.setInput('label', 'Pendientes hoy');
    fixture.componentRef.setInput('value', 6);
    fixture.detectChanges();
    const article = (fixture.nativeElement as HTMLElement).querySelector('article');

    expect(article?.classList.contains('glass-soft')).toBe(true);
    expect(article?.querySelector('[data-summary-value]')?.textContent?.trim()).toBe('6');
    expect(article?.querySelector('[data-summary-label]')?.textContent?.trim()).toBe(
      'Pendientes hoy',
    );
  });
});
