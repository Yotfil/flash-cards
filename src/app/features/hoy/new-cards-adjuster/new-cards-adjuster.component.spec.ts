import { TestBed } from '@angular/core/testing';

import type { NewCardsChoice } from '@services/queue/daily-queue.service';

import { NewCardsAdjusterComponent } from './new-cards-adjuster.component';

function render(books: NewCardsChoice[]) {
  const fixture = TestBed.createComponent(NewCardsAdjusterComponent);
  fixture.componentRef.setInput('books', books);
  const changed = vi.fn();
  fixture.componentInstance.changed.subscribe(changed);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const labelled = (label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { element, changed, labelled };
}

const INGLES: NewCardsChoice = { bookId: 'ingles', name: 'Inglés', chosen: 5, available: 20 };

describe('NewCardsAdjusterComponent', () => {
  it('va plegado bajo "Ajustar nuevas de hoy" con su aclaración', () => {
    const { element } = render([INGLES]);

    expect(element.querySelector('details summary')?.textContent?.trim()).toBe(
      'Ajustar nuevas de hoy',
    );
    expect(element.textContent).toContain('Solo para la sesión de hoy. Tus libros no cambian.');
  });

  it('cada libro muestra su número, en vivo, y su máximo', () => {
    const { element } = render([INGLES]);

    const count = element.querySelector('[aria-live="polite"]');
    expect(count?.textContent?.trim()).toBe('5');
    expect(element.textContent).toContain('de 20');
  });

  it('subir y bajar emiten el nuevo número de ese libro', () => {
    const { labelled, changed } = render([INGLES]);

    labelled('Más nuevas de Inglés')?.click();
    labelled('Menos nuevas de Inglés')?.click();

    expect(changed.mock.calls).toEqual([
      [{ bookId: 'ingles', count: 6 }],
      [{ bookId: 'ingles', count: 4 }],
    ]);
  });

  it('en los extremos el botón correspondiente se deshabilita', () => {
    const atZero = render([{ ...INGLES, chosen: 0 }]);
    expect(atZero.labelled('Menos nuevas de Inglés')?.disabled).toBe(true);
    expect(atZero.labelled('Más nuevas de Inglés')?.disabled).toBe(false);
    TestBed.resetTestingModule();

    const atMax = render([{ ...INGLES, chosen: 20 }]);
    expect(atMax.labelled('Más nuevas de Inglés')?.disabled).toBe(true);
  });

  it('un libro sin nuevas disponibles dice "sin nuevas" y no ofrece acciones', () => {
    const { element, labelled } = render([
      { bookId: 'medicina', name: 'Medicina', chosen: 0, available: 0 },
    ]);

    expect(element.textContent).toContain('Medicina');
    expect(element.textContent).toContain('sin nuevas');
    expect(labelled('Más nuevas de Medicina')).toBeNull();
    expect(labelled('Menos nuevas de Medicina')).toBeNull();
  });
});
