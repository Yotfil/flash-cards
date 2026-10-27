import { TestBed } from '@angular/core/testing';

import { PracticeFeedbackComponent } from './practice-feedback.component';

function render(result: { correct: boolean; correctAnswers: readonly string[] } | null) {
  const fixture = TestBed.createComponent(PracticeFeedbackComponent);
  fixture.componentRef.setInput('result', result);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('[role="status"]') as HTMLElement;
}

describe('PracticeFeedbackComponent', () => {
  it('sin respuesta, la región está vacía', () => {
    expect(render(null).textContent?.trim()).toBe('');
  });

  it('acierto: "¡Correcto!" con ✓', () => {
    const status = render({ correct: true, correctAnswers: ['rendirse'] });

    expect(status.textContent?.trim()).toBe('¡Correcto!');
    expect(status.querySelector('[data-icon="check"]')).not.toBeNull();
  });

  it('fallo: la respuesta correcta con ✗', () => {
    const status = render({ correct: false, correctAnswers: ['rendirse'] });

    expect(status.textContent?.trim()).toBe('La respuesta era «rendirse».');
    expect(status.querySelector('[data-icon="x"]')).not.toBeNull();
  });

  it('fallo con varias acepciones: las nombra todas', () => {
    const status = render({ correct: false, correctAnswers: ['banco', 'orilla'] });

    expect(status.textContent?.trim()).toBe('La respuesta era «banco» o «orilla».');
  });
});
