import { TestBed } from '@angular/core/testing';

import { ErrorStateComponent } from './error-state.component';
import { ERROR_STATE_COPY } from './error-state.copy';

function render(inputs: { title?: string; message?: string } = {}) {
  const fixture = TestBed.createComponent(ErrorStateComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('ErrorStateComponent', () => {
  it('se anuncia como alerta con el título por defecto', () => {
    const { element } = render();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(ERROR_STATE_COPY.defaultTitle).toBe('Algo salió mal');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Algo salió mal');
    expect(element.querySelector('p')).toBeNull();
  });

  it('muestra un título y un mensaje propios', () => {
    const { element } = render({
      title: 'No se pudo cargar tu biblioteca',
      message: 'Revisa tu conexión.',
    });

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      'No se pudo cargar tu biblioteca',
    );
    expect(element.querySelector('p')?.textContent?.trim()).toBe('Revisa tu conexión.');
  });

  it('"Reintentar" emite retry', () => {
    const { fixture, element } = render();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    const button = element.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Reintentar');
    button?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
