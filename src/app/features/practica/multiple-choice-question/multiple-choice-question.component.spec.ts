import { TestBed } from '@angular/core/testing';

import { MultipleChoiceQuestionComponent } from './multiple-choice-question.component';

const OPTIONS = ['rendirse', 'buscar', 'posponer', 'continuar'];

function render(answered: { chosen: string; answer: string } | null = null) {
  const fixture = TestBed.createComponent(MultipleChoiceQuestionComponent);
  fixture.componentRef.setInput('questionId', 'q1');
  fixture.componentRef.setInput('prompt', 'to give up');
  fixture.componentRef.setInput('options', OPTIONS);
  fixture.componentRef.setInput('answered', answered);
  const choose = vi.fn();
  fixture.componentInstance.choose.subscribe(choose);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const option = (text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === text,
    );
  return { fixture, element, choose, option };
}

describe('MultipleChoiceQuestionComponent', () => {
  it('pregunta el anverso con cuatro opciones; tocar una la elige', () => {
    const { element, choose, option } = render();

    expect(element.textContent).toContain('to give up');
    expect(
      Array.from(element.querySelectorAll('button')).map((b) => b.textContent?.trim()),
    ).toEqual(OPTIONS);
    option('buscar')?.click();
    expect(choose).toHaveBeenCalledWith('buscar');
  });

  it('al aparecer, y con cada pregunta nueva, el foco va al enunciado (que no es una parada de Tab)', () => {
    const { fixture, element, option } = render();
    const prompt = element.querySelector('h2');

    expect(document.activeElement).toBe(prompt);
    expect(prompt?.getAttribute('tabindex')).toBe('-1');

    option('buscar')?.focus();
    fixture.componentRef.setInput('questionId', 'q3');
    fixture.componentRef.setInput('prompt', 'to put off');
    fixture.detectChanges();

    expect(document.activeElement).toBe(element.querySelector('h2'));
  });

  it('respondida con error: todo bloqueado, la correcta con acento y ✓, la elegida atenuada con ✗', () => {
    const { element, option } = render({ chosen: 'buscar', answer: 'rendirse' });

    expect(Array.from(element.querySelectorAll('button')).every((button) => button.disabled)).toBe(
      true,
    );
    expect(option('rendirse')?.classList).toContain('bg-accent-tint');
    expect(option('rendirse')?.querySelector('[data-icon="check"]')).not.toBeNull();
    expect(option('buscar')?.classList).toContain('dimmed');
    expect(option('buscar')?.querySelector('[data-icon="x"]')).not.toBeNull();
    expect(option('posponer')?.classList).toContain('dimmed');
    expect(option('posponer')?.querySelector('app-icon')).toBeNull();
  });

  it('respondida bien: la elegida es la correcta con acento; nunca la escala de calificación', () => {
    const { element, option } = render({ chosen: 'rendirse', answer: 'rendirse' });

    expect(option('rendirse')?.classList).toContain('bg-accent-tint');
    expect(element.querySelector('[data-icon="x"]')).toBeNull();
    expect(element.innerHTML).not.toMatch(/rating-/);
  });
});
