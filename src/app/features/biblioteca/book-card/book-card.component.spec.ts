import { TestBed } from '@angular/core/testing';

import { aBook } from '@testing/fake-book-repository';

import { BookCardComponent } from './book-card.component';

function render(overrides: Parameters<typeof aBook>[0] = {}, withoutCount = false) {
  const book = aBook({ name: 'Inglés', subject: 'language-en', ...overrides });
  if (withoutCount) {
    delete book.cardCount;
  }
  const fixture = TestBed.createComponent(BookCardComponent);
  fixture.componentRef.setInput('book', book);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element };
}

describe('BookCardComponent', () => {
  it('muestra nombre, materia, tarjetas y nuevas por día', () => {
    const { element } = render({ cardCount: 12, newCardsPerDay: 20 });

    expect(element.textContent).toContain('Inglés');
    expect(element.textContent).toContain('language-en');
    expect(element.textContent).toContain('12 tarjetas');
    expect(element.textContent).toContain('20 nuevas al día');
  });

  it('con una tarjeta usa el singular', () => {
    expect(render({ cardCount: 1 }).element.textContent).toContain('1 tarjeta');
  });

  it('un libro sin contador guardado muestra "0 tarjetas"', () => {
    expect(render({}, true).element.textContent).toContain('0 tarjetas');
  });

  it('nombra sus botones de icono con el libro y emite cada acción', () => {
    const { fixture, element } = render();
    const opened = vi.fn();
    const settings = vi.fn();
    const removal = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentInstance.settingsRequested.subscribe(settings);
    fixture.componentInstance.deleteRequested.subscribe(removal);

    element.querySelector<HTMLButtonElement>('[data-open]')?.click();
    element.querySelector<HTMLButtonElement>('[aria-label="Ajustes de Inglés"]')?.click();
    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Inglés"]')?.click();

    expect(opened).toHaveBeenCalledTimes(1);
    expect(settings).toHaveBeenCalledTimes(1);
    expect(removal).toHaveBeenCalledTimes(1);
  });
});
