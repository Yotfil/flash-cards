import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { BookPending } from '@services/queue/build-daily-queue';

import { BookPendingRowComponent } from './book-pending-row.component';

function render(pending: Partial<BookPending> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(BookPendingRowComponent);
  fixture.componentRef.setInput('pending', {
    bookId: 'b1',
    name: 'Phrasal Verbs',
    due: 10,
    new: 8,
    baseNew: 8,
    availableNew: 20,
    ...pending,
  });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BookPendingRowComponent', () => {
  it('nombre, detalle y total del libro', () => {
    const element = render();

    expect(element.textContent).toContain('Phrasal Verbs');
    expect(element.textContent).toContain('10 por repasar, 8 nuevas');
    expect(element.querySelector('[data-total]')?.textContent?.trim()).toBe('18');
  });

  it('sin nuevas, el detalle solo dice las vencidas', () => {
    const element = render({ due: 3, new: 0 });

    expect(element.textContent).toContain('3 por repasar');
    expect(element.textContent).not.toContain('nueva');
    expect(element.querySelector('[data-total]')?.textContent?.trim()).toBe('3');
  });

  it('toda la fila es el enlace al detalle del libro', () => {
    const element = render();
    const link = element.querySelector('a');

    expect(link?.getAttribute('href')).toBe('/biblioteca/b1');
    expect(link?.textContent).toContain('Phrasal Verbs');
    expect(link?.querySelector('[data-total]')).not.toBeNull();
  });
});
