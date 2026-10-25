import { TestBed } from '@angular/core/testing';

import { StreakBadgeComponent } from './streak-badge.component';

function render(days: number | null) {
  const fixture = TestBed.createComponent(StreakBadgeComponent);
  fixture.componentRef.setInput('days', days);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StreakBadgeComponent', () => {
  it.each([null, 0])('sin racha (%s) no pinta nada', (days) => {
    expect(render(days).textContent?.trim()).toBe('');
  });

  it('con racha muestra la llama y "N días seguidos", con su nombre accesible', () => {
    const element = render(6);

    expect(element.textContent?.trim()).toBe('6 días seguidos');
    expect(element.querySelector('app-icon[data-icon="flame"]')).not.toBeNull();
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Racha: 6 días seguidos',
    );
  });
});
