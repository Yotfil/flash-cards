import { TestBed } from '@angular/core/testing';

import { WrittenQuestionComponent } from './written-question.component';

function render() {
  const fixture = TestBed.createComponent(WrittenQuestionComponent);
  fixture.componentRef.setInput('questionId', 'q1');
  fixture.componentRef.setInput('prompt', 'to give up');
  fixture.componentRef.setInput('answered', false);
  const submitted = vi.fn();
  fixture.componentInstance.submitted.subscribe(submitted);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const input = () => element.querySelector('input') as HTMLInputElement;
  const check = () =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Comprobar',
    );
  const type = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, element, input, check, type, submitted };
}

describe('WrittenQuestionComponent', () => {
  it('un campo sin autocompletar ni autocapitalizar, con su etiqueta', () => {
    const { element, input } = render();

    expect(element.textContent).toContain('to give up');
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().getAttribute('autocapitalize')).toBe('off');
    expect(input().getAttribute('spellcheck')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Tu respuesta');
  });

  it('apaga la autocorrección (el iPhone podría cambiar la respuesta al pulsar Intro)', () => {
    expect(render().input().getAttribute('autocorrect')).toBe('off');
  });

  it('"Comprobar" deshabilitado con el campo vacío o solo espacios; Enter tampoco envía', () => {
    const { check, type, input, submitted } = render();

    expect(check()?.disabled).toBe(true);
    type('   ');
    expect(check()?.disabled).toBe(true);
    input().form?.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submitted).not.toHaveBeenCalled();
  });

  it('el botón y Enter envían lo escrito', () => {
    const { check, type, input, submitted } = render();
    type('rendirse');

    check()?.click();
    input().form?.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(submitted).toHaveBeenCalledWith('rendirse');
    expect(submitted).toHaveBeenCalledTimes(2);
  });

  it('respondida, el campo y el botón quedan bloqueados; otra pregunta vacía el campo', () => {
    const { fixture, check, type, input } = render();
    type('rendirse');

    fixture.componentRef.setInput('answered', true);
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
    expect(check()?.disabled).toBe(true);

    fixture.componentRef.setInput('questionId', 'q2');
    fixture.componentRef.setInput('answered', false);
    fixture.detectChanges();
    expect(input().value).toBe('');
    expect(input().disabled).toBe(false);
  });
});
