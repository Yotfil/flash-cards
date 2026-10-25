import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Logger } from '@domain/ports/logger.port';
import { FakeLogger } from '@testing/fake-logger';

import { TodayHeroComponent } from './today-hero.component';

function render(inputs: { count?: number; settled?: boolean; disabled?: boolean } = {}) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: Logger, useValue: new FakeLogger() }],
  });
  const fixture = TestBed.createComponent(TodayHeroComponent);
  fixture.componentRef.setInput('count', inputs.count ?? 21);
  fixture.componentRef.setInput('settled', inputs.settled ?? false);
  fixture.componentRef.setInput('disabled', inputs.disabled ?? false);
  fixture.componentRef.setInput('prepare', async () => []);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const startButton = () =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Estudiar ahora',
    );
  return { element, startButton };
}

describe('TodayHeroComponent', () => {
  it('con tarjetas: "21 tarjetas", "Listas para repasar hoy" y el botón para empezar', () => {
    const { element, startButton } = render({ count: 21 });

    expect(element.textContent).toContain('21 tarjetas');
    expect(element.textContent).toContain('Listas para repasar hoy');
    expect(startButton()?.disabled).toBe(false);
    expect(element.querySelector('.settled')).toBeNull();
  });

  it('asentado: "Estás al día" con su frase, sin botón y con el borde fijo', () => {
    const { element, startButton } = render({ settled: true });

    expect(element.textContent).toContain('Estás al día');
    expect(element.textContent).toContain(
      'Nada pendiente por ahora. Vuelve mañana o estudia un libro.',
    );
    expect(startButton()).toBeUndefined();
    expect(element.querySelector('.settled')).not.toBeNull();
  });

  it('deshabilitado: el botón no deja empezar', () => {
    const { startButton } = render({ count: 0, disabled: true });

    expect(startButton()?.disabled).toBe(true);
  });
});
